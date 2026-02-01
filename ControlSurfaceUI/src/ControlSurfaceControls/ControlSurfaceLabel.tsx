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
    // api.log?.(`ControlSurfaceLabel mounted. API keys: ${Object.keys(api).join(", ")}`);
    // api.log?.(`evalExpression type: ${typeof api.evalExpression}`);


    let mounted = true;

    const evaluate = async () => {
      try {
        //api.log?.(`Evaluating expression: ${expression}`);
        const result = await api.evalExpression!(expression);
        //api.log?.(`Result: ${result}`);
        if (mounted) {
          setDisplayValue(result);
          setError(null);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        api.log?.(`Evaluation error: ${errorMsg}`);
        if (mounted) {
          setError(errorMsg);
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
