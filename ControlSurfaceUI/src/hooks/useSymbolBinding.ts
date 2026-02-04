import React from "react";
import { useControlSurfaceApi } from "./VsCodeApiContext";
import { useControlSurfaceState } from "./ControlSurfaceState";

export interface SymbolBinding<T> {
    value: T;
    onChange: (newValue: T) => void;
    bindingStatus: string;
}


// Raw expression results are Lua strings; need to parse them into appropriate types.
const parseExpressionValue = <T>(valueText: string, fallback: T): T => {
    const trimmed = valueText.trim();
    if (trimmed.length === 0) {
        return fallback;
    }
    try {
        // weird but practical.
        return JSON.parse(trimmed) as T;
    } catch {
        if (typeof fallback === "number") {
            const parsed = Number(trimmed);
            return (Number.isFinite(parsed) ? parsed : fallback) as T;
        }
        if (typeof fallback === "boolean") {
            if (trimmed === "true") return true as T;
            if (trimmed === "false") return false as T;
            return fallback;
        }
        return trimmed as T;
    }
};

/**
 * Hook for managing symbol bindings in control surface controls.
 * Handles state synchronization with expression results, posting updates to the API,
 * and surfacing expression errors.
 * 
 * @param symbol - The symbol name to bind to
 * @param defaultValue - Default value when symbol is not found
 * @returns Object with value, onChange handler, and bindingStatus message
 */
export const useSymbolBinding = <T = any>(
    symbol: string,
    defaultValue: T
): SymbolBinding<T> => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const isConnected = stateApi.state.connectionState === "connected";
    const result = stateApi.state.expressionResults?.[symbol];

    const [value, setValue] = React.useState<T>(defaultValue);

    React.useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue, symbol]);

    React.useEffect(() => {
        if (!api || !isConnected || !symbol) {
            return;
        }
        api.subscribeExpression(symbol);
        return () => {
            api.unsubscribeExpression(symbol);
        };
    }, [api, isConnected, symbol]);

    React.useEffect(() => {
        if (!result?.value) {
            return;
        }
        setValue(parseExpressionValue(result.value, defaultValue));
    }, [result?.value, defaultValue]);

    const handleChange = React.useCallback((newValue: T) => {
        setValue(newValue);
        if (symbol) {
            api?.setSymbolValue(symbol, newValue);
        }
    }, [api, symbol]);

    const bindingStatus = result?.error ? `Expression error: ${result.error}` : "";

    return { value, onChange: handleChange, bindingStatus };
};
