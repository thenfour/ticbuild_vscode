import * as path from 'node:path';
import * as vscode from 'vscode';

import { SessionSnapshot } from '../session/RemoteSessionManager';
import { DevtoolsControlNode } from '../devtoolsModel';
import { WatchItem } from '../watches/watchTypes';
import { ControlSurfaceKind } from './ControlSurfaceRegistry';


export function buildControlSurfaceWebviewHtml(
    webview: vscode.Webview,
    extensionPath: string,
    viewKind: ControlSurfaceKind,
): string {
    const scriptPath = vscode.Uri.file(
        path.join(extensionPath, 'ControlSurfaceUI', 'dist', 'bundle.js'),
    );
    const scriptUri = webview.asWebviewUri(scriptPath);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TIC-80 Control Surfaces</title>
</head>
<body>
  <div id="root"></div>
    <script>
        window.__tic80ControlSurfaceViewKind = "${viewKind}";
    </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Recursively extracts all unique symbols from a control surface tree.
 */
function extractSymbols(nodes: DevtoolsControlNode[]): Set<string> {
    const symbols = new Set<string>();

    const visit = (node: DevtoolsControlNode) => {
        // Extract symbol if present
        if ('symbol' in node && typeof node.symbol === 'string') {
            symbols.add(node.symbol);
        }

        // Recursively visit children
        if ('controls' in node && Array.isArray(node.controls)) {
            node.controls.forEach(visit);
        }
    };

    nodes.forEach(visit);
    return symbols;
}

export function buildControlSurfaceWebviewPayload(
    snapshot: SessionSnapshot,
    watches: WatchItem[],
    controlSurfaceRoot: DevtoolsControlNode[],
    pollHz: number,
    uiRefreshMs: number | undefined,
    activeSidebarId?: string,
    selectedPageId?: string,
    viewId?: string,
): {
    connectionState: "connected" | "connecting" | "disconnected" | "error";
    statusText: string;
    connectedInstance?: { host: string; port: number };
    watches: Array<{ id: string; label: string; value: string; stale?: boolean; error?: string }>;
    controlSurfaceRoot: DevtoolsControlNode[];
    symbolValues?: Record<string, any>;
    pollIntervalMs: number;
    uiRefreshMs?: number;
    activeSidebarId?: string;
    selectedPageId?: string;
    viewId?: string;
} {
    const statusText = snapshot.state === 'Connected'
        ? `Connected ${snapshot.host}:${snapshot.port}`
        : snapshot.state === 'Connecting'
            ? 'Connecting'
            : snapshot.state === 'Error'
                ? 'Error'
                : 'Disconnected';

    const connectionState = snapshot.state === 'Connected'
        ? "connected"
        : snapshot.state === 'Connecting'
            ? "connecting"
            : snapshot.state === 'Error'
                ? "error"
                : "disconnected";

    const connectedInstance = snapshot.state === 'Connected'
        ? { host: snapshot.host, port: snapshot.port }
        : undefined;

    const fallbackPollIntervalMs = Math.max(Math.floor(1000 / pollHz), 10); // At least 10ms
    const pollIntervalMs = Math.max(uiRefreshMs ?? fallbackPollIntervalMs, 10);

    return {
        connectionState,
        statusText,
        connectedInstance,
        watches: watches.map((watch) => ({
            id: watch.id,
            label: watch.label,
            value: watch.lastValueText ?? '',
            stale: watch.stale,
            error: watch.lastError,
        })),
        controlSurfaceRoot,
        pollIntervalMs,
        uiRefreshMs,
        activeSidebarId,
        selectedPageId,
        viewId,
    };
}

/**
 * Builds the payload with symbol values evaluated from the remote session.
 */
export async function buildControlSurfaceWebviewPayloadWithSymbols(
    snapshot: SessionSnapshot,
    watches: WatchItem[],
    controlSurfaceRoot: DevtoolsControlNode[],
    evalExpr: (expression: string) => Promise<string>,
    pollHz: number,
    uiRefreshMs: number | undefined,
    activeSidebarId?: string,
    selectedPageId?: string,
    viewId?: string,
): Promise<{
    connectionState: "connected" | "connecting" | "disconnected" | "error";
    statusText: string;
    connectedInstance?: { host: string; port: number };
    watches: Array<{ id: string; label: string; value: string; stale?: boolean; error?: string }>;
    controlSurfaceRoot: DevtoolsControlNode[];
    symbolValues?: Record<string, any>;
    expressionResults?: Record<string, { value?: string; error?: string }>;
    discoveredInstances?: Array<{ host: string; port: number; label?: string; description?: string; detail?: string; cartPath?: string; metaTitle?: string; metaVersion?: string; startedAt?: string }>;
    pollIntervalMs: number;
    uiRefreshMs?: number;
    activeSidebarId?: string;
    selectedPageId?: string;
    viewId?: string;
}> {
    const basePayload = buildControlSurfaceWebviewPayload(
        snapshot,
        watches,
        controlSurfaceRoot,
        pollHz,
        uiRefreshMs,
        activeSidebarId,
        selectedPageId,
        viewId,
    );

    // If not connected, return base payload without symbol values
    if (snapshot.state !== 'Connected') {
        return basePayload;
    }

    // Extract all symbols from the control tree
    const symbols = extractSymbols(controlSurfaceRoot);
    const symbolValues: Record<string, any> = {};

    // Evaluate each symbol
    for (const symbol of symbols) {
        try {
            const valueText = await evalExpr(symbol);
            // Try to parse as JSON to get proper types (number, boolean, etc.)
            try {
                symbolValues[symbol] = JSON.parse(valueText);
            } catch {
                // If not valid JSON, keep as string
                symbolValues[symbol] = valueText;
            }
        } catch (error) {
            // If evaluation fails, symbol remains undefined
            console.error(`Failed to evaluate symbol ${symbol}:`, error);
        }
    }

    return {
        ...basePayload,
        symbolValues,
    };
}
