import React from "react";
import { useControlSurfaceApi } from "./VsCodeApiContext";
import { useControlSurfaceState } from "./ControlSurfaceState";

export interface SymbolBinding<T> {
    value: T;
    onChange: (newValue: T) => void;
    bindingStatus: string;
}

/**
 * Hook for managing symbol bindings in control surface controls.
 * Handles state synchronization with symbolValues, posting updates to the API,
 * and detecting binding errors (symbol not found).
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

    // Initialize with value from symbolValues or default
    const [value, setValue] = React.useState<T>(
        stateApi.state.symbolValues[symbol] ?? defaultValue
    );

    // Sync with symbolValues when it changes
    React.useEffect(() => {
        const newValue = stateApi.state.symbolValues[symbol];
        if (newValue !== undefined) {
            setValue(newValue);
        }
    }, [stateApi.state.symbolValues[symbol], symbol]);

    // Handler to update both local state and post to API
    const handleChange = React.useCallback((newValue: T) => {
        setValue(newValue);
        api?.postMessage({ type: "setSymbol", symbol, value: newValue });
    }, [api, symbol]);

    // Determine binding status
    const bindingStatus = symbol && !stateApi.state.symbolValues.hasOwnProperty(symbol)
        ? `Symbol "${symbol}" not found`
        : "";

    return { value, onChange: handleChange, bindingStatus };
};
