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
import { formatDateDiff, formatInstanceLabel, IsNullOrWhitespace, parseHostPort } from './utils';
import { buildControlSurfaceWebviewHtml, buildControlSurfaceWebviewPayloadWithSymbols } from './views/ControlSurfaceWebview';
import { ControlSurfaceRegistry } from './views/ControlSurfaceRegistry';
import { ControlSurfaceSidebarProvider } from './views/ControlSurfaceSidebarProvider';
import { ensureDevtoolsSchemaForWorkspace } from './devtoolsModel';

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
      case 'setSelectedPage': {
        const payload = message as { pageId?: string; viewId?: string; pageLabel?: string };
        if (payload.pageId && payload.viewId) {
          const key = `${STATE_KEY_SELECTED_PAGE}.${payload.viewId}`;
          void context.workspaceState.update(key, payload.pageId);
          output.appendLine(`[controlSurface] Saved selected page: viewId=${payload.viewId}, pageId=${payload.pageId}, key=${key}`);
          if (payload.pageLabel && webview) {
            const panelEntry = controlSurfaceRegistry
              .getPanels()
              .find((entry) => entry.panel?.webview === webview);
            if (panelEntry?.panel) {
              const title = IsNullOrWhitespace(payload.pageLabel) ? "TIC-80" : `TIC-80: ${payload.pageLabel}`;
              panelEntry.panel.title = title;
              panelEntry.title = title;
            }
          }
        } else {
          output.appendLine(`[controlSurface] setSelectedPage missing data: pageId=${payload.pageId}, viewId=${payload.viewId}`);
        }
        break;
      }
      case 'addControl': {
        const payload = message as { parentPath?: string[]; control?: unknown };
        output.appendLine(`[controlSurface] addControl request: parentPath=${JSON.stringify(payload.parentPath)}, control=${JSON.stringify(payload.control)}`);

        if (payload.control && payload.parentPath) {
          void watchStore.addControl(payload.parentPath, payload.control as any).then(() => {
            output.appendLine('[controlSurface] addControl completed successfully');
            // Send response back to webview
            if (webview) {
              void webview.postMessage({
                type: 'log',
                message: 'Control added successfully',
              });
            }
          }).catch((error) => {
            output.appendLine(`[controlSurface] addControl failed: ${String(error)}`);
            if (webview) {
              void webview.postMessage({
                type: 'log',
                message: `Failed to add control: ${String(error)}`,
              });
            }
          });
        }
        break;
      }
      case 'updateControl': {
        const payload = message as { path?: string[]; control?: unknown };
        if (payload.path && payload.control) {
          output.appendLine(`[controlSurface] updateControl request: path=${JSON.stringify(payload.path)}`);
          void watchStore.updateControl(payload.path, payload.control as any).catch((error) => {
            output.appendLine(`[controlSurface] updateControl failed: ${String(error)}`);
          });
        }
        break;
      }
      case 'deleteControl': {
        const payload = message as { path?: string[] };
        if (payload.path) {
          output.appendLine(`[controlSurface] deleteControl request: path=${JSON.stringify(payload.path)}`);
          void watchStore.deleteControl(payload.path).catch((error) => {
            output.appendLine(`[controlSurface] deleteControl failed: ${String(error)}`);
          });
        }
        break;
      }
      case 'moveControl': {
        const payload = message as { path?: string[]; direction?: 'up' | 'down' };
        if (payload.path && payload.direction) {
          output.appendLine(`[controlSurface] moveControl request: path=${JSON.stringify(payload.path)}, direction=${payload.direction}`);
          void watchStore.moveControl(payload.path, payload.direction).catch((error) => {
            output.appendLine(`[controlSurface] moveControl failed: ${String(error)}`);
          });
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
              error: 'Not connected',
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
            //output.appendLine(`[controlSurface] evalExpression: "${payload.expression}" => "${result}"`);
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
      case 'showWarningMessage': {
        const payload = message as { requestId?: string; message?: string; items?: string[] };
        if (!payload.message || !payload.requestId) {
          break;
        }
        void (async () => {
          try {
            const result = await vscode.window.showWarningMessage(
              payload.message!,
              ...(payload.items ?? [])
            );
            if (webview) {
              void webview.postMessage({
                type: 'showWarningMessageResult',
                requestId: payload.requestId,
                result,
              });
            }
          } catch (error) {
            output.appendLine(`[controlSurface] showWarningMessage error: ${String(error)}`);
            if (webview) {
              void webview.postMessage({
                type: 'showWarningMessageResult',
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
      case 'subscribeExpression': {
        const payload = message as { expression?: string };
        if (!payload.expression) {
          break;
        }
        const current = expressionSubscriptions.get(payload.expression) ?? 0;
        expressionSubscriptions.set(payload.expression, current + 1);
        break;
      }
      case 'unsubscribeExpression': {
        const payload = message as { expression?: string };
        if (!payload.expression) {
          break;
        }
        const current = expressionSubscriptions.get(payload.expression) ?? 0;
        if (current <= 1) {
          expressionSubscriptions.delete(payload.expression);
          expressionResults.delete(payload.expression);
        } else {
          expressionSubscriptions.set(payload.expression, current - 1);
        }
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

  const getControlSurfacePayload = async (viewId?: string) => {
    await watchStore.whenReady();
    const key = viewId ? `${STATE_KEY_SELECTED_PAGE}.${viewId}` : undefined;
    const selectedPageId = key ? context.workspaceState.get<string>(key) : undefined;

    const payload = await buildControlSurfaceWebviewPayloadWithSymbols(
      session.snapshot,
      watchStore.getAll(),
      watchStore.getControlSurfaceRoot(),
      (expr) => session.evalExpr(expr),
      getPollHz(),
      getUiRefreshMs(),
      controlSurfaceRegistry.getActiveSidebarId(),
      selectedPageId,
      viewId,
    );

    return {
      ...payload,
      expressionResults: getExpressionResultsSnapshot(),
    };
  };

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

  let panelCounter = context.workspaceState.get<number>('tic80.panelCounter', 1);
  const activitySidebarId = 'activity-sidebar';

  // State persistence keys
  const STATE_KEY_PANELS = 'tic80.controlSurface.panels';
  const STATE_KEY_SELECTED_PAGE = 'tic80.controlSurface.selectedPage';

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
            (message: { type?: string }) => handleControlSurfaceMessage(message, webviewPanel.webview),
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

  const expressionSubscriptions = new Map<string, number>();
  const expressionResults = new Map<string, { value?: string; error?: string }>();
  let expressionPollTimer: NodeJS.Timeout | undefined;
  let expressionPollLast = 0;

  const getExpressionResultsSnapshot = () => (
    Object.fromEntries(expressionResults.entries())
  );

  const pollExpressions = async () => {
    if (!session.isConnected()) {
      if (expressionSubscriptions.size > 0 || expressionResults.size > 0) {
        expressionSubscriptions.clear();
        expressionResults.clear();
        scheduleUiRefresh();
      }
      return;
    }

    if (expressionSubscriptions.size === 0) {
      return;
    }

    const pollMs = Math.max(Math.floor(1000 / getPollHz()), 16);
    const now = Date.now();
    if (now - expressionPollLast < pollMs) {
      return;
    }
    expressionPollLast = now;

    const expressions = Array.from(expressionSubscriptions.keys());
    const results = await Promise.all(
      expressions.map(async (expression) => {
        try {
          const value = await session.evalExpr(expression);
          return { expression, value } as const;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { expression, error: errorMessage } as const;
        }
      }),
    );

    results.forEach((result) => {
      if ("error" in result) {
        expressionResults.set(result.expression, { error: result.error });
      } else {
        expressionResults.set(result.expression, { value: result.value });
      }
    });

    scheduleUiRefresh();
  };

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
    activityProvider,
  );

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('tic80Watches', watchProvider),
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
      scheduleUiRefresh();
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

  expressionPollTimer = setInterval(() => {
    void pollExpressions();
  }, 100);

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
    if (!session.isConnected()) {
      expressionSubscriptions.clear();
      expressionResults.clear();
    }
  });

  context.subscriptions.push(
    watchStore.onDidChange(() => scheduleUiRefresh()),
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
      if (expressionPollTimer) {
        clearInterval(expressionPollTimer);
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
          (message: { type?: string }) => handleControlSurfaceMessage(message, panel.webview),
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
