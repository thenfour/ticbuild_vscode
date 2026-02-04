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


export interface ControlSurfaceGroupBaseProps {
  label?: string;
  orientation?: "horizontal" | "vertical";
  designMode: boolean;
  selected: boolean;
  designTools?: React.ReactNode;
  children?: React.ReactNode;
}


export const ControlSurfaceGroupBase: React.FC<ControlSurfaceGroupBaseProps> = ({
  label,
  orientation = "horizontal",
  designMode,
  selected,
  designTools,
  children,
}) => {

  const [open, setOpen] = React.useState(true);


  return (
    <div className={createPropControlClasses({
      designMode: !!designMode,
      selected: selected,
      disabled: false,
      additionalClasses: "cs-pp-control-group"
    })}>

      {/* <legend className="control-surface-group-label">{label}</legend> */}
      {designMode && designTools ? (
        <ButtonGroup className="cs-pp-design-tools">
          {designTools}
        </ButtonGroup>
      ) : null}

      <div onClick={() => setOpen(b => !b)} className="cs-pp-group-label">{label}</div>
      {open && <div className="cs-pp-group-expanded-content">{/* shall hold controls like a column. */}
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
}

export const ControlSurfaceGroup: React.FC<ControlSurfaceGroupProps> = ({
  label,
  orientation,
  layout,
  controls,
  renderControl,

  //symbolValues,
  //pollIntervalMs,
  parentPath = [],
  //designMode,
  //selectedPath,
  onSelectPath,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSettings,
}) => {
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  if (!api) {
    return null;
  }

  const designTools = stateApi.state.designMode
    ? createDesignTools({
      onMoveUp,
      onMoveDown,
      onDelete,
      onSettings,
    })
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

  const dndOrientation = (layout === "row" || orientation === "horizontal") ? "horizontal" : "vertical";

  //console.log(`group label:${label} withparentpath:`, parentPath, " selected:", selected, " state selected:", stateApi.state.selectedControlPath);

  return <ControlSurfaceGroupBase
    label={label}
    orientation={orientation}
    designMode={stateApi.state.designMode}
    selected={selected}
    designTools={designTools}
  >
    <DndContainer
      groupName="control-surface-controls"
      orientation={dndOrientation}
      disabled={!stateApi.state.designMode}
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
          })}
        </DndDraggable>
      ))}
    </DndContainer>
    <AddControlControl parentPath={parentPath} />
  </ControlSurfaceGroupBase>;
};
