import * as vscode from 'vscode';

import { RemoteSessionManager } from '../session/RemoteSessionManager';
import { WatchStore } from '../watches/watchStore';
import { WatchItem } from '../watches/watchTypes';
import { ControlSurfaceRegistry, ControlSurfaceViewInfo } from './ControlSurfaceRegistry';

export class Tic80WatchesProvider implements
  vscode.TreeDataProvider<Tic80Node> {
  private readonly emitter = new vscode.EventEmitter<Tic80Node | undefined>();
  private lastLogAt = 0;

  constructor(
    private readonly session: RemoteSessionManager,
    private readonly watchStore: WatchStore,
    private readonly controlSurfaceRegistry: ControlSurfaceRegistry,
    private readonly output?: vscode.OutputChannel,
  ) {
    this.session.onDidChangeState(() => this.refresh());
  }

  dispose(): void {
    this.emitter.dispose();
  }

  refresh(): void {
    // this.log(`[tree] refresh (watches=${this.watchStore.getAll().length})`);
    this.emitter.fire(undefined);
  }

  getTreeItem(element: Tic80Node): vscode.TreeItem {
    if (element instanceof WatchNode) {
      const watch =
        this.watchStore.getAll().find((item) => item.id === element.watchId);
      if (watch) {
        element.apply(watch);
        //this.logNode(`[tree] getTreeItem ${watch.label} => ${watch.lastValueText ?? ''} stale=${watch.stale}`);
      } else {
        // this.logNode(`[tree] getTreeItem missing ${element.watchId}`);
      }
    }
    return element;
  }

  getChildren(element?: Tic80Node): Thenable<Tic80Node[]> {
    if (!element) {
      return Promise.resolve(
        [
          this.createSessionNode(),
          this.createWatchesGroupNode(),
          this.createControlSurfacesGroupNode(),
        ]);
    }
    if (element instanceof WatchesGroupNode) {
      // this.log('[tree] getChildren (watches)');
      return Promise.resolve(
        this.watchStore.getAll().map((watch) => this.createWatchNode(watch)));
    }
    if (element instanceof ControlSurfacesGroupNode) {
      return Promise.resolve(
        this.controlSurfaceRegistry.getAll().map(
          (view) => this.createControlSurfaceNode(view)));
    }
    return Promise.resolve([]);
  }

  get onDidChangeTreeData(): vscode.Event<Tic80Node | undefined> {
    return this.emitter.event;
  }

  private createSessionNode(): SessionNode {
    const snapshot = this.session.snapshot;
    return new SessionNode(snapshot);
  }

  private createWatchesGroupNode(): WatchesGroupNode {
    return new WatchesGroupNode(this.watchStore.getAll().length);
  }

  private createWatchNode(watch: WatchItem): WatchNode {
    const node = new WatchNode(watch);
    // this.logNode(`[tree] node ${watch.label} => ${        watch.lastValueText
    // ?? ''} stale=${watch.stale}`);
    return node;
  }

  private createControlSurfacesGroupNode(): ControlSurfacesGroupNode {
    return new ControlSurfacesGroupNode(
      this.controlSurfaceRegistry.getAll().length,
    );
  }

  private createControlSurfaceNode(view: ControlSurfaceViewInfo): ControlSurfaceNode {
    return new ControlSurfaceNode(view);
  }

  private log(message: string): void {
    if (!this.output) {
      return;
    }
    const now = Date.now();
    if (now - this.lastLogAt >= 1000) {
      this.lastLogAt = now;
      this.output.appendLine(message);
    }
  }

  private logNode(message: string): void {
    this.output?.appendLine(message);
  }
}

export type Tic80Node =
  SessionNode | WatchesGroupNode | WatchNode | ControlSurfacesGroupNode | ControlSurfaceNode;

class SessionNode extends vscode.TreeItem {
  constructor(snapshot: {
    state: string; host: string; port: number;
    lastError?: string
  }) {
    const description = snapshot.state === 'Connected' ? `Connected ${snapshot.host}:${snapshot.port}` :
      snapshot.state === 'Connecting' ? 'Connecting' : 'Disconnected';
    super('Session', vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'tic80SessionNode';
    this.description = description;
    if (snapshot.lastError) {
      this.tooltip = `Last error: ${snapshot.lastError}`;
    }
  }
}

class WatchesGroupNode extends vscode.TreeItem {
  constructor(count: number) {
    super('Watches', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'tic80WatchesGroup';
    this.description = count > 0 ? `${count}` : undefined;
  }
}

class ControlSurfacesGroupNode extends vscode.TreeItem {
  constructor(count: number) {
    super('Control Surfaces', vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'tic80ControlSurfacesGroup';
    this.description = count > 0 ? `${count}` : undefined;
  }
}

export class ControlSurfaceNode extends vscode.TreeItem {
  readonly viewId: string;
  readonly kind: 'panel' | 'explorer' | 'activity';

  constructor(view: ControlSurfaceViewInfo) {
    super(view.title, vscode.TreeItemCollapsibleState.None);
    this.viewId = view.id;
    this.kind = view.kind;
    this.id = view.id;
    this.contextValue =
      view.kind === 'panel'
        ? 'tic80ControlSurfacePanelItem'
        : view.kind === 'explorer'
          ? 'tic80ControlSurfaceExplorerItem'
          : 'tic80ControlSurfaceActivityItem';
    this.description =
      view.kind === 'panel'
        ? 'Panel'
        : view.kind === 'explorer'
          ? 'Explorer Sidebar'
          : 'Activity Bar';
  }
}

export class WatchNode extends vscode.TreeItem {
  readonly watchId: string;

  constructor(watch: WatchItem) {
    super(watch.label, vscode.TreeItemCollapsibleState.None);
    this.watchId = watch.id;
    this.contextValue = 'tic80WatchItem';
    this.apply(watch);
  }

  apply(watch: WatchItem): void {
    this.label = watch.label;
    const valueKey = watch.lastValueText ?? '';
    const errorKey = watch.lastError ?? '';
    const staleKey = watch.stale ? 'stale' : 'ok';
    this.id = `${watch.id}:${staleKey}:${valueKey}:${errorKey}`;
    const description = watch.lastError ? '= (error)' :
      watch.stale ? '= (stale)' :
        `= ${watch.lastValueText ?? ''}`;
    this.description = description;
    const tooltipParts: string[] = [];
    if (watch.lastValueText) {
      tooltipParts.push(`Value: ${watch.lastValueText}`);
    }
    if (watch.lastError) {
      tooltipParts.push(`Error: ${watch.lastError}`);
    }
    if (watch.lastOkAt) {
      const date = new Date(watch.lastOkAt);
      tooltipParts.push(`Last OK: ${date.toLocaleString()}`);
    }
    this.tooltip = tooltipParts.join('\n');
  }
}
