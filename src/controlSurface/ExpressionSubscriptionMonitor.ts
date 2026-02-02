import * as vscode from 'vscode';
import { RemoteSessionManager } from '../session/RemoteSessionManager';

export class ExpressionSubscriptionMonitor {
    private readonly subscriptions = new Map<string, number>();
    private readonly results = new Map<string, { value?: string; error?: string }>();
    private timer: NodeJS.Timeout | undefined;
    private lastPoll = 0;

    constructor(
        private readonly session: RemoteSessionManager,
        private readonly getPollHz: () => number,
        private readonly scheduleUiRefresh: () => void,
        private readonly output: vscode.OutputChannel,
    ) { }

    start(): void {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.poll();
        }, 100);
    }

    dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }

    subscribe(expression: string): void {
        const current = this.subscriptions.get(expression) ?? 0;
        this.subscriptions.set(expression, current + 1);
    }

    unsubscribe(expression: string): void {
        const current = this.subscriptions.get(expression) ?? 0;
        if (current <= 1) {
            this.subscriptions.delete(expression);
            this.results.delete(expression);
        } else {
            this.subscriptions.set(expression, current - 1);
        }
    }

    getResultsSnapshot(): Record<string, { value?: string; error?: string }> {
        return Object.fromEntries(this.results.entries());
    }

    handleSessionStateChange(): void {
        if (this.session.isConnected()) {
            return;
        }
        if (this.subscriptions.size > 0 || this.results.size > 0) {
            this.subscriptions.clear();
            this.results.clear();
            this.scheduleUiRefresh();
        }
    }

    private async poll(): Promise<void> {
        if (!this.session.isConnected()) {
            this.handleSessionStateChange();
            return;
        }

        if (this.subscriptions.size === 0) {
            return;
        }

        const pollMs = Math.max(Math.floor(1000 / this.getPollHz()), 16);
        const now = Date.now();
        if (now - this.lastPoll < pollMs) {
            return;
        }
        this.lastPoll = now;

        const expressions = Array.from(this.subscriptions.keys());
        const results = await Promise.all(
            expressions.map(async (expression) => {
                try {
                    const value = await this.session.evalExpr(expression);
                    return { expression, value } as const;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.output.appendLine(`[controlSurface] expression eval error: ${errorMessage}`);
                    return { expression, error: errorMessage } as const;
                }
            }),
        );

        results.forEach((result) => {
            if ('error' in result) {
                this.results.set(result.expression, { error: result.error });
            } else {
                this.results.set(result.expression, { value: result.value });
            }
        });

        this.scheduleUiRefresh();
    }
}
