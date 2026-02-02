import React from "react";

import { Divider } from "./basic/Divider";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { Button } from "./Buttons/PushButton";
import { ControlSurfacePage } from "./ControlSurfacePage";
import {
  ControlSurfaceApi,
  ControlSurfaceDataSource,
  ControlSurfaceNode,
  ControlSurfaceState,
  ControlSurfaceViewKind,
} from "./defs";
import { ComponentTester } from "./ComponentTester";
import { Dropdown } from "./basic/Dropdown";
import { useVsCodeApi } from "./VsCodeApiContext";
import { ControlRegistry } from "./controlRegistry";
import { PagePropertiesPanel } from "./ControlSurfacePropertiesPanels";
import { CONTROL_PATH_ROOT, parseControlPathSegment } from "./controlPath";

const initialState: ControlSurfaceState = {
  status: "Disconnected",
  watches: [],
  controlSurfaceRoot: [],
};

const getWindowApi = (api: { postMessage: (message: unknown) => void } | undefined): ControlSurfaceApi | undefined => {
  if (!api) {
    return undefined;
  }

  const pendingEvaluations = new Map<string, { resolve: (value: string) => void; reject: (error: Error) => void }>();

  // Listen for evaluation responses
  window.addEventListener("message", (event: MessageEvent) => {
    const message = event.data;
    if (message.type === "evalResult" && typeof message.requestId === "string") {
      const pending = pendingEvaluations.get(message.requestId);
      if (pending) {
        pendingEvaluations.delete(message.requestId);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result ?? "");
        }
      }
    }
  });

  const wrappedApi: ControlSurfaceApi = {
    postMessage: (message: unknown) => {
      api.postMessage(message);
    },
    log: (message: string) => {
      api.postMessage({
        type: "log",
        message,
      });
    },
    evalExpression: async (expression: string): Promise<string> => {
      const requestId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return new Promise((resolve, reject) => {
        pendingEvaluations.set(requestId, { resolve, reject });

        api.postMessage({
          type: "evalExpression",
          requestId,
          expression,
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (pendingEvaluations.has(requestId)) {
            pendingEvaluations.delete(requestId);
            reject(new Error("Evaluation timeout"));
          }
        }, 5000);
      });
    },
  };

  // wrappedApi.log?.(`getWindowApi: Raw vscodeApi keys: ${Object.keys(vscodeApi).join(", ")}`);
  // wrappedApi.log?.(`getWindowApi: Wrapped API keys: ${Object.keys(wrappedApi).join(", ")}`);

  return wrappedApi;
};

const createWindowMessageDataSource = (): ControlSurfaceDataSource => ({
  subscribe: (listener) => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as ControlSurfaceState | undefined;
      if (!payload || !Array.isArray(payload.watches)) {
        return;
      }
      listener(payload);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  },
});

export type ControlSurfaceAppProps = {
  api?: ControlSurfaceApi;
  dataSource?: ControlSurfaceDataSource;
  initialState?: ControlSurfaceState;
  viewKind?: ControlSurfaceViewKind;
};

type PageOption = {
  id: string;
  label: string;
  page: Extract<ControlSurfaceNode, { type: "page" }>;
};

type ResolvedControlPath = {
  node: ControlSurfaceNode;
  parentControls: ControlSurfaceNode[];
  index: number;
};

// builds a flat list of all pages in the control surface hierarchy.
const buildPageOptions = (
  controlSurfaceRoot: ControlSurfaceNode[],
): PageOption[] => {
  const rootPage: Extract<ControlSurfaceNode, { type: "page" }> = {
    type: "page",
    label: "Root",
    controls: controlSurfaceRoot,
  };
  const pages: PageOption[] = [{ id: "root", label: "Root", page: rootPage }];

  const visit = (
    nodes: ControlSurfaceNode[],
    labelPath: string[],
    idPath: string[],
  ) => {
    nodes.forEach((node, index) => {
      if (node.type === "page") {
        const nextLabelPath = [...labelPath, node.label];
        const nextIdPath = [...idPath, `p${index}`];
        pages.push({
          id: nextIdPath.join("/"),
          label: nextLabelPath.join(" / "),
          page: node,
        });
        visit(node.controls, nextLabelPath, nextIdPath);
        return;
      }

      if (node.type === "group") {
        visit(node.controls, labelPath, [...idPath, `g${index}`]);
      }
    });
  };

  visit(controlSurfaceRoot, [], ["root"]);
  return pages;
};

