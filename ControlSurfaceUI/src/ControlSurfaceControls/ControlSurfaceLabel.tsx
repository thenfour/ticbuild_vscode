/*

 {
      type: "knob";
      label: string;
      expression: string; // a Lua expression that evaluates to a string.
  }



*/

import React from "react";
import { ControlSurfaceLabelSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceLabelProps extends ControlSurfaceLabelSpec {
  api?: ControlSurfaceApi;
}

export const ControlSurfaceLabel: React.FC<ControlSurfaceLabelProps> = ({ label, expression, api }) => {
  const [displayValue, setDisplayValue] = React.useState<string>("");

  // Poll expression value periodically
  React.useEffect(() => {
    const evaluate = () => {
      api?.postMessage({ type: "eval", expression });
    };

    evaluate(); // Initial evaluation
    const interval = setInterval(evaluate, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [expression, api]);

  // Note: In a real implementation, we'd need a way to receive the evaluated value back
  // For now, this is a placeholder structure

  return (
    <div className="control-surface-label">
      <span className="control-surface-label-title">{label}:</span>
      <span className="control-surface-label-value">{displayValue || expression}</span>
    </div>
  );
};
