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
    plotData?: Record<string, { expression: string; rateHz: number; values: number[]; startTime: number; endTime: number }>;
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
