import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

import { DEVTOOLS_DIR_NAME, DEVTOOLS_FILE_NAME } from '../baseDefs';
import { DevtoolsControlNode, readDevtoolsFile } from '../devtoolsModel';
import { LuaExprWatch, LuaGlobalWatch, MemoryWatch, WatchItem } from './watchTypes';

export class WatchStore {
  private readonly emitter = new vscode.EventEmitter<void>();
  private watches: WatchItem[] = [];
  private controlSurfaceRoot: DevtoolsControlNode[] = [];
  private output?: vscode.OutputChannel;
  private readonly devtoolsPath?: string;
  private readonly loadPromise: Promise<void>;

  constructor(
    workspaceRoot: string | undefined,
    output?: vscode.OutputChannel,
  ) {
    this.output = output;
    this.devtoolsPath = workspaceRoot
      ? path.join(workspaceRoot, DEVTOOLS_DIR_NAME, DEVTOOLS_FILE_NAME)
      : undefined;
    this.loadPromise = this.load().catch((error) => {
      this.log(`[watchStore] load failed: ${String(error)}`);
    });
  }

  dispose(): void {
    this.emitter.dispose();
  }

  onDidChange(listener: () => void): vscode.Disposable {
    return this.emitter.event(listener);
  }

  whenReady(): Promise<void> {
    return this.loadPromise;
  }

  getAll(): WatchItem[] {
    return [...this.watches];
  }

  getControlSurfaceRoot(): DevtoolsControlNode[] {
    return [...this.controlSurfaceRoot];
  }

