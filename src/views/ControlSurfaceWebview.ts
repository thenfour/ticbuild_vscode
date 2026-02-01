import * as path from 'node:path';
import * as vscode from 'vscode';

import { SessionSnapshot } from '../session/RemoteSessionManager';
import { WatchItem } from '../watches/watchTypes';


export function buildControlSurfaceWebviewHtml(
    webview: vscode.Webview,
    extensionPath: string,
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
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function buildControlSurfaceWebviewPayload(
    snapshot: SessionSnapshot,
    watches: WatchItem[],
): { status: string; watches: Array<{ id: string; label: string; value: string; stale?: boolean; error?: string }> } {
    const status = snapshot.state === 'Connected'
        ? `Connected ${snapshot.host}:${snapshot.port}`
        : snapshot.state === 'Connecting'
            ? 'Connecting'
            : snapshot.state === 'Error'
                ? 'Error'
                : 'Disconnected';

    return {
        status,
        watches: watches.map((watch) => ({
            id: watch.id,
            label: watch.label,
            value: watch.lastValueText ?? '',
            stale: watch.stale,
            error: watch.lastError,
        })),
    };
}
