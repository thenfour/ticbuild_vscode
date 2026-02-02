/*
{
      type: "group";
      label: string;
      orientation?: "horizontal" | "vertical";
      controls: ControlSurfaceNode[];
    };

*/

import React from "react";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { ControlSurfaceGroupSpec, ControlSurfaceApi, ControlSurfaceColumnSpec, ControlSurfaceRowSpec } from "../defs";
import type { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { AddControlControl } from "../AddControlControl";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { ControlSurfaceStateApi, useControlSurfaceState } from "../hooks/ControlSurfaceState";


export interface ControlSurfaceGroupBaseProps {
  label?: string;
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
}


export const ControlSurfaceGroupBase: React.FC<ControlSurfaceGroupBaseProps> = ({
  label,
  orientation = "horizontal",
  children,
}) => {
  return (
    <fieldset className="control-surface-group-fieldset">
      <legend className="control-surface-group-label">{label}</legend>
      {/* <div className="control-surface-group"> */}
      {/* <div className="control-surface-group-label">{label}</div> */}
      <ButtonGroup orientation={orientation} className="control-surface-group">
        {children || null}
      </ButtonGroup>
      {/* </div> */}
    </fieldset>
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
}) => {
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  if (!api) {
    return null;
  }

  return <ControlSurfaceGroupBase
    label={label}
    orientation={orientation}
  >
    {controls.map((child, index) =>
      renderControl(child, index, api, stateApi, {
        parentPath,
        onSelectPath,
      })
    )}
    <AddControlControl parentPath={parentPath} />
  </ControlSurfaceGroupBase>;
};
