/*

 {
      type: "knob";
      label: string;
      expression: string; // a Lua expression that evaluates to a string.
  }



*/

import React from "react";
import { ControlSurfaceLabelSpec } from "../defs";
import { useLuaExpressionResult } from "../useLuaExpressionResult";
import { useControlSurfaceApi } from "../VsCodeApiContext";

export interface ControlSurfaceLabelProps extends ControlSurfaceLabelSpec {
  uiRefreshMs: number;
}

export const ControlSurfaceLabel: React.FC<ControlSurfaceLabelProps> = ({ label, expression, uiRefreshMs }) => {
  const api = useControlSurfaceApi();
  const { value: displayValue, error } = useLuaExpressionResult(expression, uiRefreshMs);

  return (
    <div className="control-surface-label">
      {label && <span className="control-surface-label-title">{label}: </span>}
      <span className="control-surface-label-value" style={{ color: error ? 'var(--vscode-errorForeground)' : undefined }}>
        {error ? `${error}` : displayValue || expression}
      </span>
    </div>
  );
};
