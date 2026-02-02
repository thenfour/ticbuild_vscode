import React from "react";
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
    const result = stateApi.state.expressionResults?.[expression];
    const isConnected = (stateApi.state.status ?? "").includes("Connected");

    React.useEffect(() => {
        if (!api || !isConnected) {
            return;
        }
        api.subscribeExpression?.(expression);
        return () => {
            api.unsubscribeExpression?.(expression);
        };
    }, [api, expression, isConnected]);

    return { value: result?.value ?? "", error: result?.error ?? null };
};
