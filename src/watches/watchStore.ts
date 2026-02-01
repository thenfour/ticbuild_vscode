import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

import { DEVTOOLS_DIR_NAME, DEVTOOLS_FILE_NAME } from '../baseDefs';
import { LuaExprWatch, LuaGlobalWatch, MemoryWatch, WatchItem } from './watchTypes';

export class WatchStore {
  private readonly emitter = new vscode.EventEmitter<void>();
  private watches: WatchItem[] = [];
  private output?: vscode.OutputChannel;
  private readonly devtoolsPath?: string;

  constructor(
    workspaceRoot: string | undefined,
    output?: vscode.OutputChannel,
  ) {
    this.output = output;
    this.devtoolsPath = workspaceRoot
      ? path.join(workspaceRoot, DEVTOOLS_DIR_NAME, DEVTOOLS_FILE_NAME)
      : undefined;
    void this.load();
  }

  dispose(): void {
    this.emitter.dispose();
  }

  onDidChange(listener: () => void): vscode.Disposable {
    return this.emitter.event(listener);
  }

  getAll(): WatchItem[] {
    return [...this.watches];
  }

  addGlobal(name: string): LuaGlobalWatch {
    const watch: LuaGlobalWatch = {
      id: this.createId(),
      type: 'LuaGlobal',
      name,
      label: name,
      createdAt: Date.now(),
      stale: true,
    };
    this.watches.push(watch);
    void this.persist();
    this.emitter.fire();
    this.log(`[watchStore] add global '${name}' (count=${this.watches.length})`);
    return watch;
  }

  addExpr(expr: string): LuaExprWatch {
    const watch: LuaExprWatch = {
      id: this.createId(),
      type: 'LuaExpr',
      expr,
      label: expr,
      createdAt: Date.now(),
      stale: true,
    };
    this.watches.push(watch);
    void this.persist();
    this.emitter.fire();
    this.log(`[watchStore] add expr '${expr}' (count=${this.watches.length})`);
    return watch;
  }

  addMemory(expression: string): MemoryWatch {
    const watch: MemoryWatch = {
      id: this.createId(),
      type: 'Memory',
      expression,
      label: expression,
      createdAt: Date.now(),
      stale: true,
    };
    this.watches.push(watch);
    void this.persist();
    this.emitter.fire();
    this.log(`[watchStore] add memory '${expression}' (count=${this.watches.length})`);
    return watch;
  }

  remove(id: string): void {
    this.watches = this.watches.filter((watch) => watch.id !== id);
    void this.persist();
    this.emitter.fire();
    this.log(`[watchStore] remove ${id} (count=${this.watches.length})`);
  }

  clear(): void {
    this.watches = [];
    void this.persist();
    this.emitter.fire();
    this.log('[watchStore] clear');
  }

  update(id: string, updater: (watch: WatchItem) => WatchItem): void {
    this.updateWithOptions(id, updater, { emit: true, persist: true });
  }

  updateRuntime(id: string, updater: (watch: WatchItem) => WatchItem): void {
    this.updateWithOptions(id, updater, { emit: false, persist: false });
  }

  private updateWithOptions(
    id: string,
    updater: (watch: WatchItem) => WatchItem,
    options: { emit: boolean; persist: boolean },
  ): void {
    let changed = false;
    this.watches = this.watches.map((watch) => {
      if (watch.id !== id) {
        return watch;
      }
      changed = true;
      const updated = updater(watch);
      //this.log(`[watchStore] update ${id} stale=${updated.stale} value=${updated.lastValueText ?? ''}`);
      return updated;
    });
    if (changed) {
      if (options.persist) {
        this.persist();
      }
      if (options.emit) {
        this.emitter.fire();
      }
    }
  }

  markAllStale(): void {
    this.watches = this.watches.map((watch) => ({
      ...watch,
      stale: true,
    }));
    this.emitter.fire();
    this.log('[watchStore] markAllStale');
  }

  private async load(): Promise<void> {
    if (!this.devtoolsPath) {
      return;
    }
    let raw: string;
    try {
      raw = await fs.readFile(this.devtoolsPath, 'utf8');
    } catch (error) {
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      this.log('[watchStore] devtools.json parse error');
      return;
    }

    if (!payload || typeof payload !== 'object') {
      return;
    }

    const data = payload as { watches?: unknown[] };
    if (!Array.isArray(data.watches)) {
      return;
    }

    this.watches = data.watches
      .map((item) => this.deserializeWatch(item))
      .filter((item): item is WatchItem => !!item)
      .map((watch) => ({
        ...watch,
        stale: true,
        lastError: undefined,
      }));

    this.emitter.fire();
    this.log(`[watchStore] load (count=${this.watches.length})`);
  }

  private async persist(): Promise<void> {
    if (!this.devtoolsPath) {
      return;
    }

    const dir = path.dirname(this.devtoolsPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.log('[watchStore] failed to create devtools dir');
      return;
    }

    const existing = await this.readDevtoolsFile();
    const updated = {
      ...existing,
      watches: this.watches.map((watch) => this.serializeWatch(watch)),
    };

    try {
      await fs.writeFile(
        this.devtoolsPath,
        JSON.stringify(updated, null, 2),
        'utf8',
      );
    } catch (error) {
      this.log('[watchStore] failed to write devtools.json');
    }
  }

  private async readDevtoolsFile(): Promise<Record<string, unknown>> {
    if (!this.devtoolsPath) {
      return {};
    }
    try {
      const raw = await fs.readFile(this.devtoolsPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      // ignore
    }
    return {};
  }

  private createId(): string {
    const random = Math.random().toString(36).slice(2, 8);
    return `${Date.now().toString(36)}-${random}`;
  }

  private log(message: string): void {
    this.output?.appendLine(message);
  }

  private deserializeWatch(entry: unknown): WatchItem | undefined {
    if (!entry || typeof entry !== 'object') {
      return undefined;
    }
    const data = entry as { type?: string; symbol?: string; expression?: string };
    if (data.type === 'global' && data.symbol) {
      return {
        id: this.createId(),
        type: 'LuaGlobal',
        name: data.symbol,
        label: data.symbol,
        createdAt: Date.now(),
        stale: true,
      };
    }
    if (data.type === 'expression' && data.expression) {
      return {
        id: this.createId(),
        type: 'LuaExpr',
        expr: data.expression,
        label: data.expression,
        createdAt: Date.now(),
        stale: true,
      };
    }
    if (data.type === 'memory' && data.expression) {
      return {
        id: this.createId(),
        type: 'Memory',
        expression: data.expression,
        label: data.expression,
        createdAt: Date.now(),
        stale: true,
      };
    }
    return undefined;
  }

  private serializeWatch(watch: WatchItem): Record<string, unknown> {
    if (watch.type === 'LuaGlobal') {
      return { type: 'global', symbol: watch.name };
    }
    if (watch.type === 'LuaExpr') {
      return { type: 'expression', expression: watch.expr };
    }
    return { type: 'memory', expression: watch.expression };
  }
}
