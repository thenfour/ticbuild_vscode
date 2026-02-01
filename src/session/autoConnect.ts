import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';

import {
    CONFIG_CONNECT_TIMEOUT_MS,
    DEFAULT_CONNECT_TIMEOUT_MS,
    TICBUILD_SESSION_DIR_REL,
    TICBUILD_SESSION_FILE_GLOB,
} from '../baseDefs';
import { RemoteSessionManager } from './RemoteSessionManager';
import { isoDateStringToDate } from '../utils';

interface TicbuildSessionRecord {
    host: string;
    port: number;
    startedAt?: string;
}

export interface AutoConnectOptions {
    context: vscode.ExtensionContext;
    session: RemoteSessionManager;
    output: vscode.OutputChannel;
    getWorkspaceRoot: () => string | undefined;
}

export function setupAutoConnectWatcher(options: AutoConnectOptions): void {
    const { context } = options;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        return;
    }

    const pattern = new vscode.RelativePattern(folder, getSessionGlob());
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    context.subscriptions.push(watcher);

    const state = {
        autoConnectedTarget: undefined as string | undefined,
        autoConnectInProgress: false,
    };

    const onChange = () => void scanAndAutoConnect(options, state);

    watcher.onDidCreate(onChange, undefined, context.subscriptions);
    watcher.onDidChange(onChange, undefined, context.subscriptions);
    watcher.onDidDelete(onChange, undefined, context.subscriptions);

    void scanAndAutoConnect(options, state);
}

export function clearAutoConnectTarget(state: { autoConnectedTarget?: string }): void {
    state.autoConnectedTarget = undefined;
}

function getSessionDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, TICBUILD_SESSION_DIR_REL);
}

function getSessionGlob(): string {
    return path.join(TICBUILD_SESSION_DIR_REL, TICBUILD_SESSION_FILE_GLOB);
}

async function loadSessionFile(filePath: string): Promise<TicbuildSessionRecord | undefined> {
    let raw: string;
    try {
        raw = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        return undefined;
    }
    let payload: unknown;
    try {
        payload = JSON.parse(raw);
    } catch (error) {
        return undefined;
    }
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }
    const data = payload as { host?: string; port?: number; startedAt?: string };
    if (!data.host || !data.port) {
        return undefined;
    }
    return {
        host: data.host,
        port: data.port,
        startedAt: data.startedAt,
    };
}

function getSessionTarget(record: TicbuildSessionRecord): string {
    return `${record.host}:${record.port}`;
}

function compareSessions(a: { startedAt: Date }, b: { startedAt: Date }): number {
    return b.startedAt.valueOf() - a.startedAt.valueOf();
}

async function scanAndAutoConnect(
    options: AutoConnectOptions,
    state: { autoConnectedTarget?: string; autoConnectInProgress: boolean },
): Promise<void> {
    const { session, output, getWorkspaceRoot } = options;
    if (state.autoConnectInProgress) {
        return;
    }
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        return;
    }
    const sessionDir = getSessionDir(workspaceRoot);
    let entries: string[] = [];
    try {
        entries = await fs.readdir(sessionDir);
    } catch (error) {
        if (state.autoConnectedTarget) {
            output.appendLine('[session] No session files found. Disconnecting.');
            session.disconnect('Auto-disconnect (session files removed)');
            state.autoConnectedTarget = undefined;
        }
        return;
    }

    const sessionFiles = entries.filter((name) =>
        new RegExp('^' + TICBUILD_SESSION_FILE_GLOB.replace('.', '\\.')
            .replace('*', '.+') + '$', 'i').test(name));

    if (sessionFiles.length === 0) {
        if (state.autoConnectedTarget) {
            output.appendLine('[session] No session files found. Disconnecting.');
            session.disconnect('Auto-disconnect (session files removed)');
            state.autoConnectedTarget = undefined;
        }
        return;
    }

    const candidates: Array<
        { filePath: string; record: TicbuildSessionRecord; startedAt: Date }> = [];

    for (const fileName of sessionFiles) {
        const filePath = path.join(sessionDir, fileName);
        const record = await loadSessionFile(filePath);
        if (!record) {
            continue;
        }
        candidates.push({
            filePath,
            record,
            startedAt: isoDateStringToDate(record.startedAt),
        });
    }

    if (candidates.length === 0) {
        return;
    }

    candidates.sort(compareSessions);

    if (session.isConnected() && !state.autoConnectedTarget) {
        return;
    }

    state.autoConnectInProgress = true;
    try {
        for (const candidate of candidates) {
            const target = getSessionTarget(candidate.record);
            if (state.autoConnectedTarget === target && session.isConnected()) {
                return;
            }

            if (session.isConnected()) {
                session.disconnect('Switching auto-session');
            }

            output.appendLine(`[session] Auto-connecting to ${target}`);
            try {
                const config = vscode.workspace.getConfiguration('tic80');
                const timeoutMs = config.get<number>(
                    CONFIG_CONNECT_TIMEOUT_MS,
                    DEFAULT_CONNECT_TIMEOUT_MS,
                );
                await session.connect(candidate.record.host, candidate.record.port, timeoutMs);
                state.autoConnectedTarget = target;
                output.appendLine(`[session] Auto-connected to ${target}`);
                return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                output.appendLine(`[session] Auto-connect failed for ${target}: ${message}`);
                try {
                    await fs.unlink(candidate.filePath);
                    output.appendLine(`[session] Removed stale session file ${candidate.filePath}`);
                } catch (unlinkError) {
                    output.appendLine(`[session] Failed to remove stale file ${candidate.filePath}`);
                }
            }
        }
    } finally {
        state.autoConnectInProgress = false;
    }
}
