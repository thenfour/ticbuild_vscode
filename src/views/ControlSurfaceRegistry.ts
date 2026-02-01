import * as vscode from 'vscode';

export type ControlSurfaceKind = 'panel' | 'sidebar';

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

    getSidebars(): ControlSurfaceViewInfo[] {
        return this.items.filter((item) => item.kind === 'sidebar');
    }

    getById(id: string): ControlSurfaceViewInfo | undefined {
        return this.items.find((item) => item.id === id);
    }

    getActiveSidebarId(): string | undefined {
        return this.activeSidebarId;
    }

    setActiveSidebarId(id: string | undefined): void {
        if (id && !this.items.some((item) => item.id === id && item.kind === 'sidebar')) {
            return;
        }
        this.activeSidebarId = id;
        this.emitter.fire();
    }

    add(view: ControlSurfaceViewInfo): void {
        this.items.push(view);
        if (view.kind === 'sidebar' && !this.activeSidebarId) {
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
        if (removed.kind === 'sidebar' && this.activeSidebarId === removed.id) {
            this.activeSidebarId = this.items.find((item) => item.kind === 'sidebar')?.id;
        }
        this.emitter.fire();
        return removed;
    }
}
