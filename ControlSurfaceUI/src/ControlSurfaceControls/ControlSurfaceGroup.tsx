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
import { ControlSurfaceGroupSpec, ControlSurfaceApi } from "../defs";


export interface ControlSurfaceGroupBaseProps {
  label: string;
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

export interface ControlSurfaceGroupProps extends ControlSurfaceGroupSpec {
  api?: ControlSurfaceApi;
  renderControl: (node: any, index: number, api?: ControlSurfaceApi) => JSX.Element;
}

export const ControlSurfaceGroup: React.FC<ControlSurfaceGroupProps> = ({
  label,
  orientation = "horizontal",
  controls,
  api,
  renderControl
}) => {
  return <ControlSurfaceGroupBase
    label={label}
    orientation={orientation}
  >
    {controls.map((child, index) => renderControl(child, index, api))}
  </ControlSurfaceGroupBase>;
  // return (
  //   <div className="control-surface-group">
  //     <div className="control-surface-group-label">{label}</div>
  //     <ButtonGroup orientation={orientation}>
  //       {controls.map((child, index) => renderControl(child, index, api))}
  //     </ButtonGroup>
  //   </div>
  // );
};
