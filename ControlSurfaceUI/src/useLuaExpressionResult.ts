import React from "react";
import { ControlSurfaceApi } from "./defs";
import { useControlSurfaceApi } from "./VsCodeApiContext";

export type LuaExpressionResult = {
    value: string;
    error: string | null;
};

export const useLuaExpressionResult = (
    expression: string,
    uiRefreshMs: number,
    //api?: ControlSurfaceApi | undefined,
): LuaExpressionResult => {
    const api = useControlSurfaceApi();
    const [value, setValue] = React.useState<string>("");
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!api) {
            return;
        }
        let mounted = true;
        const intervalMs = Math.max(uiRefreshMs, 16);
        console.log("Setting up Lua expression evaluation for:", expression, "with interval:", intervalMs);

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
        const interval = window.setInterval(evaluate, intervalMs);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [expression, api, uiRefreshMs]);

    return { value, error };
};
