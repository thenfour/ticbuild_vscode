import * as vscode from 'vscode';
import { RemoteSessionManager } from '../session/RemoteSessionManager';
import { ControlSurfaceRegistry } from '../views/ControlSurfaceRegistry';
import { Tic80WatchesProvider } from '../views/Tic80WatchesProvider';
import { WatchPoller } from './watchPoller';
import { WatchStore } from './watchStore';

export class WatchSystem implements vscode.Disposable {
  public readonly store: WatchStore;
  public readonly provider: Tic80WatchesProvider;
  public readonly poller: WatchPoller;

  constructor(
    private readonly session: RemoteSessionManager,
    workspaceRoot: string | undefined,
    private readonly output: vscode.OutputChannel,
    controlSurfaceRegistry: ControlSurfaceRegistry,
    private readonly scheduleUiRefresh: () => void,
  ) {
    this.store = new WatchStore(workspaceRoot, output);
    this.provider = new Tic80WatchesProvider(session, this.store, controlSurfaceRegistry, output);
    this.poller = new WatchPoller(session, this.store, output, () => this.scheduleUiRefresh());
  }

  dispose(): void {
    this.poller.dispose();
    this.provider.dispose();
    this.store.dispose();
  }

  setPollHz(hz: number): void {
    this.poller.setPollHz(hz);
  }

  handleSessionStateChange(): void {
    if (this.session.isConnected()) {
      this.poller.start();
    } else {
      this.poller.stop();
      this.store.markAllStale();
      this.scheduleUiRefresh();
    }
  }
}
