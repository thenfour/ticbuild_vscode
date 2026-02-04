import * as path from 'node:path';
import * as vscode from 'vscode';

import { RemoteSessionManager } from './session/RemoteSessionManager';
import { WatchSystem } from './watches/WatchSystem';

import {
  CONFIG_CONNECT_TIMEOUT_MS,
  CONFIG_DISCOVERY_REFRESH_MS,
  CONFIG_POLL_HZ,
  CONFIG_REMOTE_HOST,
  CONFIG_REMOTE_PORT,
  CONFIG_UI_REFRESH_MS,
  DEFAULT_CONNECT_TIMEOUT_MS,
  DEFAULT_DISCOVERY_REFRESH_MS,
  DEFAULT_POLL_HZ,
  DEFAULT_REMOTE_HOST,
  DEFAULT_REMOTE_PORT,
  DEFAULT_UI_REFRESH_MS,
  OUTPUT_CHANNEL_NAME
} from './baseDefs';
import { discoverRunningInstancesBase, watchDiscoverySessionFiles } from './remoting/discovery';
import { setupAutoConnectWatcher } from './session/autoConnect';
import { formatDateDiff, formatInstanceLabel, parseHostPort } from './utils';
import { buildControlSurfaceWebviewHtml, buildControlSurfaceWebviewPayloadWithSymbols } from './views/ControlSurfaceWebview';
import { ExpressionSubscriptionMonitor } from './controlSurface/ExpressionSubscriptionMonitor';
import { PlotSubscriptionManager } from './controlSurface/PlotSubscriptionManager';
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

  let refreshTimer: NodeJS.Timeout | undefined;
  let refreshPending = false;
  let discoveryTimer: NodeJS.Timeout | undefined;
  let discoveryRefreshInFlight = false;

  const scheduleUiRefresh = () => {
    refreshPending = true;
  };

  const expressionMonitor = new ExpressionSubscriptionMonitor(
    session,
    getPollHz,
    scheduleUiRefresh,
    output,
  );

  const plotSubscriptionManager = new PlotSubscriptionManager(
    session,
    scheduleUiRefresh,
    output,
  );

  const watchSystem = new WatchSystem(
    session,
    workspaceRoot,
    output,
    scheduleUiRefresh,
  );

  const controlSurfaceMessageHandler = new ControlSurfaceMessageHandler(
    context,
    output,
    session,
    watchSystem.store,
    controlSurfaceRegistry,
    expressionMonitor,
    plotSubscriptionManager,
    STATE_KEY_SELECTED_PAGE,
  );

  let discoveredInstances: Array<{ host: string; port: number; label?: string; description?: string; detail?: string; cartPath?: string; metaTitle?: string; metaVersion?: string; startedAt?: string }> = [];

  const refreshDiscoveredInstances = async () => {
    const config = vscode.workspace.getConfiguration('tic80');
    const timeoutMs = config.get<number>(
      CONFIG_CONNECT_TIMEOUT_MS,
      DEFAULT_CONNECT_TIMEOUT_MS,
    );

    const instances = await discoverRunningInstancesBase(timeoutMs);
    discoveredInstances = instances.map((instance) => {
      const label = formatInstanceLabel({
        host: instance.host,
        port: instance.port,
        title: instance.metaTitle ?? '',
        version: instance.metaVersion ?? '',
        cartPath: instance.cartPath ?? '',
      });
      const uptime = instance.startedAt ? formatDateDiff(instance.startedAt, new Date()) : undefined;
      const description = uptime ?
        `${instance.host}:${instance.port} (${uptime})` :
        `${instance.host}:${instance.port}`;

      return {
        host: instance.host,
        port: instance.port,
        label,
        description,
        detail: instance.cartPath,
        cartPath: instance.cartPath,
        metaTitle: instance.metaTitle,
        metaVersion: instance.metaVersion,
        startedAt: instance.startedAt?.toISOString(),
      };
    });
  };

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
      plotData: plotSubscriptionManager.getSnapshot(),
      discoveredInstances,
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
        updateControlSurfaceViews();
      }
    }, intervalMs);
  };

  const updateDiscoveryRefreshTimer = () => {
    if (discoveryTimer) {
      clearInterval(discoveryTimer);
      discoveryTimer = undefined;
    }

    const intervalMs = getDiscoveryRefreshMs();
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return;
    }

    discoveryTimer = setInterval(() => {
      if (discoveryRefreshInFlight) {
        return;
      }
      discoveryRefreshInFlight = true;
      void refreshDiscoveredInstances()
        .then(() => scheduleUiRefresh())
        .catch((error) => {
          output.appendLine(`[discovery] refresh failed: ${String(error)}`);
        })
        .finally(() => {
          discoveryRefreshInFlight = false;
        });
    }, intervalMs);
  };

  updateStatus();
  updateContextKeys();
  updatePoller();
  updateUiRefreshTimer();
  updateDiscoveryRefreshTimer();
  expressionMonitor.start();
  plotSubscriptionManager.start();
  void refreshDiscoveredInstances().then(() => scheduleUiRefresh());

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
    plotSubscriptionManager.handleSessionStateChange();
  });

  context.subscriptions.push(
    watchSystem.store.onDidChange(() => scheduleUiRefresh()),
  );
  context.subscriptions.push(
    controlSurfaceRegistry.onDidChange(() => {
      scheduleUiRefresh();
    }),
  );

  const discoveryWatcherDispose = watchDiscoverySessionFiles(() => {
    void refreshDiscoveredInstances().then(() => scheduleUiRefresh());
  });

  context.subscriptions.push(
    new vscode.Disposable(() => {
      discoveryWatcherDispose();
    }),
  );

  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (discoveryTimer) {
        clearInterval(discoveryTimer);
      }
      expressionMonitor.dispose();
      plotSubscriptionManager.dispose();
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
      if (event.affectsConfiguration(`tic80.${CONFIG_DISCOVERY_REFRESH_MS}`)) {
        updateDiscoveryRefreshTimer();
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
        const manualEntry: AttachPickItem = {
          label: 'Manual entry…',
          description: 'Enter host:port or port',
          value: '__manual__',
        };
        const pick = await vscode.window.showQuickPick([manualEntry, ...options], {
          title: 'Attach to TIC-80',
          placeHolder: 'Select a TIC-80 instance or choose Manual entry…',
          ignoreFocusOut: true,
        });

        if (!pick) {
          return;
        }

        let target = pick.value;
        if (target === '__manual__') {
          const manual = await vscode.window.showInputBox({
            title: 'Attach to TIC-80',
            prompt: 'Enter host:port or port',
            placeHolder: `${defaultHost}:${defaultPort} or ${defaultPort}`,
            ignoreFocusOut: true,
          });
          if (!manual) {
            return;
          }
          target = manual.trim();
        }

        let parsed = parseHostPort(target);
        if (!parsed && /^\d+$/.test(target)) {
          const port = Number(target);
          if (Number.isFinite(port) && port > 0) {
            parsed = { host: defaultHost, port };
          }
        }
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
      async () => {
        const panels = controlSurfaceRegistry.getPanels();
        if (panels.length === 0) {
          void vscode.window.showInformationMessage('No control surface panels to remove.');
          return;
        }
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
        const targetId = pick.description;
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

function getDiscoveryRefreshMs(): number {
  const config = vscode.workspace.getConfiguration('tic80');
  const refreshMs = config.get<number>(CONFIG_DISCOVERY_REFRESH_MS, DEFAULT_DISCOVERY_REFRESH_MS);
  if (!Number.isFinite(refreshMs) || refreshMs < 0) {
    return DEFAULT_DISCOVERY_REFRESH_MS;
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

  return targets;
}

async function discoverRunningInstances(
  timeoutMs: number,
): Promise<AttachPickItem[]> {

  const instances = await discoverRunningInstancesBase(timeoutMs);

  const items: AttachPickItem[] = instances.map((instance) => {
    const label = formatInstanceLabel({
      host: instance.host,
      port: instance.port,
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
      host: instance.host,
      port: instance.port,
    };
  });

  return items;
}
