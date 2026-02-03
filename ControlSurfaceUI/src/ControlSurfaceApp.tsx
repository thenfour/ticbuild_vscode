import React from "react";

import { Divider } from "./basic/Divider";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { Button } from "./Buttons/PushButton";
import {
  ControlSurfaceApi,
  ControlSurfaceDataSource,
  ControlSurfaceNode,
  ControlSurfaceState,
  ControlSurfaceViewKind,
} from "./defs";
import { ComponentTester } from "./ComponentTester";
import { ConnectionStateControl } from "./ConnectionStateControl";
import { Dropdown } from "./basic/Dropdown";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";
import { ControlRegistry } from "./controlRegistry";
import { PagePropertiesPanel } from "./ControlSurfacePropertiesPanels";
import { CONTROL_PATH_ROOT } from "./controlPathBase";
import { findControlPathByNode, resolveControlByPath } from "./controlPathUtils";
import { useControlSurfaceState } from "./hooks/ControlSurfaceState";
import { PropControl } from "./PropControlsBase/PropControlShell";
import { ControlSurfacePageProp, ControlSurfaceRootPageProp } from "./PropControlsAdaptors/ControlSurfacePageProp";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import { CheckboxButton } from "./Buttons/CheckboxButton";

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
  dataSource?: ControlSurfaceDataSource;
  initialState?: ControlSurfaceState;
  viewKind?: ControlSurfaceViewKind;
};

