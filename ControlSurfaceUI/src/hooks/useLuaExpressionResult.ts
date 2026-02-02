import React from "react";
import { ControlSurfaceApi } from "../defs";
import { useControlSurfaceApi } from "./VsCodeApiContext";
import { useControlSurfaceState } from "./ControlSurfaceState";

export type LuaExpressionResult = {
    value: string;
    error: string | null;
};

// TODO: make an API for pollExpressionResult with a callback, uses setInterval internally.
// probably even, we should tell the host to "monitor this expression" -- it decides
// the data rate interval, and pushes updates to us via events, which can include
// the stream of values over time.
export const useLuaExpressionResult = (
    expression: string,
    //uiRefreshMs: number,
    //api?: ControlSurfaceApi | undefined,
): LuaExpressionResult => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const [value, setValue] = React.useState<string>("");
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!api) {
            return;
        }
        let mounted = true;
        //const intervalMs = Math.max(stateApi.state.uiRefreshMs, 16);
        console.log("Setting up Lua expression evaluation for:", expression, "with interval:", stateApi.state.uiRefreshMs);

        const evaluate = async () => {
            try {
                const result = await api.evalExpression?.(expression);
                if (!mounted) {
                    return;
                }
                setValue(result ?? "");
                setError(null);
            } catch (err) {
                if (!mounted) {
                    return;
                }
                const errorMsg = err instanceof Error ? err.message : String(err);
                api.log?.(`Evaluation error: ${errorMsg}`);
                setError(errorMsg);
            }
        };

        evaluate();
        const interval = window.setInterval(evaluate, stateApi.state.uiRefreshMs);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [expression, api, stateApi.state.uiRefreshMs]);

    return { value, error };
};