const resolveControlByPath = (
  controlSurfaceRoot: ControlSurfaceNode[],
  path: string[] | null | undefined,
): ResolvedControlPath | null => {
  if (!path || path.length === 0) {
    return null;
  }

  let current: any = { controls: controlSurfaceRoot };
  let parentControls: ControlSurfaceNode[] | null = null;
  let index: number | null = null;

  for (const segment of path) {
    const parsed = parseControlPathSegment(segment);
    if (!parsed) {
      return null;
    }
    if (parsed.kind === "root") {
      continue;
    }
    if (parsed.kind === "control") {
      if (!Array.isArray(current.controls) || parsed.index < 0 || parsed.index >= current.controls.length) {
        return null;
      }
      parentControls = current.controls;
      index = parsed.index;
      current = current.controls[parsed.index];
      continue;
    }
    if (parsed.kind === "tab") {
      if (!Array.isArray(current.tabs) || parsed.index < 0 || parsed.index >= current.tabs.length) {
        return null;
      }
      current = current.tabs[parsed.index];
    }
  }

  if (parentControls && index !== null) {
    return {
      node: current as ControlSurfaceNode,
      parentControls,
      index,
    };
  }

  return null;
};

const findControlPathByNode = (
  controlSurfaceRoot: ControlSurfaceNode[],
  target: ControlSurfaceNode,
): string[] | null => {
  const visit = (nodes: ControlSurfaceNode[], path: string[]): string[] | null => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const nextPath = [...path, `c${index}`];
      if (node === target) {
        return nextPath;
      }

      if (node.type === "tabs") {
        for (let tabIndex = 0; tabIndex < node.tabs.length; tabIndex += 1) {
          const tab = node.tabs[tabIndex];
          const tabPath = [...nextPath, `t${tabIndex}`];
          const foundInTab = visit(tab.controls, tabPath);
          if (foundInTab) {
            return foundInTab;
          }
        }
      }

      if ("controls" in node && Array.isArray(node.controls)) {
        const found = visit(node.controls, nextPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  return visit(controlSurfaceRoot, [CONTROL_PATH_ROOT]);
};

export const ControlSurfaceApp: React.FC<ControlSurfaceAppProps> = ({
  api,
  dataSource,
  initialState: initialStateOverride,
  viewKind,
}) => {
  const [state, setState] = React.useState<ControlSurfaceState>(
    initialStateOverride ?? initialState,
  );
  const vsCodeApi = useVsCodeApi();
  const [selectedPageId, setSelectedPageId] = React.useState(
    initialStateOverride?.selectedPageId ?? initialState.selectedPageId ?? "root"
  );
  const [designMode, setDesignMode] = React.useState(false);
  const [selectedControlPath, setSelectedControlPath] = React.useState<string[] | null>(null);
  const resolvedApi = React.useMemo(() => {
    const result = api ?? getWindowApi(vsCodeApi ?? undefined);
    // Use postMessage to log since we might not have the log method yet
    if (result) {
      result.postMessage?.({
        type: "log",
        message: `ControlSurfaceApp: resolvedApi keys: ${Object.keys(result).join(", ")}, api prop was ${api ? "provided" : "undefined"}`,
      });
    }
    return result;
  }, [api, vsCodeApi]);

  const resolvedDataSource = React.useMemo(
    () => dataSource ?? createWindowMessageDataSource(),
    [dataSource],
  );

  const pages = React.useMemo(
    () => buildPageOptions(state.controlSurfaceRoot ?? []),
    [state.controlSurfaceRoot],
  );
  const activePage =
    pages.find((page) => page.id === selectedPageId)?.page ?? pages[0]?.page;
  const activePagePath = React.useMemo(() => {
    if (!activePage) {
      return [CONTROL_PATH_ROOT];
    }

    if (activePage.controls === state.controlSurfaceRoot) {
      return [CONTROL_PATH_ROOT];
    }

    return (
      findControlPathByNode(state.controlSurfaceRoot ?? [], activePage as ControlSurfaceNode) ??
      [CONTROL_PATH_ROOT]
    );
  }, [activePage, state.controlSurfaceRoot]);

  const resolvedSelection = React.useMemo(
    () => resolveControlByPath(state.controlSurfaceRoot ?? [], selectedControlPath),
    [state.controlSurfaceRoot, selectedControlPath],
  );

  React.useEffect(() => {
    if (!pages.find((page) => page.id === selectedPageId)) {
      setSelectedPageId("root");
    }
  }, [pages, selectedPageId]);

  React.useEffect(() => {
    if (selectedControlPath && !resolvedSelection) {
      setSelectedControlPath(null);
    }
  }, [resolvedSelection, selectedControlPath]);

  React.useEffect(() => {
    const unsubscribe = resolvedDataSource.subscribe((payload) => {
      setState({
        ...payload,
        controlSurfaceRoot: payload.controlSurfaceRoot ?? [],
      });
      // Update selected page if it's provided in the payload
      if (payload.selectedPageId) {
        setSelectedPageId(payload.selectedPageId);
      }
    });
    return () => {
      unsubscribe?.();
    };
  }, [resolvedDataSource]);

  return (
    <div
      style={{
        padding: 12,
        fontFamily: "var(--vscode-font-family)",
        color: "var(--vscode-foreground)",
      }}
    >
      <h1 style={{ fontSize: 14, margin: "0 0 12px 0" }}>
        TIC-80 Control Surfaces
      </h1>

      {/* control gallery for testing / dev */}
      <ComponentTester />

      {/* view kind */}
      {/* 
      {viewKind ? (
        <div
          style={{
            marginBottom: 8,
            color: "var(--vscode-descriptionForeground)",
            fontSize: 11,
          }}
        >
          View:{" "}
          {viewKind === "panel"
            ? "Panel"
            : viewKind === "explorer"
              ? "Explorer Sidebar"
              : "Activity Bar"}
        </div>
      ) : null} */}

      {/* system status */}

      <div
        style={{
          marginBottom: 12,
          color: "var(--vscode-descriptionForeground)",
        }}
      >
        {state.status}
      </div>
      {/* Controls */}

      <ButtonGroup>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Page
          <Dropdown
            value={selectedPageId}
            onChange={(newValue) => {
              setSelectedPageId(newValue);
              resolvedApi?.postMessage({
                type: "setSelectedPage",
                pageId: newValue,
                viewId: state.viewId
              });
            }}
            options={pages.map((val => ({ label: val.label, value: val.id })))}
          />
        </label>
        <Button
          onClick={() => {
            setDesignMode((value) => {
              const next = !value;
              if (!next) {
                setSelectedControlPath(null);
              }
              return next;
            });
          }}
          style={{ marginLeft: "auto" }}
        >
          {designMode ? "Exit Design Mode" : "Design Mode"}
        </Button>
        {/* <Divider />
        <Button onClick={() => resolvedApi?.postMessage({ type: "addWatch" })}>
          Add Watch
        </Button>
        <Button
          onClick={() => resolvedApi?.postMessage({ type: "removeWatch" })}
        >
          Remove Watch
        </Button>
        <Button
          onClick={() => resolvedApi?.postMessage({ type: "clearWatches" })}
        >
          Clear Watches
        </Button> */}
      </ButtonGroup>


      {/* main control surface body */}

      {activePage && resolvedApi && state.symbolValues && (state.uiRefreshMs ?? state.pollIntervalMs) ? (
        <ControlSurfacePage
          page={activePage}
          api={resolvedApi}
          symbolValues={state.symbolValues}
          pollIntervalMs={state.uiRefreshMs ?? state.pollIntervalMs ?? 250}
          pagePath={activePagePath}
          designMode={designMode}
          selectedPath={selectedControlPath}
          onSelectPath={(path) => setSelectedControlPath(path)}
          onDeletePath={(path) => {
            resolvedApi?.postMessage({
              type: "deleteControl",
              path,
            });
            if (selectedControlPath && path.join("/") === selectedControlPath.join("/")) {
              setSelectedControlPath(null);
            }
          }}
        />
      ) : (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            fontStyle: "italic",
            marginBottom: 12,
          }}
        >
          No controls.
        </div>
      )}

      {designMode && resolvedSelection ? (
        <div className="control-surface-properties-panel">
          <div className="control-surface-properties-header">
            <div className="control-surface-properties-title">
              Selected: {resolvedSelection.node.type}
            </div>
          </div>
          <ButtonGroup>
            <Button
              onClick={() => {
                if (!selectedControlPath) {
                  return;
                }
                resolvedApi?.postMessage({
                  type: "deleteControl",
                  path: selectedControlPath,
                });
                setSelectedControlPath(null);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                if (!selectedControlPath || !resolvedSelection) {
                  return;
                }
                const nextIndex = resolvedSelection.index - 1;
                if (nextIndex < 0) {
                  return;
                }
                const nextPath = [...selectedControlPath];
                nextPath[nextPath.length - 1] = `c${nextIndex}`;
                resolvedApi?.postMessage({
                  type: "moveControl",
                  path: selectedControlPath,
                  direction: "up",
                });
                setSelectedControlPath(nextPath);
              }}
              disabled={resolvedSelection.index === 0}
            >
              Move Up
            </Button>
            <Button
              onClick={() => {
                if (!selectedControlPath || !resolvedSelection) {
                  return;
                }
                const nextIndex = resolvedSelection.index + 1;
                if (nextIndex >= resolvedSelection.parentControls.length) {
                  return;
                }
                const nextPath = [...selectedControlPath];
                nextPath[nextPath.length - 1] = `c${nextIndex}`;
                resolvedApi?.postMessage({
                  type: "moveControl",
                  path: selectedControlPath,
                  direction: "down",
                });
                setSelectedControlPath(nextPath);
              }}
              disabled={resolvedSelection.index >= resolvedSelection.parentControls.length - 1}
            >
              Move Down
            </Button>
          </ButtonGroup>

          <div style={{ marginTop: 12 }}>
            {(() => {
              const entry = ControlRegistry.getByType(resolvedSelection.node.type);
              const PropertiesPanel = entry?.propertiesPanelComponent;
              if (!PropertiesPanel) {
                if (resolvedSelection.node.type === "page") {
                  return (
                    <PagePropertiesPanel
                      node={resolvedSelection.node}
                      onChange={(nextNode) => {
                        if (!selectedControlPath) {
                          return;
                        }
                        resolvedApi?.postMessage({
                          type: "updateControl",
                          path: selectedControlPath,
                          control: nextNode,
                        });
                      }}
                    />
                  );
                }
                return (
                  <div className="control-surface-properties-hint">
                    No editable properties for this control.
                  </div>
                );
              }
              return (
                <PropertiesPanel
                  node={resolvedSelection.node}
                  onChange={(nextNode: ControlSurfaceNode) => {
                    if (!selectedControlPath) {
                      return;
                    }
                    resolvedApi?.postMessage({
                      type: "updateControl",
                      path: selectedControlPath,
                      control: nextNode,
                    });
                  }}
                />
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* watches (maybe remove later?) */}
      {/* 
      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 12, margin: "0 0 6px 0" }}>Watches</h2>
        {state.watches.length === 0 ? (
          <div
            style={{
              color: "var(--vscode-descriptionForeground)",
              fontStyle: "italic",
            }}
          >
            No watches.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {state.watches.map((watch) => (
                <tr key={watch.id}>
                  <td style={{ padding: "4px 6px", fontWeight: 600 }}>
                    {watch.label}
                  </td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "right",
                      color: "var(--vscode-descriptionForeground)",
                    }}
                  >
                    {watch.error
                      ? "(error)"
                      : watch.stale
                        ? "(stale)"
                        : watch.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div> */}

    </div>
  );
};
