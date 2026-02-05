import React from "react";

import { ButtonGroup } from "./Buttons/ButtonGroup";
import { CheckboxButton } from "./Buttons/CheckboxButton";
import { Button } from "./Buttons/PushButton";
import { ConnectionStateControl } from "./ConnectionStateControl";
import { ControlSurfacePropertiesPanelContainer } from "./ControlSurfacePropertiesPanelContainer";
import { ControlSurfaceRootPageProp } from "./PropControlsAdaptors/ControlSurfacePageProp";
import { PropControl } from "./PropControlsBase/PropControlShell";
import { Dropdown } from "./basic/Dropdown";
import { CONTROL_PATH_ROOT, isPathEqual } from "./controlPathBase";
import { GetControlHierarchicalLabel, GetControlNodeLabel, resolveControlByPath } from "./controlPathUtils";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import {
  ControlSurfaceDataSource,
  ControlSurfaceNode,
  ControlSurfaceState,
  ControlSurfaceViewKind
} from "./defs";
import { useControlSurfaceState } from "./hooks/ControlSurfaceState";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

const createWindowMessageDataSource = (): ControlSurfaceDataSource => ({
  subscribe: (listener) => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as ControlSurfaceState | undefined;
      if (!payload || !Array.isArray(payload.watches)) {
        if (payload) {
          console.warn("[ControlSurfaceApp] Ignored payload (missing watches array)", payload);
        }
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

  const selectedPathKey = React.useMemo(
    () => (stateApi.state.selectedControlPath ? stateApi.state.selectedControlPath.join("/") : null),
    [stateApi.state.selectedControlPath],
  );

  const [draftNode, setDraftNode] = React.useState<ControlSurfaceNode | null>(null);
  const [draftDirty, setDraftDirty] = React.useState(false);
  const [draftPathKey, setDraftPathKey] = React.useState<string | null>(null);


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
    if (!resolvedSelection || !selectedPathKey) {
      setDraftNode(null);
      setDraftDirty(false);
      setDraftPathKey(null);
      return;
    }
    if (draftDirty && draftPathKey === selectedPathKey) {
      return;
    }
    setDraftNode(resolvedSelection.node);
    setDraftDirty(false);
    setDraftPathKey(selectedPathKey);
  }, [resolvedSelection, selectedPathKey, draftDirty, draftPathKey]);

  React.useEffect(() => {
    if (!designMode) {
      if (stateApi.state.selectedControlPath) {
        setSelectedControlPath(null);
      }
      if (stateApi.state.moveDestinationPath) {
        stateApi.setMoveDestinationPath(null);
      }
    }
  }, [designMode, stateApi.state.selectedControlPath, stateApi.state.moveDestinationPath, setSelectedControlPath, stateApi]);

  const handleApplyDraft = React.useCallback(() => {
    if (!draftNode || !stateApi.state.selectedControlPath) {
      return;
    }
    api?.postMessage({
      type: "updateControl",
      path: stateApi.state.selectedControlPath,
      control: draftNode,
    });
    setDraftDirty(false);
  }, [api, draftNode, stateApi.state.selectedControlPath]);

  const handleCancelDraft = React.useCallback(() => {
    //console.log("handleCancelDraft");
    // if (!resolvedSelection) {
    //   return;
    // }
    setDraftNode(null);
    setDraftDirty(false);
    setDraftPathKey(null);
    stateApi.setSelectedControlPath(null);
    // setDraftNode(resolvedSelection.node);
    // setDraftDirty(false);
  }, [draftNode, resolvedSelection]);

  React.useEffect(() => {
    const unsubscribe = resolvedDataSource.subscribe((payload) => {
      applyHostState(payload);
    });
    return () => {
      unsubscribe?.();
    };
  }, [resolvedDataSource, applyHostState]);

  const isMoveDestination = isPathEqual(stateApi.activePagePath, stateApi.state.moveDestinationPath);

  return (
    <div
      className="control-surface-app"
    >

      <ConnectionStateControl
        connectionState={stateApi.state.connectionState}
        statusText={stateApi.state.statusText}
        connectedInstance={stateApi.state.connectedInstance}
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
            setDesignMode((value) => !value);
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
                `Are you sure you want to delete page "${pageLabel}" at ${GetControlHierarchicalLabel(stateApi.state.controlSurfaceRoot, stateApi.activePagePath)}?`,
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
            isMoveDestination={isMoveDestination}
            onSetMoveDestination={() => {
              if (isMoveDestination) {
                stateApi.setMoveDestinationPath(null);
              } else {
                stateApi.setMoveDestinationPath(stateApi.activePagePath);
              }
            }}
            options={{
              parentPath: [CONTROL_PATH_ROOT], // hm i think this is not correct; pages can be ANYWHERE in the hierarchy.
              onSelectPath: (path) => {
                setSelectedControlPath(path);
              },
              onDeletePath: async (path) => {
                const nodeLabel = GetControlHierarchicalLabel(stateApi.state.controlSurfaceRoot, path);
                const userChoice = await api?.showWarningMessage(`Are you sure you want to delete control "${nodeLabel}"?`, "Delete", "Cancel");
                if (userChoice !== "Delete") {
                  return;
                }
                api?.postMessage({
                  type: "deleteControl",
                  path,
                });
                if (stateApi.state.selectedControlPath && isPathEqual(path, stateApi.state.selectedControlPath)) {
                  setSelectedControlPath(null);
                }
              }
            }}
          />
        ) : (
          <>No active page or API not available.</>
        )}
      </PropControl.Root>

      <ControlSurfacePropertiesPanelContainer
        resolvedSelection={resolvedSelection}
        draftNode={draftNode}
        draftDirty={draftDirty}
        setDraftNode={setDraftNode}
        setDraftDirty={setDraftDirty}
        handleApplyDraft={handleApplyDraft}
        handleCancelDraft={handleCancelDraft}
        api={api}
        stateApi={stateApi}
        setSelectedControlPath={setSelectedControlPath}
      />

    </div>
  );
};
