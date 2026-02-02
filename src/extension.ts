import * as path from 'node:path';
import * as vscode from 'vscode';

import { RemoteSessionManager } from './session/RemoteSessionManager';
import { WatchNode, ControlSurfaceNode } from './views/Tic80WatchesProvider';
import { WatchSystem } from './watches/WatchSystem';

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
import { ExpressionSubscriptionMonitor } from './controlSurface/ExpressionSubscriptionMonitor';
import { ControlSurfaceRegistry } from './views/ControlSurfaceRegistry';
import { ControlSurfaceSidebarProvider } from './views/ControlSurfaceSidebarProvider';
import { ensureDevtoolsSchemaForWorkspace } from './devtoolsModel';
import { ControlSurfaceMessageHandler } from './controlSurface/ControlSurfaceMessageHandler';

function generatePanelId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const statusBar =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

  const session = new RemoteSessionManager(output);
  const workspaceRoot = getWorkspaceRoot();
  void ensureDevtoolsSchemaForWorkspace(workspaceRoot, output);
  const controlSurfaceRegistry = new ControlSurfaceRegistry();

  // State persistence keys
  const STATE_KEY_PANELS = 'tic80.controlSurface.panels';
  const STATE_KEY_SELECTED_PAGE = 'tic80.controlSurface.selectedPage';


  let panelCounter = context.workspaceState.get<number>('tic80.panelCounter', 1);
  const activitySidebarId = 'activity-sidebar';

  // Register webview panel serializer for proper persistence across sessions
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer('tic80ControlSurfacePanel', {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any): Promise<void> {
        try {
          // If state is missing, this is first-time deserialization
          // Generate a new stable ID that will be saved
          const id = state?.id ?? generatePanelId();
          const title = state?.title ?? webviewPanel.title ?? 'Control Surface';
          const createdAt = state?.createdAt ?? Date.now();
          const panelIconPath = vscode.Uri.file(
            path.join(context.extensionPath, 'resources', 'desktop-classic-blue.svg'),
          );

          webviewPanel.iconPath = panelIconPath;

          webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, 'ControlSurfaceUI', 'dist')),
            ],
          };

          webviewPanel.onDidDispose(() => {
            controlSurfaceRegistry.removeById(id);
          }, undefined, context.subscriptions);

          webviewPanel.webview.onDidReceiveMessage(
            (message: { type?: string }) => controlSurfaceMessageHandler.handleMessage(message, webviewPanel.webview),
            undefined,
            context.subscriptions,
          );

          webviewPanel.webview.html = buildControlSurfaceWebviewHtml(
            webviewPanel.webview,
            context.extensionPath,
            'panel',
          );

          controlSurfaceRegistry.add({
            id,
            kind: 'panel',
            title,
            createdAt,
            panel: webviewPanel,
          });

          // Save state immediately so it's available on next reload
          // Must happen after HTML is set but before sending payload
          const stateToSave = { id, title, createdAt };
          setTimeout(() => {
            void webviewPanel.webview.postMessage({
              type: '__setState',
              state: stateToSave,
            });
          }, 100);

          // Send initial payload after HTML is set
          const payload = await getControlSurfacePayload(id);
          void webviewPanel.webview.postMessage(payload);
        } catch (error) {
          output.appendLine(`[controlSurface] Error deserializing panel: ${String(error)}`);
          throw error;
        }
      },
    }),
  );

  const savePanelsState = async () => {
    // No longer needed - VS Code handles this through serializer
  };

  let refreshTimer: NodeJS.Timeout | undefined;
  let refreshPending = false;

  const scheduleUiRefresh = () => {
    refreshPending = true;
  };

  const expressionMonitor = new ExpressionSubscriptionMonitor(
    session,
    getPollHz,
    scheduleUiRefresh,
    output,
  );

  const watchSystem = new WatchSystem(
    session,
    workspaceRoot,
    output,
    controlSurfaceRegistry,
    scheduleUiRefresh,
  );

  const controlSurfaceMessageHandler = new ControlSurfaceMessageHandler(
    context,
    output,
    session,
    watchSystem.store,
    controlSurfaceRegistry,
    expressionMonitor,
    STATE_KEY_SELECTED_PAGE,
  );

  const getControlSurfacePayload = async (viewId?: string) => {
    await watchSystem.store.whenReady();
    const key = viewId ? `${STATE_KEY_SELECTED_PAGE}.${viewId}` : undefined;
    const selectedPageId = key ? context.workspaceState.get<string>(key) : undefined;

    const payload = await buildControlSurfaceWebviewPayloadWithSymbols(
      session.snapshot,
      watchSystem.store.getAll(),
      watchSystem.store.getControlSurfaceRoot(),
      (expr) => session.evalExpr(expr),
      getPollHz(),
      getUiRefreshMs(),
      controlSurfaceRegistry.getActiveSidebarId(),
      selectedPageId,
      viewId,
    );

    return {
      ...payload,
      expressionResults: expressionMonitor.getResultsSnapshot(),
    };
  };

  const activityProvider = new ControlSurfaceSidebarProvider(
    context.extensionPath,
    controlSurfaceRegistry,
    getControlSurfacePayload,
    (message, webview) => controlSurfaceMessageHandler.handleMessage(message, webview),
    'activity',
    'activity-sidebar',
    'Control Surface Activity',
    'tic80ControlSurfaceActivity',
  );

  const updateControlSurfaceViews = async () => {
    // Update each panel with its own state
    for (const view of controlSurfaceRegistry.getPanels()) {
      if (view.panel?.webview) {
        const payload = await getControlSurfacePayload(view.id);
        void view.panel.webview.postMessage(payload);
      }
    }
    // Update sidebars
    void activityProvider.update();
  };


  context.subscriptions.push(
    output,
    statusBar,
    session,
    watchSystem,
    controlSurfaceRegistry,
    activityProvider,
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('tic80Watches', watchSystem.provider),
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
    watchSystem.setPollHz(getPollHz());
    watchSystem.handleSessionStateChange();
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
        watchSystem.provider.refresh();
        updateControlSurfaceViews();
      }
    }, intervalMs);
  };

  updateStatus();
  updateContextKeys();
  updatePoller();
  updateUiRefreshTimer();
  expressionMonitor.start();

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
    scheduleUiRefresh();
    expressionMonitor.handleSessionStateChange();
  });

  context.subscriptions.push(
    watchSystem.store.onDidChange(() => scheduleUiRefresh()),
  );
  context.subscriptions.push(
    controlSurfaceRegistry.onDidChange(() => {
      scheduleUiRefresh();
    }),
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      expressionMonitor.dispose();
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
        await watchSystem.store.reloadFromDisk();
        watchSystem.provider.refresh();
        updateControlSurfaceViews();
        void vscode.window.showInformationMessage(
          'Reloaded devtools.json.');
      },
    ),

    vscode.commands.registerCommand(
      'tic80.addPanel',
      async () => {
        // const title = await vscode.window.showInputBox({
        //   title: 'New TIC-80 Control Surface Panel',
        //   prompt: 'Enter a panel title',
        //   value: `TIC-80`,
        //   ignoreFocusOut: true,
        // });
        // if (!title) {
        //   return;
        // }
        const title = `TIC-80`;

        const id = generatePanelId();
        const createdAt = Date.now();
        const panelIconPath = vscode.Uri.file(
          path.join(context.extensionPath, 'resources', 'desktop-classic-blue.svg'),
        );

        const panel = vscode.window.createWebviewPanel(
          'tic80ControlSurfacePanel',
          title,
          vscode.ViewColumn.Active,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(path.join(context.extensionPath, 'ControlSurfaceUI', 'dist')),
            ],
          },
        );
        panel.iconPath = panelIconPath;
        panelCounter += 1;

        panel.onDidDispose(() => {
          controlSurfaceRegistry.removeById(id);
        }, undefined, context.subscriptions);
        panel.webview.onDidReceiveMessage(
          (message: { type?: string }) => controlSurfaceMessageHandler.handleMessage(message, panel.webview),
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
          createdAt,
          panel,
        });

        // Send initial payload to populate the control surface
        const payload = await getControlSurfacePayload(id);
        void panel.webview.postMessage(payload);

        // Save state for serialization after webview is ready
        // Use setTimeout to ensure the webview message handler is set up
        setTimeout(() => {
          void panel.webview.postMessage({
            type: '__setState',
            state: { id, title, createdAt },
          });
          //output.appendLine(`[controlSurface] Sent __setState for panel: ${id}`);
        }, 500);

        void updateControlSurfaceViews();
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
            watchSystem.store.addGlobal(selected);
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
          watchSystem.store.addExpr(expr);
          output.appendLine(`[watch] Added expression: ${expr}`);
        }
      }),

    vscode.commands.registerCommand(
      'tic80.removeWatch',
      async (node?: WatchNode) => {
        let watchId = node?.watchId;
        if (!watchId) {
          const watches = watchSystem.store.getAll();
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
          watchSystem.store.getAll().find((item) => item.id === watchId);
        if (!watch) {
          return;
        }
        watchSystem.store.remove(watchId);
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
        watchSystem.store.clear();
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
          watchSystem.store.getAll().find((item) => item.id === watchId);
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
