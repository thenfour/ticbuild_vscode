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
        webviewView.onDidDispose(() => {
            if (this.view === webviewView) {
                this.view = undefined;
            }
        }, undefined, this.disposables);
        const id = 'sidebar-default';
        if (!this.registry.getById(id)) {
            this.registry.add({
                id,
                kind: 'sidebar',
                title: 'Control Surface Sidebar',
                createdAt: Date.now(),
            });
        }
        this.registry.setActiveSidebarId(id);
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
        webview.html = buildControlSurfaceWebviewHtml(
            webview,
            this.extensionPath,
            'sidebar',
        );
        this.update();
    }

    async reveal(preserveFocus = true): Promise<void> {
        try {
            this.view?.show?.(preserveFocus);
            return;
        } catch (error) {
            this.view = undefined;
        }
        await vscode.commands.executeCommand('tic80ControlSurfaceSidebar.focus');
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
