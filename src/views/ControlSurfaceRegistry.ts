import * as vscode from 'vscode';

export type ControlSurfaceKind = 'panel' | 'explorer' | 'activity';

export type ControlSurfaceViewInfo = {
    id: string;
    kind: ControlSurfaceKind;
    title: string;
    createdAt: number;
    panel?: vscode.WebviewPanel;
};

export class ControlSurfaceRegistry implements vscode.Disposable {
    private readonly items: ControlSurfaceViewInfo[] = [];
    private activeSidebarId: string | undefined;
    private readonly emitter = new vscode.EventEmitter<void>();

    readonly onDidChange = this.emitter.event;

    dispose(): void {
        this.emitter.dispose();
    }

    getAll(): ControlSurfaceViewInfo[] {
        return [...this.items];
    }

    getPanels(): ControlSurfaceViewInfo[] {
        return this.items.filter((item) => item.kind === 'panel');
    }

    getExplorers(): ControlSurfaceViewInfo[] {
        return this.items.filter((item) => item.kind === 'explorer');
    }

    getActivities(): ControlSurfaceViewInfo[] {
        return this.items.filter((item) => item.kind === 'activity');
    }

    getById(id: string): ControlSurfaceViewInfo | undefined {
        return this.items.find((item) => item.id === id);
    }

    getActiveSidebarId(): string | undefined {
        return this.activeSidebarId;
    }

    setActiveSidebarId(id: string | undefined): void {
        if (id && !this.items.some((item) => item.id === id && (item.kind === 'explorer' || item.kind === 'activity'))) {
            return;
        }
        this.activeSidebarId = id;
        this.emitter.fire();
    }

    add(view: ControlSurfaceViewInfo): void {
        this.items.push(view);
        if ((view.kind === 'explorer' || view.kind === 'activity') && !this.activeSidebarId) {
            this.activeSidebarId = view.id;
        }
        this.emitter.fire();
    }

    removeById(id: string): ControlSurfaceViewInfo | undefined {
        const index = this.items.findIndex((item) => item.id === id);
        if (index < 0) {
            return undefined;
        }
        const [removed] = this.items.splice(index, 1);
        if ((removed.kind === 'explorer' || removed.kind === 'activity') && this.activeSidebarId === removed.id) {
            this.activeSidebarId = this.items.find((item) => item.kind === 'explorer' || item.kind === 'activity')?.id;
        }
        this.emitter.fire();
        return removed;
    }
}
