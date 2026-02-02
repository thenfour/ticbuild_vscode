/*
 {
      type: "triggerButton";
      label: string;
      eval: string;
    }
      
*/

import React from "react";
import { Button } from "../Buttons/PushButton";
import { ControlSurfaceTriggerButtonSpec } from "../defs";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceTriggerButtonProps extends ControlSurfaceTriggerButtonSpec {
}

export const ControlSurfaceTriggerButton: React.FC<ControlSurfaceTriggerButtonProps> = ({ label, eval: expression }) => {
  const api = useControlSurfaceApi();

  return (
    <Button
      onClick={() => api?.postMessage({ type: "eval", expression })}
    >
      {label}
    </Button>
  );
};
