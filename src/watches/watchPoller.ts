import * as vscode from 'vscode';

import {
  DEFAULT_POLL_HZ,
  MEMORY_WATCH_UNSUPPORTED,
  POLLER_LOG_THROTTLE_MS,
  POLLER_MIN_INTERVAL_MS,
} from '../baseDefs';
import { RemoteSessionManager } from '../session/RemoteSessionManager';

import { WatchStore } from './watchStore';
import { watchExpression, WatchItem } from './watchTypes';

export class WatchPoller implements vscode.Disposable {
  private timer: NodeJS.Timeout | undefined;
  private pollHz = DEFAULT_POLL_HZ;
  private busy = false;
  private lastLogAt = 0;

  constructor(
    private readonly session: RemoteSessionManager,
    private readonly store: WatchStore,
    private readonly output: vscode.OutputChannel,
    private readonly onUpdate: () => void,
  ) { }

  dispose(): void {
    this.stop();
  }

  setPollHz(hz: number): void {
    const normalized = Number.isFinite(hz) && hz > 0 ? hz : DEFAULT_POLL_HZ;
    this.pollHz = normalized;
    if (this.timer) {
      this.start();
    }
  }

  start(): void {
    this.stop();
    const intervalMs = Math.max(1000 / this.pollHz, POLLER_MIN_INTERVAL_MS);
    this.output.appendLine(
      `[poller] start (${this.pollHz} Hz, ${intervalMs} ms)`);
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      this.output.appendLine('[poller] stop');
    }
  }

  private async tick(): Promise<void> {
    if (this.busy) {
      //this.log('[poller] tick skipped (busy)');
      return;
    }
    if (!this.session.isConnected()) {
      //this.log('[poller] tick skipped (not connected)');
      this.store.markAllStale();
      this.onUpdate();
      return;
    }

    const watches = this.store.getAll();
    if (watches.length === 0) {
      //this.log('[poller] tick skipped (no watches)');
      return;
    }

    //this.log(`[poller] tick (${watches.length} watches)`);
    this.busy = true;
    try {
      for (const watch of watches) {
        await this.pollWatch(watch);
      }
    } finally {
      this.busy = false;
      this.onUpdate();
    }
  }

  private async pollWatch(watch: WatchItem): Promise<void> {
    if (watch.type === 'Memory') {
      this.store.updateRuntime(watch.id, (current) => ({
        ...current,
        lastError: MEMORY_WATCH_UNSUPPORTED,
        stale: true,
      }));
      return;
    }

    const expr = watchExpression(watch);
    if (!expr) {
      return;
    }
    try {
      const value = await this.session.evalExpr(expr);
      //this.log(`[poller] ok ${watch.label} => ${value}`);
      this.store.updateRuntime(watch.id, (current) => ({
        ...current,
        lastValueText: value,
        lastOkAt: Date.now(),
        lastError: undefined,
        stale: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`[watch] ${expr} -> error: ${message}`);
      this.store.updateRuntime(watch.id, (current) => ({
        ...current,
        lastError: message,
        stale: true,
      }));
    }
  }

  private log(message: string): void {
    const now = Date.now();
    if (now - this.lastLogAt >= POLLER_LOG_THROTTLE_MS) {
      this.lastLogAt = now;
      this.output.appendLine(message);
    }
  }
}
