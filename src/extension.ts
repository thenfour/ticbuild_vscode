import * as path from 'node:path';
import * as vscode from 'vscode';

import { RemoteSessionManager } from './session/RemoteSessionManager';
import { WatchSystem } from './watches/WatchSystem';

import {
  CONFIG_CONNECT_TIMEOUT_MS,
  CONFIG_CONTROL_SURFACE_ENABLED,
  CONFIG_DEVTOOLS_AUTO_CONFIGURE_SCHEMA,
  CONFIG_DISCOVERY_REFRESH_MS,
  CONFIG_LANGUAGE_ENABLED,
  CONFIG_POLL_HZ,
  CONFIG_REMOTE_AUTO_CONNECT,
  CONFIG_REMOTE_DISCOVERY_ENABLED,
  CONFIG_REMOTE_HOST,
  CONFIG_REMOTE_PORT,
  CONFIG_REMOTE_SHOW_STATUS_BAR,
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
import { buildControlSurfaceWebviewHtml, buildControlSurfaceWebviewPayload } from './views/ControlSurfaceWebview';
import { ExpressionSubscriptionMonitor } from './controlSurface/ExpressionSubscriptionMonitor';
import { PlotSubscriptionManager } from './controlSurface/PlotSubscriptionManager';
import { ControlSurfaceRegistry } from './views/ControlSurfaceRegistry';
import { ControlSurfaceSidebarProvider } from './views/ControlSurfaceSidebarProvider';
import { ensureDevtoolsSchemaForWorkspace } from './devtoolsModel';
import { ControlSurfaceMessageHandler } from './controlSurface/ControlSurfaceMessageHandler';
import { SymbolIndexManager } from './language/SymbolIndexManager';
import { Tic80SignatureHelpProvider } from './language/Tic80SignatureHelpProvider';
import { Tic80CompletionProvider } from './language/Tic80CompletionProvider';
import { Tic80HoverProvider } from './language/Tic80HoverProvider';
import { Tic80DefinitionProvider } from './language/Tic80DefinitionProvider';
import { Tic80DocumentSymbolProvider } from './language/Tic80DocumentSymbolProvider';

function generatePanelId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = getWorkspaceRoot();
  let output: vscode.OutputChannel | undefined;
  let symbolIndexManager: SymbolIndexManager | undefined;
  let controlSurfaceFeatures: ControlSurfaceFeatures | undefined;

  const getOutput = (): vscode.OutputChannel => {
    if (!output) {
      output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    }
    return output;
  };

  context.subscriptions.push(new vscode.Disposable(() => {
    output?.dispose();
    output = undefined;
  }));

  const luaSelector: vscode.DocumentSelector = { language: 'lua' };
  const languageProviderDisposables: vscode.Disposable[] = [];

  const disposeLanguageFeatures = (): void => {
    while (languageProviderDisposables.length > 0) {
      languageProviderDisposables.pop()?.dispose();
    }
    symbolIndexManager?.dispose();
    symbolIndexManager = undefined;
  };

  const registerLanguageProviders = (): void => {
    while (languageProviderDisposables.length > 0) {
      languageProviderDisposables.pop()?.dispose();
    }

    const config = vscode.workspace.getConfiguration('tic80');
    const languageEnabled = config.get<boolean>(CONFIG_LANGUAGE_ENABLED, true);
    const enableSignature = config.get<boolean>('language.signatureHelp', true);
    const enableCompletion = config.get<boolean>('language.completion', true);
    const enableHover = config.get<boolean>('language.hover', true);
    const enableDefinition = config.get<boolean>('language.definition', true);
    const enableDocumentSymbols = config.get<boolean>('language.documentSymbols', true);

    const anyProviderEnabled = enableSignature
      || enableCompletion
      || enableHover
      || enableDefinition
      || enableDocumentSymbols;

    if (!languageEnabled || !anyProviderEnabled) {
      symbolIndexManager?.dispose();
      symbolIndexManager = undefined;
      return;
    }

    if (!symbolIndexManager) {
      symbolIndexManager = new SymbolIndexManager(getOutput(), workspaceRoot);
      void symbolIndexManager.initialize();
    }

    if (enableSignature) {
      languageProviderDisposables.push(
        vscode.languages.registerSignatureHelpProvider(
          luaSelector,
          new Tic80SignatureHelpProvider(symbolIndexManager),
          '(', ','
        )
      );
    }
    if (enableCompletion) {
      languageProviderDisposables.push(
        vscode.languages.registerCompletionItemProvider(
          luaSelector,
          new Tic80CompletionProvider(symbolIndexManager)
        )
      );
    }
    if (enableHover) {
      languageProviderDisposables.push(
        vscode.languages.registerHoverProvider(
          luaSelector,
          new Tic80HoverProvider(symbolIndexManager)
        )
      );
    }
    if (enableDefinition) {
      const definitionProvider = new Tic80DefinitionProvider(symbolIndexManager);
      languageProviderDisposables.push(
        vscode.languages.registerDefinitionProvider(
          luaSelector,
          definitionProvider
        )
      );
      languageProviderDisposables.push(
        vscode.languages.registerDeclarationProvider(
          luaSelector,
          definitionProvider
        )
      );
    }
    if (enableDocumentSymbols) {
      languageProviderDisposables.push(
        vscode.languages.registerDocumentSymbolProvider(
          luaSelector,
          new Tic80DocumentSymbolProvider(symbolIndexManager)
        )
      );
    }

  };

  registerLanguageProviders();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tic80.language')) {
        registerLanguageProviders();
      }
    })
  );
  context.subscriptions.push(new vscode.Disposable(disposeLanguageFeatures));

  const updateControlSurfaceFeatures = (): void => {
    if (getBooleanConfig(CONFIG_CONTROL_SURFACE_ENABLED, true)) {
      if (!controlSurfaceFeatures) {
        controlSurfaceFeatures = activateControlSurfaceFeatures(
          context,
          getOutput(),
          workspaceRoot,
        );
      }
      return;
    }

    if (controlSurfaceFeatures) {
      controlSurfaceFeatures.closePanels();
      controlSurfaceFeatures.dispose();
      controlSurfaceFeatures = undefined;
    }
  };

  updateControlSurfaceFeatures();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`tic80.${CONFIG_CONTROL_SURFACE_ENABLED}`)) {
        updateControlSurfaceFeatures();
      }
    }),
    new vscode.Disposable(() => {
      controlSurfaceFeatures?.dispose();
      controlSurfaceFeatures = undefined;
    }),
  );
}

