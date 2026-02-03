import * as vscode from 'vscode';
import { IsNullOrWhitespace } from '../utils';
import { RemoteSessionManager } from '../session/RemoteSessionManager';
import { WatchStore } from '../watches/watchStore';
import { ControlSurfaceRegistry } from '../views/ControlSurfaceRegistry';
import { ExpressionSubscriptionMonitor } from './ExpressionSubscriptionMonitor';
import { CONFIG_CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS } from '../baseDefs';

export class ControlSurfaceMessageHandler {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly output: vscode.OutputChannel,
        private readonly session: RemoteSessionManager,
        private readonly watchStore: WatchStore,
        private readonly controlSurfaceRegistry: ControlSurfaceRegistry,
        private readonly expressionMonitor: ExpressionSubscriptionMonitor,
        private readonly stateKeySelectedPage: string,
    ) { }

    handleMessage(message: { type?: string }, webview?: vscode.Webview): void {
        switch (message?.type) {
            case 'log': {
                const logMessage = (message as { message?: string }).message;
                if (logMessage) {
                    this.output.appendLine(`[webview] ${logMessage}`);
                }
                break;
            }
            case 'setSelectedPage': {
                const payload = message as { pageId?: string; viewId?: string; pageLabel?: string };
                if (payload.pageId && payload.viewId) {
                    const key = `${this.stateKeySelectedPage}.${payload.viewId}`;
                    void this.context.workspaceState.update(key, payload.pageId);
                    this.output.appendLine(`[controlSurface] Saved selected page: viewId=${payload.viewId}, pageId=${payload.pageId}, key=${key}`);
                    if (payload.pageLabel && webview) {
                        const panelEntry = this.controlSurfaceRegistry
                            .getPanels()
                            .find((entry) => entry.panel?.webview === webview);
                        if (panelEntry?.panel) {
                            const title = IsNullOrWhitespace(payload.pageLabel) ? "TIC-80" : `TIC-80: ${payload.pageLabel}`;
                            panelEntry.panel.title = title;
                            panelEntry.title = title;
                        }
                    }
                } else {
                    this.output.appendLine(`[controlSurface] setSelectedPage missing data: pageId=${payload.pageId}, viewId=${payload.viewId}`);
                }
                break;
            }
            case 'addControl': {
                const payload = message as { parentPath?: string[]; control?: unknown };
                this.output.appendLine(`[controlSurface] addControl request: parentPath=${JSON.stringify(payload.parentPath)}, control=${JSON.stringify(payload.control)}`);

                if (payload.control && payload.parentPath) {
                    void this.watchStore.addControl(payload.parentPath, payload.control as any).then(() => {
                        this.output.appendLine('[controlSurface] addControl completed successfully');
                        if (webview) {
                            void webview.postMessage({
                                type: 'log',
                                message: 'Control added successfully',
                            });
                        }
                    }).catch((error) => {
                        this.output.appendLine(`[controlSurface] addControl failed: ${String(error)}`);
                        if (webview) {
                            void webview.postMessage({
                                type: 'log',
                                message: `Failed to add control: ${String(error)}`,
                            });
                        }
                    });
                }
                break;
            }
            case 'updateControl': {
                const payload = message as { path?: string[]; control?: unknown };
                if (payload.path && payload.control) {
                    this.output.appendLine(`[controlSurface] updateControl request: path=${JSON.stringify(payload.path)}`);
                    void this.watchStore.updateControl(payload.path, payload.control as any).catch((error) => {
                        this.output.appendLine(`[controlSurface] updateControl failed: ${String(error)}`);
                    });
                }
                break;
            }
            case 'deleteControl': {
                const payload = message as { path?: string[] };
                if (payload.path) {
                    this.output.appendLine(`[controlSurface] deleteControl request: path=${JSON.stringify(payload.path)}`);
                    void this.watchStore.deleteControl(payload.path).catch((error) => {
                        this.output.appendLine(`[controlSurface] deleteControl failed: ${String(error)}`);
                    });
                }
                break;
            }
            case 'moveControl': {
                const payload = message as { path?: string[]; direction?: 'up' | 'down' };
                if (payload.path && payload.direction) {
                    this.output.appendLine(`[controlSurface] moveControl request: path=${JSON.stringify(payload.path)}, direction=${payload.direction}`);
                    void this.watchStore.moveControl(payload.path, payload.direction).catch((error) => {
                        this.output.appendLine(`[controlSurface] moveControl failed: ${String(error)}`);
                    });
                }
                break;
            }
            case 'addWatch':
                void vscode.commands.executeCommand('tic80.addWatch');
                break;
            case 'removeWatch':
                void vscode.commands.executeCommand('tic80.removeWatch');
                break;
            case 'clearWatches':
                void vscode.commands.executeCommand('tic80.clearWatches');
                break;
            case 'evalExpression': {
                if (!this.session.isConnected()) {
                    const payload = message as { requestId?: string; expression?: string };
                    if (webview && payload.requestId) {
                        void webview.postMessage({
                            type: 'evalResult',
                            requestId: payload.requestId,
                            error: 'Not connected',
                        });
                    }
                    break;
                }
                const payload = message as { requestId?: string; expression?: string };
                if (!payload.expression || !payload.requestId) {
                    break;
                }
                void (async () => {
                    try {
                        const result = await this.session.evalExpr(payload.expression!);
                        if (webview) {
                            void webview.postMessage({
                                type: 'evalResult',
                                requestId: payload.requestId,
                                result,
                            });
                        }
                    } catch (error) {
                        this.output.appendLine(`[controlSurface] evalExpression error: ${String(error)}`);
                        if (webview) {
                            void webview.postMessage({
                                type: 'evalResult',
                                requestId: payload.requestId,
                                error: error instanceof Error ? error.message : String(error),
                            });
                        }
                    }
                })();
                break;
            }
            case 'showWarningMessage': {
                const payload = message as { requestId?: string; message?: string; items?: string[] };
                if (!payload.message || !payload.requestId) {
                    break;
                }
                void (async () => {
                    try {
                        const result = await vscode.window.showWarningMessage(
                            payload.message!,
                            ...(payload.items ?? [])
                        );
                        if (webview) {
                            void webview.postMessage({
                                type: 'showWarningMessageResult',
                                requestId: payload.requestId,
                                result,
                            });
                        }
                    } catch (error) {
                        this.output.appendLine(`[controlSurface] showWarningMessage error: ${String(error)}`);
                        if (webview) {
                            void webview.postMessage({
                                type: 'showWarningMessageResult',
                                requestId: payload.requestId,
                                error: error instanceof Error ? error.message : String(error),
                            });
                        }
                    }
                })();
                break;
            }
            case 'listGlobals': {
                const payload = message as { requestId?: string };
                if (!payload.requestId) {
                    break;
                }
                if (!this.session.isConnected()) {
                    if (webview) {
                        void webview.postMessage({
                            type: 'listGlobalsResult',
                            requestId: payload.requestId,
                            error: 'Not connected',
                        });
                    }
                    break;
                }
                void (async () => {
                    try {
                        const result = await this.session.listGlobals();
                        if (webview) {
                            void webview.postMessage({
                                type: 'listGlobalsResult',
                                requestId: payload.requestId,
                                result,
                            });
                        }
                    } catch (error) {
                        this.output.appendLine(`[controlSurface] listGlobals error: ${String(error)}`);
                        if (webview) {
                            void webview.postMessage({
                                type: 'listGlobalsResult',
                                requestId: payload.requestId,
                                error: error instanceof Error ? error.message : String(error),
                            });
                        }
                    }
                })();
                break;
            }
            case 'eval': {
                if (!this.session.isConnected()) {
                    this.output.appendLine('[controlSurface] eval ignored (not connected)');
                    break;
                }
                const expr = (message as { expression?: string }).expression;
                if (!expr) {
                    break;
                }
                void this.session.eval(expr).catch((error) => {
                    this.output.appendLine(`[controlSurface] eval error: ${String(error)}`);
                });
                break;
            }
            case 'subscribeExpression': {
                const payload = message as { expression?: string };
                if (!payload.expression) {
                    break;
                }
                this.expressionMonitor.subscribe(payload.expression);
                break;
            }
            case 'unsubscribeExpression': {
                const payload = message as { expression?: string };
                if (!payload.expression) {
                    break;
                }
                this.expressionMonitor.unsubscribe(payload.expression);
                break;
            }
            case 'attach':
                void vscode.commands.executeCommand('tic80.attach');
                break;
            case 'detach':
                void vscode.commands.executeCommand('tic80.detach');
                break;
            case 'connectInstance': {
                const payload = message as { host?: string; port?: number };
                if (!payload.host || !payload.port) {
                    break;
                }
                const config = vscode.workspace.getConfiguration('tic80');
                const timeoutMs = config.get<number>(
                    CONFIG_CONNECT_TIMEOUT_MS,
                    DEFAULT_CONNECT_TIMEOUT_MS,
                );

                if (this.session.isConnected()) {
                    this.output.appendLine('[session] Disconnecting before new connect request');
                    this.session.disconnect('User requested reconnect');
                }

                this.output.appendLine(`[session] Attaching to ${payload.host}:${payload.port}`);
                void (async () => {
                    try {
                        await this.session.connect(payload.host!, payload.port!, timeoutMs);
                        this.output.appendLine(`[session] Connected to ${payload.host}:${payload.port}`);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        this.output.appendLine(`[session] Attach failed: ${message}`);
                        void vscode.window.showErrorMessage(
                            `TIC-80 attach failed: ${message}`);
                    }
                })();
                break;
            }
            case 'setSymbol': {
                if (!this.session.isConnected()) {
                    this.output.appendLine('[controlSurface] setSymbol ignored (not connected)');
                    break;
                }
                const payload = message as { symbol?: string; value?: unknown };
                if (!payload.symbol) {
                    break;
                }
                const serialized = JSON.stringify(payload.value ?? null);
                const expr = `${payload.symbol} = ${serialized}`;
                this.output.appendLine(`[controlSurface] setSymbol: ${expr}`);
                void this.session.eval(expr).catch((error) => {
                    this.output.appendLine(`[controlSurface] setSymbol error: ${String(error)}`);
                });
                break;
            }
            default:
                break;
        }
    }
}
