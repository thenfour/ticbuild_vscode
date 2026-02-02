/*

 {
      type: "knob";
      label: string;
      expression: string; // a Lua expression that evaluates to a string.
  }



*/

import React from "react";
import { ControlSurfaceLabelSpec, ControlSurfaceApi } from "../defs";
import { useLuaExpressionResult } from "../useLuaExpressionResult";

export interface ControlSurfaceLabelProps extends ControlSurfaceLabelSpec {
  api: ControlSurfaceApi;
  uiRefreshMs: number;
}

export const ControlSurfaceLabel: React.FC<ControlSurfaceLabelProps> = ({ label, expression, api, uiRefreshMs }) => {
  const { value: displayValue, error } = useLuaExpressionResult(expression, api, uiRefreshMs);

  return (
    <div className="control-surface-label">
      {label && <span className="control-surface-label-title">{label}: </span>}
      <span className="control-surface-label-value" style={{ color: error ? 'var(--vscode-errorForeground)' : undefined }}>
        {error ? `Error: ${error}` : displayValue || expression}
      </span>
    </div>
  );
};
