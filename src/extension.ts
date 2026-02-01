import * as vscode from 'vscode';

import { RemoteSessionManager, SessionSnapshot } from './session/RemoteSessionManager';
import { Tic80WatchesProvider, WatchNode } from './views/Tic80WatchesProvider';
import { WatchPoller } from './watches/watchPoller';
import { WatchStore } from './watches/watchStore';
import { WatchItem } from './watches/watchTypes';

import {
  CONFIG_CONNECT_TIMEOUT_MS,
  CONFIG_POLL_HZ,
  CONFIG_REMOTE_HOST,
  CONFIG_REMOTE_PORT,
  CONFIG_UI_REFRESH_MS,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_POLL_HZ,
  DEFAULT_REMOTE_HOST,
  DEFAULT_REMOTE_PORT,
  DEFAULT_UI_REFRESH_MS,
  OUTPUT_CHANNEL_NAME
} from './baseDefs';
import { discoverRunningInstancesBase } from './remoting/discovery';
import { setupAutoConnectWatcher } from './session/autoConnect';
import { formatDateDiff, formatInstanceLabel, parseHostPort } from './utils';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const statusBar =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

  const session = new RemoteSessionManager(output);
  const workspaceRoot = getWorkspaceRoot();
  const watchStore = new WatchStore(workspaceRoot, output);
  const watchProvider = new Tic80WatchesProvider(session, watchStore, output);
  let watchesWebview: vscode.WebviewPanel | undefined;

  let refreshTimer: NodeJS.Timeout | undefined;
  let refreshPending = false;

  const scheduleUiRefresh = () => {
    refreshPending = true;
  };

  const updateWatchesWebview = () => {
    if (!watchesWebview) {
      return;
    }
    watchesWebview.webview.html = buildWatchesWebviewHtml(
      session.snapshot,
      watchStore.getAll(),
    );
  };


  const poller =
    new WatchPoller(session, watchStore, output, () => scheduleUiRefresh());

  context.subscriptions.push(
    output, statusBar, session, watchStore, watchProvider, poller);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('tic80Watches', watchProvider),
  );

  statusBar.show();

  const updateStatus = () => {
    const snapshot = session.snapshot;
    if (snapshot.state === 'Connected') {
      statusBar.text = `TIC-80: Connected ${snapshot.host}:${snapshot.port}`;
      statusBar.command = 'tic80.detach';
      statusBar.tooltip =
        snapshot.lastError ? `Last error: ${snapshot.lastError}` : undefined;
    } else if (snapshot.state === 'Connecting') {
      statusBar.text = 'TIC-80: Connecting...';
      statusBar.command = 'tic80.detach';
      statusBar.tooltip = undefined;
      // } else if (snapshot.state === 'Error') {
      //   statusBar.text = 'TIC-80: Error';
      //   statusBar.command = 'tic80.attach';
      //   statusBar.tooltip =
      //     snapshot.lastError ? `Last error: ${snapshot.lastError}` : undefined;
    } else {
      statusBar.text = 'TIC-80: Disconnected';
      statusBar.command = 'tic80.attach';
      statusBar.tooltip =
        snapshot.lastError ? `Last error: ${snapshot.lastError}` : undefined;
    }
  };

  const updateContextKeys = () => {
    const connected = session.isConnected();
    void vscode.commands.executeCommand(
      'setContext', 'tic80.remote.connected', connected);
    void vscode.commands.executeCommand(
      'setContext', 'tic80.remote.disconnected', !connected);
  };

  const updatePoller = () => {
    poller.setPollHz(getPollHz());
    if (session.isConnected()) {
      poller.start();
    } else {
      poller.stop();
      watchStore.markAllStale();
      watchProvider.refresh();
    }
  };

  const updateUiRefreshTimer = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = undefined;
    }
    const intervalMs = getUiRefreshMs();
    refreshTimer = setInterval(() => {
      if (refreshPending) {
        refreshPending = false;
        watchProvider.refresh();
        updateWatchesWebview();
      }
    }, intervalMs);
  };

  updateStatus();
  updateContextKeys();
  updatePoller();
  updateUiRefreshTimer();

  setupAutoConnectWatcher({
    context,
    session,
    output,
    getWorkspaceRoot,
  });

  session.onDidChangeState(() => {
    updateStatus();
    updateContextKeys();
    updatePoller();
    watchProvider.refresh();
    updateWatchesWebview();
  });

  context.subscriptions.push(
    watchStore.onDidChange(() => scheduleUiRefresh()),
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`tic80.${CONFIG_POLL_HZ}`)) {
        updatePoller();
      }
      if (event.affectsConfiguration(`tic80.${CONFIG_UI_REFRESH_MS}`)) {
        updateUiRefreshTimer();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'tic80.attach',
      async () => {
        const config = vscode.workspace.getConfiguration('tic80');
        const defaultHost = config.get<string>(
          CONFIG_REMOTE_HOST,
          DEFAULT_REMOTE_HOST,
        );
        const defaultPort = config.get<number>(
          CONFIG_REMOTE_PORT,
          DEFAULT_REMOTE_PORT,
        );
        const timeoutMs = config.get<number>(
          CONFIG_CONNECT_TIMEOUT_MS,
          DEFAULT_CONNECT_TIMEOUT_MS,
        );

        const options =
          await getAttachTargets(defaultHost, defaultPort, timeoutMs);
        const pick = await vscode.window.showQuickPick(options, {
          title: 'Attach to TIC-80',
          placeHolder: 'Select a TIC-80 instance',
          ignoreFocusOut: true,
        });

        if (!pick) {
          return;
        }

        const target = pick.value;
        const parsed = parseHostPort(target);
        if (!parsed) {
          void vscode.window.showErrorMessage(
            `Invalid host:port selection: ${target}`);
          return;
        }

        const { host, port } = parsed;

        if (session.isConnected()) {
          const response = await vscode.window.showWarningMessage(
            'Already connected to TIC-80. Detach and connect to a new session?',
            { modal: true },
            'Detach',
          );
          if (response !== 'Detach') {
            return;
          }
          session.disconnect('User requested reconnect');
        }

        output.appendLine(`[session] Attaching to ${host}:${port}`);
        try {
          await session.connect(host, port, timeoutMs);
          output.appendLine(`[session] Connected to ${host}:${port}`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          output.appendLine(`[session] Attach failed: ${message}`);
          void vscode.window.showErrorMessage(
            `TIC-80 attach failed: ${message}`);
        }
      }),

    vscode.commands.registerCommand(
      'tic80.openWatchesWebview',
      () => {
        if (watchesWebview) {
          watchesWebview.reveal();
          updateWatchesWebview();
          return;
        }
        watchesWebview = vscode.window.createWebviewPanel(
          'tic80WatchesWebview',
          'TIC-80 Watches',
          vscode.ViewColumn.Beside,
          { enableScripts: false },
        );
        watchesWebview.onDidDispose(() => {
          watchesWebview = undefined;
        }, undefined, context.subscriptions);
        updateWatchesWebview();
      },
    ),

    vscode.commands.registerCommand(
      'tic80.detach',
      () => {
        if (!session.isConnected()) {
          return;
        }
        output.appendLine('[session] Detaching from TIC-80');
        session.disconnect('User detached');
      }),

    vscode.commands.registerCommand(
      'tic80.addWatch',
      async () => {
        const pick = await vscode.window.showQuickPick(
          [
            { label: 'Lua Global', description: 'Watch a global variable' },
            { label: 'Lua Expr', description: 'Watch a Lua expression' },
          ],
          { title: 'Add TIC-80 Watch' },
        );

        if (!pick) {
          return;
        }

        if (pick.label === 'Lua Global') {
          if (!session.isConnected()) {
            void vscode.window.showWarningMessage(
              'Connect to TIC-80 before listing globals.');
            return;
          }
          try {
            const globals = await session.listGlobals();
            if (globals.length === 0) {
              void vscode.window.showInformationMessage(
                'No globals reported by TIC-80.');
              return;
            }
            const selected = await vscode.window.showQuickPick(globals, {
              title: 'Select Lua Global',
              matchOnDetail: true,
            });
            if (!selected) {
              return;
            }
            watchStore.addGlobal(selected);
            output.appendLine(`[watch] Added global: ${selected}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(
              `Failed to list globals: ${message}`);
          }
        } else {
          const expr = await vscode.window.showInputBox({
            title: 'Lua Expression',
            prompt: 'Enter Lua expression to watch',
            ignoreFocusOut: true,
            validateInput: (value) =>
            (value.trim().length === 0 ? 'Expression is required' :
              undefined),
          });
          if (!expr) {
            return;
          }
          watchStore.addExpr(expr);
          output.appendLine(`[watch] Added expression: ${expr}`);
        }
      }),

    vscode.commands.registerCommand(
      'tic80.removeWatch',
      async (node?: WatchNode) => {
        let watchId = node?.watchId;
        if (!watchId) {
          const watches = watchStore.getAll();
          const pick = await vscode.window.showQuickPick(
            watches.map(
              (watch) => ({ label: watch.label, description: watch.id })),
            { title: 'Remove Watch' },
          );
          if (!pick) {
            return;
          }
          watchId = pick.description;
        }
        if (!watchId) {
          return;
        }
        const watch =
          watchStore.getAll().find((item) => item.id === watchId);
        if (!watch) {
          return;
        }
        watchStore.remove(watchId);
        output.appendLine(`[watch] Removed: ${watch.label}`);
      }),

    vscode.commands.registerCommand(
      'tic80.clearWatches',
      async () => {
        const response = await vscode.window.showWarningMessage(
          'Clear all TIC-80 watches?',
          { modal: true },
          'Clear',
        );
        if (response !== 'Clear') {
          return;
        }
        watchStore.clear();
        output.appendLine('[watch] Cleared all watches');
      }),

    vscode.commands.registerCommand(
      'tic80.copyWatchValue',
      async (node?: WatchNode) => {
        const watchId = node?.watchId;
        if (!watchId) {
          return;
        }
        const watch =
          watchStore.getAll().find((item) => item.id === watchId);
        if (!watch) {
          return;
        }
        const value = watch.lastValueText ?? '';
        await vscode.env.clipboard.writeText(value);
        void vscode.window.showInformationMessage(
          'Watch value copied to clipboard.');
      }),
  );
} // activate

export function deactivate(): void {
  return;
}

function buildWatchesWebviewHtml(
  snapshot: SessionSnapshot,
  watches: WatchItem[],
): string {
  const status = snapshot.state === 'Connected'
    ? `Connected ${snapshot.host}:${snapshot.port}`
    : snapshot.state === 'Connecting'
      ? 'Connecting'
      : snapshot.state === 'Error'
        ? 'Error'
        : 'Disconnected';

  const rows = watches.map((watch) => {
    const value = watch.lastError
      ? '(error)'
      : watch.stale
        ? '(stale)'
        : watch.lastValueText ?? '';
    return `<tr><td class="label">${escapeHtml(watch.label)}</td><td class="value">${escapeHtml(value)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; }
    h1 { font-size: 14px; margin: 0 0 8px 0; }
    .status { margin-bottom: 12px; color: var(--vscode-descriptionForeground); }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 6px; border-bottom: 1px solid var(--vscode-editorGroup-border); }
    .label { font-weight: 600; }
    .value { text-align: right; color: var(--vscode-descriptionForeground); }
    .empty { color: var(--vscode-descriptionForeground); font-style: italic; }
  </style>
</head>
<body>
  <h1>TIC-80 Watches</h1>
  <div class="status">${escapeHtml(status)}</div>
  ${watches.length === 0
      ? '<div class="empty">No watches.</div>'
      : `<table>${rows}</table>`}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPollHz(): number {
  const config = vscode.workspace.getConfiguration('tic80');
  const pollHz = config.get<number>(CONFIG_POLL_HZ, DEFAULT_POLL_HZ);
  return Number.isFinite(pollHz) ? pollHz : DEFAULT_POLL_HZ;
}

function getUiRefreshMs(): number {
  const config = vscode.workspace.getConfiguration('tic80');
  const refreshMs = config.get<number>(CONFIG_UI_REFRESH_MS, DEFAULT_UI_REFRESH_MS);
  if (!Number.isFinite(refreshMs) || refreshMs <= 0) {
    return DEFAULT_UI_REFRESH_MS;
  }
  return refreshMs;
}

function getWorkspaceRoot(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder?.uri.fsPath;
}

type AttachPickItem = vscode.QuickPickItem & { value: string };

async function getAttachTargets(
  defaultHost: string,
  defaultPort: number,
  timeoutMs: number,
): Promise<AttachPickItem[]> {
  const discovered = await discoverRunningInstances(timeoutMs);
  const targets: AttachPickItem[] = [...discovered];

  // const fallback = `${defaultHost}:${defaultPort}`;
  // if (!targets.some((item) => item.value === fallback)) {
  //   targets.push({
  //     label: '(manual)',
  //     description: fallback,
  //     value: fallback,
  //   });
  // }

  return targets;
}

async function discoverRunningInstances(
  timeoutMs: number,
): Promise<AttachPickItem[]> {

  const instances = await discoverRunningInstancesBase(timeoutMs);

  const items: AttachPickItem[] = instances.map((instance) => {
    const label = formatInstanceLabel({
      title: instance.metaTitle ?? '',
      version: instance.metaVersion ?? '',
      cartPath: instance.cartPath ?? '',
    });
    const uptime = instance.startedAt ? formatDateDiff(instance.startedAt, new Date()) : undefined;
    const description = uptime ?
      `${instance.host}:${instance.port} (${uptime})` :
      `${instance.host}:${instance.port}`;

    return {
      label,
      description,
      detail: instance.cartPath,
      value: `${instance.host}:${instance.port}`,
    };
  });

  return items;
}
