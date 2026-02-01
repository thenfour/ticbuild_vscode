import * as path from 'node:path';
import * as vscode from 'vscode';

import { ControlSurfaceRegistry, ControlSurfaceKind } from './ControlSurfaceRegistry';
import { buildControlSurfaceWebviewHtml } from './ControlSurfaceWebview';

export class ControlSurfaceSidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private view: vscode.WebviewView | undefined;
    private readonly disposables: vscode.Disposable[] = [];

    constructor(
        private readonly extensionPath: string,
        private readonly registry: ControlSurfaceRegistry,
        private readonly getPayload: () => unknown,
        private readonly handleMessage: (message: { type?: string }) => void,
        private readonly viewKind: ControlSurfaceKind,
        private readonly registryId: string,
        private readonly title: string,
        private readonly viewId: string,
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
        if (!this.registry.getById(this.registryId)) {
            this.registry.add({
                id: this.registryId,
                kind: this.viewKind,
                title: this.title,
                createdAt: Date.now(),
            });
        }
        this.registry.setActiveSidebarId(this.registryId);
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
            this.viewKind,
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
        await vscode.commands.executeCommand(`${this.viewId}.focus`);
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
