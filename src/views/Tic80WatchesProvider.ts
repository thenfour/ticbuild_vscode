import * as vscode from 'vscode';

import { RemoteSessionManager } from '../session/RemoteSessionManager';
import { WatchStore } from '../watches/watchStore';
import { WatchItem } from '../watches/watchTypes';

export class Tic80WatchesProvider implements
  vscode.TreeDataProvider<Tic80Node> {
  private readonly emitter = new vscode.EventEmitter<Tic80Node | undefined>();
  private lastLogAt = 0;

  constructor(
    private readonly session: RemoteSessionManager,
    private readonly watchStore: WatchStore,
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
        [this.createSessionNode(), this.createWatchesGroupNode()]);
    }
    if (element instanceof WatchesGroupNode) {
      // this.log('[tree] getChildren (watches)');
      return Promise.resolve(
        this.watchStore.getAll().map((watch) => this.createWatchNode(watch)));
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

export type Tic80Node = SessionNode | WatchesGroupNode | WatchNode;

class SessionNode extends vscode.TreeItem {
  constructor(snapshot: {
    state: string; host: string; port: number;
    lastError?: string
  }) {
    const description = snapshot.state === 'Connected' ? `Connected ${snapshot.host}:${snapshot.port}` :
      snapshot.state === 'Connecting' ? 'Connecting' : 'Disconnected';
    super('Session', vscode.TreeItemCollapsibleState.None);
    this.description = description;
    if (snapshot.lastError) {
      this.tooltip = `Last error: ${snapshot.lastError}`;
    }
  }
}

class WatchesGroupNode extends vscode.TreeItem {
  constructor(count: number) {
    super('Watches', vscode.TreeItemCollapsibleState.Expanded);
    this.description = count > 0 ? `${count}` : undefined;
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
