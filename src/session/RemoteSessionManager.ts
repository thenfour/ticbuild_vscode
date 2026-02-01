import * as vscode from 'vscode';

import { Tic80RemotingClient } from '../remoting/Tic80RemotingClient';
import { LUA_GLOBALS_TO_IGNORE } from '../baseDefs';

export type SessionState = 'NotConnected' | 'Connecting' | 'Connected' | 'Error';

export interface SessionSnapshot {
  state: SessionState;
  host: string;
  port: number;
  lastError?: string;
  connectedAt?: number;
}

export class RemoteSessionManager implements vscode.Disposable {
  private state: SessionState = 'NotConnected';
  private host = '';
  private port = 0;
  private lastError?: string;
  private connectedAt?: number;
  private client: Tic80RemotingClient | undefined;
  private readonly emitter = new vscode.EventEmitter<SessionSnapshot>();
  private disconnecting = false;

  constructor(private output: vscode.OutputChannel) { }

  dispose(): void {
    this.emitter.dispose();
    this.disconnect('Extension disposed');
  }

  onDidChangeState(listener: (snapshot: SessionSnapshot) => void):
    vscode.Disposable {
    return this.emitter.event(listener);
  }

  get snapshot(): SessionSnapshot {
    return {
      state: this.state,
      host: this.host,
      port: this.port,
      lastError: this.lastError,
      connectedAt: this.connectedAt,
    };
  }

  isConnected(): boolean {
    return this.state === 'Connected';
  }

  async connect(host: string, port: number, timeoutMs: number): Promise<void> {
    if (this.state === 'Connecting') {
      return;
    }

    if (this.state === 'Connected') {
      if (this.host === host && this.port === port) {
        return;
      }
      this.disconnect('Connecting to another session');
    }

    this.host = host;
    this.port = port;
    this.lastError = undefined;
    this.connectedAt = undefined;
    this.updateState('Connecting');

    const client = new Tic80RemotingClient(host, port, {
      onClose: (error) => {
        if (this.disconnecting) {
          return;
        }
        const message = error?.message ?? 'Connection closed';
        this.lastError = message;
        this.client = undefined;
        this.updateState('Error');
      },
      onError: (error) => {
        if (this.disconnecting) {
          return;
        }
        this.lastError = error.message;
        this.updateState('Error');
      },
    });

    this.client = client;
    try {
      await client.connect(timeoutMs);
      await client.hello();
      this.connectedAt = Date.now();
      this.updateState('Connected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastError = message;
      client.close();
      this.client = undefined;
      this.updateState('Error');
      throw error;
    }
  }

  disconnect(reason?: string): void {
    if (this.state === 'NotConnected' && !this.client) {
      return;
    }
    this.disconnecting = true;
    try {
      if (reason) {
        this.lastError = reason;
      }
      this.client?.close();
      this.client = undefined;
      this.connectedAt = undefined;
      this.updateState('NotConnected');
    } finally {
      this.disconnecting = false;
    }
  }

  async listGlobals(): Promise<string[]> {
    if (!this.client || this.state !== 'Connected') {
      throw new Error('Not connected to TIC-80');
    }
    const globals = await this.client.listGlobals();
    // sanitize the list.
    const filtered = globals.filter((name) => {
      return !LUA_GLOBALS_TO_IGNORE.includes(name);
    });
    return filtered;
  }

  async evalExpr(expression: string): Promise<string> {
    if (!this.client || this.state !== 'Connected') {
      throw new Error('Not connected to TIC-80');
    }
    return this.client.evalExpr(expression);
  }

  async eval(statement: string): Promise<string> {
    if (!this.client || this.state !== 'Connected') {
      throw new Error('Not connected to TIC-80');
    }
    return this.client.eval(statement);
  }

  private updateState(state: SessionState): void {
    this.state = state;
    this.emitter.fire(this.snapshot);
  }
}
