import * as path from 'node:path';
import * as vscode from 'vscode';

import { ControlSurfaceRegistry } from './ControlSurfaceRegistry';
import { buildControlSurfaceWebviewHtml } from './ControlSurfaceWebview';

export class ControlSurfaceSidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private view: vscode.WebviewView | undefined;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private readonly extensionPath: string,
        private readonly registry: ControlSurfaceRegistry,
        private readonly getPayload: () => unknown,
        private readonly handleMessage: (message: { type?: string }) => void,
    ) {
        this.disposables.push(
            this.registry.onDidChange(() => this.update()),
        );
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        const { webview } = webviewView;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.extensionPath, 'ControlSurfaceUI', 'dist')),
            ],
        };
        webview.onDidReceiveMessage(
            (message: { type?: string }) => this.handleMessage(message),
            undefined,
            this.disposables,
        );
        webview.html = buildControlSurfaceWebviewHtml(webview, this.extensionPath);
        this.update();
    }

    reveal(preserveFocus = true): void {
        this.view?.show?.(preserveFocus);
    }

    update(): void {
        if (!this.view) {
            return;
        }
        this.view.webview.postMessage(this.getPayload());
    }

    dispose(): void {
        this.view = undefined;
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
