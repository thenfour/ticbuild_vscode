/*
 {
      type: "triggerButton";
      label: string;
      eval: string;
    }
      
*/

import React from "react";
import { Button } from "../Buttons/PushButton";
import { ControlSurfaceTriggerButtonSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceTriggerButtonProps extends ControlSurfaceTriggerButtonSpec {
  api?: ControlSurfaceApi;
}

export const ControlSurfaceTriggerButton: React.FC<ControlSurfaceTriggerButtonProps> = ({ label, eval: expression, api }) => {
  return (
    <Button
      onClick={() => api?.postMessage({ type: "eval", expression })}
    >
      {label}
    </Button>
  );
};
