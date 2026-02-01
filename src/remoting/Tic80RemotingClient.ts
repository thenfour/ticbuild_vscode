import * as net from 'net';
import { REMOTING_HELLO_V1 } from '../baseDefs';

export interface RemotingResponse {
  id: number;
  status: 'OK' | 'ERR';
  data: string;
}

interface RemotingClientOptions {
  onClose?: (error?: Error) => void;
  onError?: (error: Error) => void;
}

export class Tic80RemotingClient {
  private socket: net.Socket | undefined;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number, {
    resolve: (value: RemotingResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout
  }
  >();

  constructor(
    private host: string,
    private port: number,
    private options: RemotingClientOptions = {},
  ) { }

  isConnected(): boolean {
    return !!this.socket && !this.socket.destroyed;
  }

  async connect(timeoutMs: number = 5000): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    this.socket = new net.Socket();
    this.socket.setNoDelay(true);
    this.socket.on('data', (data) => this.onData(data));
    this.socket.on('close', () => {
      this.cleanupPending(new Error('Remoting socket closed'));
      this.options.onClose?.();
    });
    this.socket.on('error', (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.cleanupPending(error);
      this.options.onError?.(error);
      this.options.onClose?.(error);
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out connecting to TIC-80 remoting at ${this.host}:${this.port}`));
      }, timeoutMs);

      this.socket!.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      this.socket!.once('error', (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });

      this.socket!.connect(this.port, this.host);
    });
  }

  async hello(): Promise<string> {
    const response = await this.sendCommand('hello');
    return response.data;
  }

  async listGlobals(): Promise<string[]> {
    const response = await this.sendCommand('listglobals');
    return response.data.split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  async evalExpr(expression: string): Promise<string> {
    const encoded = this.encodeString(expression);
    const response = await this.sendCommand('evalexpr', encoded);
    return response.data;
  }

  async eval(statement: string): Promise<string> {
    const encoded = this.encodeString(statement);
    const response = await this.sendCommand('eval', encoded);
    return response.data;
  }

  async cartPath(): Promise<string> {
    const response = await this.sendCommand('cartpath');
    return response.data;
  }

  async metadata(key: string): Promise<string> {
    const encoded = this.encodeString(key);
    const response = await this.sendCommand('metadata', encoded);
    return response.data;
  }

  async loadCart(cartPath: string, runAfterLoad: boolean = true):
    Promise<void> {
    const pathArg = this.encodeString(cartPath);
    const runArg = runAfterLoad ? '1' : '0';
    await this.sendCommand('load', `${pathArg} ${runArg}`);
  }

  async quit(): Promise<void> {
    await this.sendCommand('quit');
  }

  close(): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
      this.socket.destroy();
    }
  }

  private encodeString(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/\"/g, '\\\"');
    return `"${escaped}"`;
  }

  private async sendCommand(command: string, args: string = ''):
    Promise<RemotingResponse> {
    if (!this.socket || this.socket.destroyed) {
      throw new Error('Remoting socket is not connected');
    }

    const id = this.nextId++;
    const line = `${id} ${command}${args ? ` ${args}` : ''}\n`;
    const responsePromise = new Promise<RemotingResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for response to '${command}'`));
      }, 5000);
      this.pending.set(id, { resolve, reject, timeout });
    });

    this.socket.write(line, 'utf8');
    return responsePromise;
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString('utf8');
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const rawLine = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (rawLine.length > 0) {
        this.handleLine(rawLine);
      }
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private handleLine(line: string): void {
    if (line.startsWith('@')) {
      return;
    }

    const match = /^([^\s]+)\s+([^\s]+)\s*(.*)$/.exec(line);
    if (!match) {
      return;
    }

    const idValue = match[1];
    const status = match[2].toUpperCase() as 'OK' | 'ERR';
    const data = match[3] ?? '';
    const id = Number(idValue);
    if (!Number.isFinite(id)) {
      return;
    }

    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(id);

    if (status === 'OK') {
      pending.resolve({ id, status, data });
    } else {
      pending.reject(new Error(data || `Remoting command failed for id ${id}`));
    }
  }

  private cleanupPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}


export async function safeMetadata(
  client: Tic80RemotingClient,
  key: string,
): Promise<string | undefined> {
  try {
    return await client.metadata(key);
  } catch (error) {
    return undefined;
  }
}


export function isExpectedHello(value: string): boolean {
  return value.trim().toLowerCase() === REMOTING_HELLO_V1;
}


// takes a response string from remoting and decodes it from the escaped / quoted format.
export function decodeRemotingString(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const inner = trimmed.slice(1, -1);
    return inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return trimmed;
}
