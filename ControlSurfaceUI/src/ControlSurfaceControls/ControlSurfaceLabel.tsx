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
  api: ControlSurfaceApi;
  pollIntervalMs: number;
}

export const ControlSurfaceLabel: React.FC<ControlSurfaceLabelProps> = ({ label, expression, api, pollIntervalMs }) => {
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Poll expression value periodically
  React.useEffect(() => {
    if (!api?.evalExpression) {
      setDisplayValue(expression);
      return;
    }

    let mounted = true;

    const evaluate = async () => {
      try {
        const result = await api.evalExpression!(expression);
        if (mounted) {
          setDisplayValue(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    evaluate(); // Initial evaluation
    const interval = setInterval(evaluate, pollIntervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [expression, api, pollIntervalMs]);

  return (
    <div className="control-surface-label">
      {label && <span className="control-surface-label-title">{label}: </span>}
      <span className="control-surface-label-value" style={{ color: error ? 'var(--vscode-errorForeground)' : undefined }}>
        {error ? `Error: ${error}` : displayValue || expression}
      </span>
    </div>
  );
};
