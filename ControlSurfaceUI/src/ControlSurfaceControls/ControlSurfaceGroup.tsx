/*
{
      type: "group";
      label: string;
      orientation?: "horizontal" | "vertical";
      controls: ControlSurfaceNode[];
    };

*/

import React from "react";
import { DndContainer, DndDraggable } from "../dnd";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { ControlSurfaceGroupSpec, ControlSurfaceApi, ControlSurfaceColumnSpec, ControlSurfaceRowSpec } from "../defs";
import type { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { AddControlControl } from "../AddControlControl";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { ControlSurfaceStateApi, useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools, createPropControlClasses } from "../utils/designTools";
import { buildControlPath } from "../controlPathBase";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { collectSymbolsForNodes, copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";


export interface ControlSurfaceGroupBaseProps {
  label?: string;
  //orientation?: "horizontal" | "vertical";
  designMode: boolean;
  selected: boolean;
  designTools?: React.ReactNode;
  copyTools?: React.ReactNode;
  children?: React.ReactNode;
  isMoveDestination: boolean;
  open?: boolean;
}


export const ControlSurfaceGroupBase: React.FC<ControlSurfaceGroupBaseProps> = ({
  label,
  //orientation = "horizontal",
  designMode,
  selected,
  designTools,
  copyTools,
  children,
  isMoveDestination,
  open: openProp,
}) => {

  const [open, setOpen] = React.useState(true);
  const isOpen = openProp !== undefined ? openProp : open;


  return (
    <div className={createPropControlClasses({
      designMode: !!designMode,
      selected: selected,
      disabled: false,
      isMoveDestination,
      additionalClasses: "cs-pp-control-group cs-pp-control-container"
    })}>

      {/* <legend className="control-surface-group-label">{label}</legend> */}
      {designMode && designTools ? (
        <ButtonGroup className="cs-pp-design-tools">
          {designTools}
        </ButtonGroup>
      ) : null}
      {!designMode && isOpen && copyTools ? (
        <ButtonGroup className="cs-pp-copy-tools">
          {copyTools}
        </ButtonGroup>
      ) : null}

      <div onClick={() => setOpen(b => !b)} className="cs-pp-group-label">{label}</div>
      {isOpen && <div className="cs-pp-group-expanded-content">{/* shall hold controls like a column. */}
        {children}
      </div>
      }
    </div>
  );


};

type Spec = Omit<ControlSurfaceGroupSpec, "type">;

export interface ControlSurfaceGroupProps extends Spec {
  layout: "group" | "column" | "row";
  renderControl: (
    node: any,
    index: number,
    api: ControlSurfaceApi,
    stateApi: ControlSurfaceStateApi,
    options: ControlSurfaceRenderOptions,
  ) => JSX.Element;
  parentPath?: string[];
  onSelectPath?: (path: string[], node: any) => void;
  onDeletePath?: (path: string[], node: any) => void;
  onSetMoveDestination: (pathOverride?: string[]) => void;
  onMoveToDestination?: () => void;
  isMoveDestination: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
}

export const ControlSurfaceGroup: React.FC<ControlSurfaceGroupProps> = ({
  label,
  //orientation,
  layout,
  controls,
  renderControl,

  //symbolValues,
  //pollIntervalMs,
  parentPath = [],
  //designMode,
  //selectedPath,
  onSelectPath,
  onDeletePath,
  onDelete,
  onSettings,
  onMoveToDestination,
  onSetMoveDestination,
  isMoveDestination
}) => {
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  if (!api) {
    return null;
  }

  const designTools = stateApi.state.designMode
    ? createDesignTools({
      onDelete,
      onSettings,
      onSetMoveDestination: onSetMoveDestination,
      onMoveToDestination: onMoveToDestination,
    })
    : null;

  const symbols = React.useMemo(() => collectSymbolsForNodes(controls), [controls]);

  const handleCopy = React.useCallback(() => {
    void copyLuaAssignmentsToClipboard(
      symbols,
      stateApi.state.expressionResults ?? {},
      api?.showWarningMessage,
    );
  }, [api?.showWarningMessage, stateApi.state.expressionResults, symbols]);

  const copyTools = !stateApi.state.designMode
    ? <PropControl.CopyButton onClick={handleCopy} />
    : null;

  const selected = JSON.stringify(stateApi.state.selectedControlPath) === JSON.stringify(parentPath);

  const handleDrop = React.useCallback((dropResult: any) => {
    if (!api || !stateApi.state.designMode) {
      return;
    }
    const { addedIndex, payload } = dropResult;
    if (addedIndex === null || addedIndex === undefined) {
      return;
    }
    const sourcePath = (payload as { sourcePath?: string[] } | undefined)?.sourcePath;
    if (!sourcePath) {
      return;
    }
    api.postMessage({
      type: "reorderControl",
      sourcePath,
      targetParentPath: parentPath,
      targetIndex: addedIndex,
    });
  }, [api, parentPath, stateApi.state.designMode]);

  const shouldAcceptDrop = React.useCallback(() => stateApi.state.designMode, [stateApi.state.designMode]);

  const dndOrientation = layout === "row" ? "horizontal" : "vertical";

  //console.log(`group label:${label} withparentpath:`, parentPath, " selected:", selected, " state selected:", stateApi.state.selectedControlPath);

  const content = (
    <>
      <DndContainer
        groupName="control-surface-controls"
        orientation={dndOrientation}
        disabled={!stateApi.state.designMode}
        shouldAcceptDrop={shouldAcceptDrop}
        dragHandleSelector=".cs-dnd-handle"
        onDrop={handleDrop}
        getChildPayload={(index: number) => ({ sourcePath: buildControlPath(parentPath, index) })}
        dropPlaceholder={{ animationDuration: 150, showOnTop: true, className: "cs-dnd-drop-placeholder" }}
        className="cs-dnd-container"
      >
        {controls.map((child, index) => (
          <DndDraggable key={`${layout}-${index}`}>
            {renderControl(child, index, api, stateApi, {
              parentPath,
              onSelectPath,
              onDeletePath,
            })}
          </DndDraggable>
        ))}
      </DndContainer>
      <AddControlControl parentPath={parentPath} />
    </>
  );

  if (layout === "row") {
    return (
      <PropControl.Row
        label={label}
        designMode={stateApi.state.designMode}
        selected={selected}
        designTools={designTools}
        copyTools={copyTools}
        isMoveDestination={isMoveDestination}
      >
        {content}
      </PropControl.Row>
    );
  }

  if (layout === "column") {
    return (
      <PropControl.Column
        label={label}
        designMode={stateApi.state.designMode}
        selected={selected}
        designTools={designTools}
        copyTools={copyTools}
        isMoveDestination={isMoveDestination}
      >
        {content}
      </PropControl.Column>
    );
  }

  return (
    <ControlSurfaceGroupBase
      label={label}
      designMode={stateApi.state.designMode}
      selected={selected}
      designTools={designTools}
      copyTools={copyTools}
      isMoveDestination={isMoveDestination}
    >
      {content}
    </ControlSurfaceGroupBase>
  );
};
