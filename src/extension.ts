import * as path from 'node:path';
import * as vscode from 'vscode';

import { RemoteSessionManager } from './session/RemoteSessionManager';
import { Tic80WatchesProvider, WatchNode, ControlSurfaceNode } from './views/Tic80WatchesProvider';
import { WatchPoller } from './watches/watchPoller';
import { WatchStore } from './watches/watchStore';

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
import { buildControlSurfaceWebviewHtml, buildControlSurfaceWebviewPayloadWithSymbols } from './views/ControlSurfaceWebview';
import { ControlSurfaceRegistry } from './views/ControlSurfaceRegistry';
import { ControlSurfaceSidebarProvider } from './views/ControlSurfaceSidebarProvider';
import { ensureDevtoolsSchemaForWorkspace } from './devtoolsModel';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const statusBar =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

  const session = new RemoteSessionManager(output);
  const workspaceRoot = getWorkspaceRoot();
  void ensureDevtoolsSchemaForWorkspace(workspaceRoot, output);
  const watchStore = new WatchStore(workspaceRoot, output);
  const controlSurfaceRegistry = new ControlSurfaceRegistry();
  const watchProvider =
    new Tic80WatchesProvider(session, watchStore, controlSurfaceRegistry, output);

  const handleControlSurfaceMessage = (message: { type?: string }, webview?: vscode.Webview) => {
    switch (message?.type) {
      case 'log': {
        const logMessage = (message as { message?: string }).message;
        if (logMessage) {
          output.appendLine(`[webview] ${logMessage}`);
        }
        break;
      }
      case 'addWatch':
        void vscode.commands.executeCommand('tic80.addWatch');
        break;
      case 'removeWatch':
        void vscode.commands.executeCommand('tic80.removeWatch');
        break;
      case 'clearWatches':
        void vscode.commands.executeCommand('tic80.clearWatches');
        break;
      case 'evalExpression': {
        if (!session.isConnected()) {
          const payload = message as { requestId?: string; expression?: string };
          if (webview && payload.requestId) {
            void webview.postMessage({
              type: 'evalResult',
              requestId: payload.requestId,
              error: 'Not connected to TIC-80',
            });
          }
          break;
        }
        const payload = message as { requestId?: string; expression?: string };
        if (!payload.expression || !payload.requestId) {
          break;
        }
        void (async () => {
          try {
            const result = await session.evalExpr(payload.expression!);
            output.appendLine(`[controlSurface] evalExpression: "${payload.expression}" => "${result}"`);
            if (webview) {
              void webview.postMessage({
                type: 'evalResult',
                requestId: payload.requestId,
                result,
              });
            }
          } catch (error) {
            output.appendLine(`[controlSurface] evalExpression error: ${String(error)}`);
            if (webview) {
              void webview.postMessage({
                type: 'evalResult',
                requestId: payload.requestId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        })();
        break;
      }
      case 'eval': {
        if (!session.isConnected()) {
          output.appendLine('[controlSurface] eval ignored (not connected)');
          break;
        }
        const expr = (message as { expression?: string }).expression;
        if (!expr) {
          break;
        }
        void session.evalExpr(expr).catch((error) => {
          output.appendLine(`[controlSurface] eval error: ${String(error)}`);
        });
        break;
      }
      case 'setSymbol': {
        if (!session.isConnected()) {
          output.appendLine('[controlSurface] setSymbol ignored (not connected)');
          break;
        }
        const payload = message as { symbol?: string; value?: unknown };
        if (!payload.symbol) {
          break;
        }
        const serialized = JSON.stringify(payload.value ?? null);
        const expr = `${payload.symbol} = ${serialized}`;
        output.appendLine(`[controlSurface] setSymbol: ${expr}`);
        void session.eval(expr).catch((error) => {
          output.appendLine(`[controlSurface] setSymbol error: ${String(error)}`);
        });
        break;
      }
      default:
        break;
    }
  };

  const getControlSurfacePayload = async () =>
    buildControlSurfaceWebviewPayloadWithSymbols(
      session.snapshot,
      watchStore.getAll(),
      watchStore.getControlSurfaceRoot(),
      (expr) => session.evalExpr(expr),
      getPollHz(),
      controlSurfaceRegistry.getActiveSidebarId(),
    );

  const explorerProvider = new ControlSurfaceSidebarProvider(
    context.extensionPath,
    controlSurfaceRegistry,
    getControlSurfacePayload,
    handleControlSurfaceMessage,
    'explorer',
    'explorer-sidebar',
    'Control Surface Explorer',
    'tic80ControlSurfaceExplorer',
  );

  const activityProvider = new ControlSurfaceSidebarProvider(
    context.extensionPath,
    controlSurfaceRegistry,
    getControlSurfacePayload,
    handleControlSurfaceMessage,
    'activity',
    'activity-sidebar',
    'Control Surface Activity',
    'tic80ControlSurfaceActivity',
  );

  let controlSurfaceCounter = 1;
  let panelCounter = 1;
  const explorerSidebarId = 'explorer-sidebar';
  const activitySidebarId = 'activity-sidebar';

  let refreshTimer: NodeJS.Timeout | undefined;
  let refreshPending = false;

  const scheduleUiRefresh = () => {
    refreshPending = true;
  };

  const updateControlSurfaceViews = () => {
    const payload = getControlSurfacePayload();
    for (const view of controlSurfaceRegistry.getPanels()) {
      view.panel?.webview.postMessage(payload);
    }
    explorerProvider.update();
    activityProvider.update();
  };


  const poller =
    new WatchPoller(session, watchStore, output, () => scheduleUiRefresh());

  context.subscriptions.push(
    output,
    statusBar,
    session,
    watchStore,
    watchProvider,
    poller,
    controlSurfaceRegistry,
    explorerProvider,
    activityProvider,
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('tic80Watches', watchProvider),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'tic80ControlSurfaceExplorer',
      explorerProvider,
    ),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'tic80ControlSurfaceActivity',
      activityProvider,
    ),
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
        updateControlSurfaceViews();
      }
    }, intervalMs);
  };

  updateStatus();
  updateContextKeys();
  updatePoller();
  updateUiRefreshTimer();
  void vscode.commands.executeCommand(
    'setContext',
    'tic80.controlSurfaceExplorer.visible',
    true,
  );

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
    updateControlSurfaceViews();
  });

  context.subscriptions.push(
    watchStore.onDidChange(() => scheduleUiRefresh()),
  );
  context.subscriptions.push(
    controlSurfaceRegistry.onDidChange(() => {
      watchProvider.refresh();
      updateControlSurfaceViews();
    }),
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
      'tic80.reloadDevtools',
      async () => {
        await watchStore.reloadFromDisk();
        watchProvider.refresh();
        updateControlSurfaceViews();
        void vscode.window.showInformationMessage(
          'Reloaded devtools.json.');
      },
    ),

    vscode.commands.registerCommand(
      'tic80.addPanel',
      async () => {
        const title = await vscode.window.showInputBox({
          title: 'New Control Surface Panel',
          prompt: 'Enter a panel title',
          value: `Control Surface Panel ${panelCounter}`,
          ignoreFocusOut: true,
        });
        if (!title) {
          return;
        }

        const id = `panel-${Date.now()}-${controlSurfaceCounter++}`;
        const panel = vscode.window.createWebviewPanel(
          'tic80ControlSurfacePanel',
          title,
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, 'ControlSurfaceUI', 'dist')),
            ],
          },
        );
        panelCounter += 1;
        panel.onDidDispose(() => {
          controlSurfaceRegistry.removeById(id);
        }, undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(
          (message: { type?: string }) => handleControlSurfaceMessage(message),
          undefined,
          context.subscriptions,
        );
        panel.webview.html = buildControlSurfaceWebviewHtml(
          panel.webview,
          context.extensionPath,
          'panel',
        );
        controlSurfaceRegistry.add({
          id,
          kind: 'panel',
          title,
          createdAt: Date.now(),
          panel,
        });
        updateControlSurfaceViews();
      },
    ),

    vscode.commands.registerCommand(
      'tic80.removePanel',
      async (node?: ControlSurfaceNode) => {
        const panels = controlSurfaceRegistry.getPanels();
        if (panels.length === 0) {
          void vscode.window.showInformationMessage('No control surface panels to remove.');
          return;
        }
        let targetId = node?.kind === 'panel' ? node.viewId : undefined;
        if (!targetId) {
          const panelItems: vscode.QuickPickItem[] = panels.map((panel) => ({
            label: panel.title,
            description: panel.id,
          }));
          const pick = await vscode.window.showQuickPick(
            panelItems,
            { title: 'Remove Control Surface Panel' },
          );
          if (!pick?.description) {
            return;
          }
          targetId = pick.description;
        }
        const target = controlSurfaceRegistry.getById(targetId);
        if (!target || target.kind !== 'panel') {
          return;
        }
        target.panel?.dispose();
      },
    ),

    vscode.commands.registerCommand(
      'tic80.showExplorerSidebar',
      async () => {
        if (!controlSurfaceRegistry.getById(explorerSidebarId)) {
          controlSurfaceRegistry.add({
            id: explorerSidebarId,
            kind: 'explorer',
            title: 'Control Surface Explorer',
            createdAt: Date.now(),
          });
        }
        controlSurfaceRegistry.setActiveSidebarId(explorerSidebarId);
        void vscode.commands.executeCommand(
          'setContext',
          'tic80.controlSurfaceExplorer.visible',
          true,
        );
        await explorerProvider.reveal();
        updateControlSurfaceViews();
      },
    ),

    vscode.commands.registerCommand(
      'tic80.hideExplorerSidebar',
      async () => {
        void vscode.commands.executeCommand(
          'setContext',
          'tic80.controlSurfaceExplorer.visible',
          false,
        );
        void vscode.commands.executeCommand(
          'tic80ControlSurfaceExplorer.focus',
        );
        void vscode.commands.executeCommand('workbench.action.closeView');
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