interface ControlSurfaceFeatures extends vscode.Disposable {
  closePanels(): void;
}

function activateControlSurfaceFeatures(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string | undefined,
): ControlSurfaceFeatures {
  const subscriptions: vscode.Disposable[] = [];
  const statusBar =
    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  const session = new RemoteSessionManager(output);
  const controlSurfaceRegistry = new ControlSurfaceRegistry();

  if (getBooleanConfig(CONFIG_DEVTOOLS_AUTO_CONFIGURE_SCHEMA, true)) {
    void ensureDevtoolsSchemaForWorkspace(workspaceRoot, output);
  }

  // State persistence keys
  const STATE_KEY_PANELS = 'tic80.controlSurface.panels';
  const STATE_KEY_SELECTED_PAGE = 'tic80.controlSurface.selectedPage';


  let panelCounter = context.workspaceState.get<number>('tic80.panelCounter', 1);
  const activitySidebarId = 'activity-sidebar';

  // Register webview panel serializer for proper persistence across sessions
  subscriptions.push(
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
          }, undefined, subscriptions);

          webviewPanel.webview.onDidReceiveMessage(
            (message: { type?: string }) => controlSurfaceMessageHandler.handleMessage(message, webviewPanel.webview),
            undefined,
            subscriptions,
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
    if (!getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
      discoveredInstances = [];
      return;
    }

    const config = vscode.workspace.getConfiguration('tic80');
    const timeoutMs = config.get<number>(
      CONFIG_CONNECT_TIMEOUT_MS,
      DEFAULT_CONNECT_TIMEOUT_MS,
    );

    const instances = await discoverRunningInstancesBase(timeoutMs);
    if (!getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
      discoveredInstances = [];
      return;
    }
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

    const payload = buildControlSurfaceWebviewPayload(
      session.snapshot,
      watchSystem.store.getAll(),
      watchSystem.store.getControlSurfaceRoot(),
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


  subscriptions.push(
    statusBar,
    session,
    watchSystem,
    controlSurfaceRegistry,
    activityProvider,
  );

  subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'tic80ControlSurfaceActivity',
      activityProvider,
    ),
  );

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

  const updateStatusBarVisibility = () => {
    if (getBooleanConfig(CONFIG_REMOTE_SHOW_STATUS_BAR, true)) {
      updateStatus();
      statusBar.show();
    } else {
      statusBar.hide();
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

    if (!getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
      return;
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

  let autoConnectDisposable: vscode.Disposable | undefined;
  let discoveryWatcherDispose: (() => void) | undefined;

  const updateAutoConnectWatcher = () => {
    autoConnectDisposable?.dispose();
    autoConnectDisposable = undefined;

    if (getBooleanConfig(CONFIG_REMOTE_AUTO_CONNECT, true)) {
      autoConnectDisposable = setupAutoConnectWatcher({
        session,
        output,
        getWorkspaceRoot,
      });
    }
  };

  const updateDiscoveryWatcher = () => {
    discoveryWatcherDispose?.();
    discoveryWatcherDispose = undefined;

    if (getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
      discoveryWatcherDispose = watchDiscoverySessionFiles(() => {
        void refreshDiscoveredInstances().then(() => scheduleUiRefresh());
      });
    }
  };

  updateStatusBarVisibility();
  updateContextKeys();
  updatePoller();
  updateUiRefreshTimer();
  updateDiscoveryRefreshTimer();
  updateDiscoveryWatcher();
  updateAutoConnectWatcher();
  expressionMonitor.start();
  plotSubscriptionManager.start();
  if (getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
    void refreshDiscoveredInstances().then(() => scheduleUiRefresh());
  }

  subscriptions.push(session.onDidChangeState(() => {
    updateStatusBarVisibility();
    updateContextKeys();
    updatePoller();
    scheduleUiRefresh();
    expressionMonitor.handleSessionStateChange();
    plotSubscriptionManager.handleSessionStateChange();
  }));

  subscriptions.push(
    watchSystem.store.onDidChange(() => scheduleUiRefresh()),
  );
  subscriptions.push(
    controlSurfaceRegistry.onDidChange(() => {
      scheduleUiRefresh();
    }),
  );

  subscriptions.push(
    new vscode.Disposable(() => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (discoveryTimer) {
        clearInterval(discoveryTimer);
      }
      expressionMonitor.dispose();
      plotSubscriptionManager.dispose();
      autoConnectDisposable?.dispose();
      discoveryWatcherDispose?.();
    }),
  );

  subscriptions.push(
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
      if (event.affectsConfiguration(`tic80.${CONFIG_REMOTE_AUTO_CONNECT}`)) {
        updateAutoConnectWatcher();
      }
      if (event.affectsConfiguration(`tic80.${CONFIG_REMOTE_DISCOVERY_ENABLED}`)) {
        discoveredInstances = [];
        updateDiscoveryRefreshTimer();
        updateDiscoveryWatcher();
        if (getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
          void refreshDiscoveredInstances().then(() => scheduleUiRefresh());
        } else {
          scheduleUiRefresh();
        }
      }
      if (event.affectsConfiguration(`tic80.${CONFIG_REMOTE_SHOW_STATUS_BAR}`)) {
        updateStatusBarVisibility();
      }
      if (
        event.affectsConfiguration(`tic80.${CONFIG_DEVTOOLS_AUTO_CONFIGURE_SCHEMA}`)
        && getBooleanConfig(CONFIG_DEVTOOLS_AUTO_CONFIGURE_SCHEMA, true)
      ) {
        void ensureDevtoolsSchemaForWorkspace(workspaceRoot, output);
      }
    }),
  );

  subscriptions.push(
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
        }, undefined, subscriptions);
        panel.webview.onDidReceiveMessage(
          (message: { type?: string }) => controlSurfaceMessageHandler.handleMessage(message, panel.webview),
          undefined,
          subscriptions,
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

  let disposed = false;
  return {
    closePanels: () => {
      for (const panel of controlSurfaceRegistry.getPanels()) {
        panel.panel?.dispose();
      }
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      while (subscriptions.length > 0) {
        subscriptions.pop()?.dispose();
      }
      void vscode.commands.executeCommand('setContext', 'tic80.remote.connected', false);
      void vscode.commands.executeCommand('setContext', 'tic80.remote.disconnected', false);
    },
  };
}

export function deactivate(): void {
  return;
}

function getBooleanConfig(key: string, fallback: boolean): boolean {
  return vscode.workspace.getConfiguration('tic80').get<boolean>(key, fallback);
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
  if (!getBooleanConfig(CONFIG_REMOTE_DISCOVERY_ENABLED, true)) {
    return [];
  }

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