  async reloadFromDisk(): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] reload skipped (no workspace root)');
      return;
    }
    const data = await readDevtoolsFile(this.devtoolsPath, this.output);
    this.applyDevtoolsData(data);
    this.log('[watchStore] reloaded devtools.json');
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

  async addControl(parentPath: string[], control: DevtoolsControlNode): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] addControl skipped (no workspace root)');
      return;
    }

    // Read current devtools file to get the latest state
    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const controlSurfaceRoot = Array.isArray(existing.controlSurfaceRoot)
      ? existing.controlSurfaceRoot
      : [];

    const container = this.resolveControlsContainer(controlSurfaceRoot, parentPath);
    if (!container) {
      this.log(`[watchStore] addControl failed: could not navigate to ${parentPath.join('/')}`);
      return;
    }
    container.push(control);
    this.log(`[watchStore] added control to path ${parentPath.join('/')}, type=${(control as any).type}`);

    // Update in-memory state
    this.controlSurfaceRoot = controlSurfaceRoot;

    // Write back to devtools.json
    const updated = {
      ...existing,
      watches: this.watches.map((watch) => this.serializeWatch(watch)),
      controlSurfaceRoot,
    };

    const dir = path.dirname(this.devtoolsPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.log('[watchStore] failed to create devtools dir');
      return;
    }

    try {
      await fs.writeFile(
        this.devtoolsPath,
        JSON.stringify(updated, null, 2),
        'utf8',
      );
      this.log(`[watchStore] added control type=${(control as any).type} to path=${parentPath.join('/')}`);
    } catch (error) {
      this.log('[watchStore] failed to write devtools.json');
      return;
    }

    // Trigger a change event to refresh the UI
    this.emitter.fire();
  }

  async updateControl(path: string[], control: DevtoolsControlNode): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] updateControl skipped (no workspace root)');
      return;
    }

    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const controlSurfaceRoot = Array.isArray(existing.controlSurfaceRoot)
      ? existing.controlSurfaceRoot
      : [];

    const resolved = this.resolveControlByPath(controlSurfaceRoot, path);
    if (!resolved) {
      this.log(`[watchStore] updateControl failed: invalid path ${path.join('/')}`);
      return;
    }

    resolved.parentControls[resolved.index] = control;
    this.controlSurfaceRoot = controlSurfaceRoot;

    await this.persistControlSurface(existing, controlSurfaceRoot);
    this.emitter.fire();
  }

  async deleteControl(path: string[]): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] deleteControl skipped (no workspace root)');
      return;
    }

    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const controlSurfaceRoot = Array.isArray(existing.controlSurfaceRoot)
      ? existing.controlSurfaceRoot
      : [];

    const resolved = this.resolveControlByPath(controlSurfaceRoot, path);
    if (!resolved) {
      this.log(`[watchStore] deleteControl failed: invalid path ${path.join('/')}`);
      return;
    }

    resolved.parentControls.splice(resolved.index, 1);
    this.controlSurfaceRoot = controlSurfaceRoot;

    await this.persistControlSurface(existing, controlSurfaceRoot);
    this.emitter.fire();
  }

  async moveControl(path: string[], direction: 'up' | 'down'): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] moveControl skipped (no workspace root)');
      return;
    }

    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const controlSurfaceRoot = Array.isArray(existing.controlSurfaceRoot)
      ? existing.controlSurfaceRoot
      : [];

    const resolved = this.resolveControlByPath(controlSurfaceRoot, path);
    if (!resolved) {
      this.log(`[watchStore] moveControl failed: invalid path ${path.join('/')}`);
      return;
    }

    const delta = direction === 'up' ? -1 : 1;
    const nextIndex = resolved.index + delta;
    if (nextIndex < 0 || nextIndex >= resolved.parentControls.length) {
      this.log(`[watchStore] moveControl ignored: out of bounds for ${path.join('/')}`);
      return;
    }

    const [removed] = resolved.parentControls.splice(resolved.index, 1);
    resolved.parentControls.splice(nextIndex, 0, removed);

    this.controlSurfaceRoot = controlSurfaceRoot;
    await this.persistControlSurface(existing, controlSurfaceRoot);
    this.emitter.fire();
  }

  async moveControlTo(sourcePath: string[], targetParentPath: string[], targetIndex: number): Promise<void> {
    if (!this.devtoolsPath) {
      this.log('[watchStore] moveControlTo skipped (no workspace root)');
      return;
    }

    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const controlSurfaceRoot = Array.isArray(existing.controlSurfaceRoot)
      ? existing.controlSurfaceRoot
      : [];

    const resolvedSource = this.resolveControlByPath(controlSurfaceRoot, sourcePath);
    if (!resolvedSource) {
      this.log(`[watchStore] moveControlTo failed: invalid source path ${sourcePath.join('/')}`);
      return;
    }

    const targetControls = this.resolveControlsContainer(controlSurfaceRoot, targetParentPath);
    if (!targetControls) {
      this.log(`[watchStore] moveControlTo failed: invalid target path ${targetParentPath.join('/')}`);
      return;
    }

    const [removed] = resolvedSource.parentControls.splice(resolvedSource.index, 1);
    const clampedIndex = Math.max(0, Math.min(targetIndex ?? targetControls.length, targetControls.length));
    const insertIndex = resolvedSource.parentControls === targetControls && resolvedSource.index < clampedIndex
      ? clampedIndex - 1
      : clampedIndex;
    targetControls.splice(insertIndex, 0, removed);

    this.controlSurfaceRoot = controlSurfaceRoot;
    await this.persistControlSurface(existing, controlSurfaceRoot);
    this.emitter.fire();
  }

  private resolveControlByPath(
    controlSurfaceRoot: DevtoolsControlNode[],
    path: string[],
  ): { node: DevtoolsControlNode; parentControls: DevtoolsControlNode[]; index: number } | null {
    let current: any = { controls: controlSurfaceRoot };
    let parentControls: DevtoolsControlNode[] | null = null;
    let index: number | null = null;

    for (const segment of path) {
      if (segment === 'root') {
        continue;
      }

      if (segment.startsWith('c')) {
        const parsed = Number.parseInt(segment.slice(1), 10);
        if (Number.isNaN(parsed) || !Array.isArray(current.controls) || parsed < 0 || parsed >= current.controls.length) {
          return null;
        }
        parentControls = current.controls;
        index = parsed;
        current = current.controls[parsed];
        continue;
      }

      if (segment.startsWith('t')) {
        const parsed = Number.parseInt(segment.slice(1), 10);
        if (Number.isNaN(parsed) || !Array.isArray(current.tabs) || parsed < 0 || parsed >= current.tabs.length) {
          return null;
        }
        current = current.tabs[parsed];
        continue;
      }

      return null;
    }

    if (parentControls && index !== null) {
      return {
        node: current as DevtoolsControlNode,
        parentControls,
        index,
      };
    }

    return null;
  }

  private resolveControlsContainer(
    controlSurfaceRoot: DevtoolsControlNode[],
    parentPath: string[],
  ): DevtoolsControlNode[] | null {
    let current: any = { controls: controlSurfaceRoot };

    for (const segment of parentPath) {
      if (segment === 'root') {
        continue;
      }

      if (segment.startsWith('c')) {
        const parsed = Number.parseInt(segment.slice(1), 10);
        if (Number.isNaN(parsed) || !Array.isArray(current.controls) || parsed < 0 || parsed >= current.controls.length) {
          return null;
        }
        current = current.controls[parsed];
        continue;
      }

      if (segment.startsWith('t')) {
        const parsed = Number.parseInt(segment.slice(1), 10);
        if (Number.isNaN(parsed) || !Array.isArray(current.tabs) || parsed < 0 || parsed >= current.tabs.length) {
          return null;
        }
        current = current.tabs[parsed];
        continue;
      }

      return null;
    }

    if (Array.isArray(current.controls)) {
      return current.controls;
    }

    return null;
  }

  private async persistControlSurface(existing: { [key: string]: unknown }, controlSurfaceRoot: DevtoolsControlNode[]): Promise<void> {
    if (!this.devtoolsPath) {
      return;
    }

    const updated = {
      ...existing,
      watches: this.watches.map((watch) => this.serializeWatch(watch)),
      controlSurfaceRoot,
    };

    const dir = path.dirname(this.devtoolsPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.log('[watchStore] failed to create devtools dir');
      return;
    }

    try {
      await fs.writeFile(
        this.devtoolsPath,
        JSON.stringify(updated, null, 2),
        'utf8',
      );
    } catch (error) {
      this.log('[watchStore] failed to write devtools.json');
      return;
    }
  }

  private async load(): Promise<void> {
    if (!this.devtoolsPath) {
      return;
    }
    const data = await readDevtoolsFile(this.devtoolsPath, this.output);
    this.applyDevtoolsData(data);
    this.log(`[watchStore] load (count=${this.watches.length})`);
  }

  private applyDevtoolsData(data: { watches?: unknown; controlSurfaceRoot?: unknown }): void {
    const watches = Array.isArray(data.watches) ? data.watches : [];
    const controlSurfaceRoot = Array.isArray(data.controlSurfaceRoot)
      ? data.controlSurfaceRoot
      : [];

    this.controlSurfaceRoot = controlSurfaceRoot;
    this.watches = watches
      .map((item) => this.deserializeWatch(item))
      .filter((item): item is WatchItem => !!item)
      .map((watch) => ({
        ...watch,
        stale: true,
        lastError: undefined,
      }));

    this.emitter.fire();
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

    const existing = await readDevtoolsFile(this.devtoolsPath, this.output);
    const updated = {
      ...existing,
      watches: this.watches.map((watch) => this.serializeWatch(watch)),
      controlSurfaceRoot: this.controlSurfaceRoot, // Include control surface root
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