export const ControlSurfaceApp: React.FC<ControlSurfaceAppProps> = ({
  dataSource,
  //initialState: initialStateOverride,
  viewKind,
}) => {
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  const resolvedDataSource = React.useMemo(
    () => dataSource ?? createWindowMessageDataSource(),
    [dataSource],
  );

  const resolvedSelection = React.useMemo(
    () => resolveControlByPath(stateApi.state.controlSurfaceRoot, stateApi.state.selectedControlPath),
    [stateApi.state.controlSurfaceRoot, stateApi.state.selectedControlPath],
  );


  const pages = stateApi.pageOptions;
  const selectedPageId = stateApi.state.selectedPageId;
  const setSelectedPageId = stateApi.setSelectedPageId;
  const designMode = stateApi.state.designMode;
  const setDesignMode = stateApi.setDesignMode;
  const applyHostState = stateApi.applyHostState;
  const setSelectedControlPath = stateApi.setSelectedControlPath;

  React.useEffect(() => {
    if (!pages.find((page) => page.id === selectedPageId)) {
      setSelectedPageId("root");
      if (selectedPageId !== "root") {
        api?.postMessage({
          type: "setSelectedPage",
          pageId: "root",
          pageLabel: "Root",
          viewId: stateApi.state.viewId,
        });
      }
    }
  }, [stateApi.pageOptions, api, selectedPageId, stateApi.state.viewId]);

  React.useEffect(() => {
    if (stateApi.state.selectedControlPath && !resolvedSelection) {
      setSelectedControlPath(null);
    }
  }, [resolvedSelection, stateApi.state.selectedControlPath]);

  React.useEffect(() => {
    const unsubscribe = resolvedDataSource.subscribe((payload) => {
      applyHostState(payload);
    });
    return () => {
      unsubscribe?.();
    };
  }, [resolvedDataSource, applyHostState]);

  return (
    <div
      className="control-surface-app"
    // style={{
    //   padding: 12,
    //   fontFamily: "var(--vscode-font-family)",
    //   color: "var(--vscode-foreground)",
    // }}
    >
      {/* <h1 style={{ fontSize: 14, margin: "0 0 12px 0" }}>
        TIC-80 Control Surfaces
      </h1>
 */}
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

      <ConnectionStateControl
        status={stateApi.state.status}
        discoveredInstances={stateApi.state.discoveredInstances}
      />


      {/* Controls */}

      <ButtonGroup>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Page
          <Dropdown
            value={selectedPageId}
            onChange={(newValue) => {
              const selectedLabel = pages.find((page) => page.id === newValue)?.label;
              setSelectedPageId(newValue);
              api?.postMessage({
                type: "setSelectedPage",
                pageId: newValue,
                pageLabel: selectedLabel,
                viewId: stateApi.state.viewId,
              });
            }}
            options={pages.map((val => ({ label: val.label, value: val.id })))}
          />
        </label>
        <CheckboxButton
          checked={designMode}
          onChange={() => {
            setDesignMode((value) => {
              const next = !value;
              if (!next) {
                setSelectedControlPath(null);
              }
              return next;
            });
          }}
        >
          Design Mode
        </CheckboxButton>
        {designMode ? (
          <Button
            onClick={async () => {
              if (!api || selectedPageId === "root") {
                return;
              }

              // Get the page label for the confirmation message
              const pageLabel = pages.find(p => p.id === selectedPageId)?.label ?? "this page";

              const result = await api.showWarningMessage?.(
                `Are you sure you want to delete "${pageLabel}"?`,
                "Delete",
                "Cancel"
              );

              if (result !== "Delete") {
                return;
              }

              api.postMessage({
                type: "deleteControl",
                path: stateApi.activePagePath,
              });
              setSelectedPageId("root");
              api.postMessage({
                type: "setSelectedPage",
                pageId: "root",
                pageLabel: "Root",
                viewId: stateApi.state.viewId,
              });
            }}
            disabled={selectedPageId === "root"}
          >
            Delete Page
          </Button>
        ) : null}
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

      <PropControl.Root>
        {(stateApi.activePage && api) ? (
          <ControlSurfaceRootPageProp
            spec={stateApi.activePage}
            api={api}
            stateApi={stateApi}
            currentPath={stateApi.activePagePath}
            renderControl={renderControlSurfaceControl}
            options={{
              parentPath: [CONTROL_PATH_ROOT],
              onSelectPath: (path) => setSelectedControlPath(path),
              onDeletePath: (path) => {
                api?.postMessage({
                  type: "deleteControl",
                  path,
                });
                if (stateApi.state.selectedControlPath && path.join("/") === stateApi.state.selectedControlPath.join("/")) {
                  setSelectedControlPath(null);
                }
              }
            }}
          // path={stateApi.activePagePath.join("/")}
          //   spec={stateApi.activePage}
          //   api={api}
          //   stateApi={stateApi}
          //   options={{ parentPath: CONTROL_PATH_ROOT }}
          //   currentPath={stateApi.activePagePath}
          //   path={stateApi.activePagePath.join("/")}
          //   renderControl={stateApi.renderControl}

          // page={stateApi.activePage}
          // pagePath={stateApi.activePagePath}
          // onSelectPath={(path) => setSelectedControlPath(path)}
          // onDeletePath={(path) => {
          //   api?.postMessage({
          //     type: "deleteControl",
          //     path,
          //   });
          //   if (stateApi.state.selectedControlPath && path.join("/") === stateApi.state.selectedControlPath.join("/")) {
          //     setSelectedControlPath(null);
          //   }
          // }}
          />
        ) : (
          <>No active page or API not available.</>
        )}
      </PropControl.Root>

      {stateApi.state.designMode && resolvedSelection ? (
        <div className="control-surface-properties-panel">
          <div className="control-surface-properties-header">
            <div className="control-surface-properties-title">
              Selected: {resolvedSelection.node.type}
            </div>
          </div>
          <ButtonGroup>
            <Button
              onClick={() => {
                if (!stateApi.state.selectedControlPath) {
                  return;
                }
                api?.postMessage({
                  type: "deleteControl",
                  path: stateApi.state.selectedControlPath,
                });
                setSelectedControlPath(null);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                if (!stateApi.state.selectedControlPath || !resolvedSelection) {
                  return;
                }
                const nextIndex = resolvedSelection.index - 1;
                if (nextIndex < 0) {
                  return;
                }
                const nextPath = [...stateApi.state.selectedControlPath];
                nextPath[nextPath.length - 1] = `c${nextIndex}`;
                api?.postMessage({
                  type: "moveControl",
                  path: stateApi.state.selectedControlPath,
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
                if (!stateApi.state.selectedControlPath || !resolvedSelection) {
                  return;
                }
                const nextIndex = resolvedSelection.index + 1;
                if (nextIndex >= resolvedSelection.parentControls.length) {
                  return;
                }
                const nextPath = [...stateApi.state.selectedControlPath];
                nextPath[nextPath.length - 1] = `c${nextIndex}`;
                api?.postMessage({
                  type: "moveControl",
                  path: stateApi.state.selectedControlPath,
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
                        if (!stateApi.state.selectedControlPath) {
                          return;
                        }
                        api?.postMessage({
                          type: "updateControl",
                          path: stateApi.state.selectedControlPath,
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
                    if (!stateApi.state.selectedControlPath) {
                      return;
                    }
                    api?.postMessage({
                      type: "updateControl",
                      path: stateApi.state.selectedControlPath,
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
