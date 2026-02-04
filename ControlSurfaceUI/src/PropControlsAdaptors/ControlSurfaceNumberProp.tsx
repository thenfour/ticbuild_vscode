import React from "react";
import { ControlSurfaceNumberSpec } from "../defs";
import { PropControlNumber } from "../PropControls/PropControlNumber";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceNumberPropProps extends ControlSurfaceNumberSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

/**
 * Control Surface wrapper for PropControlNumber.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceNumberProp: React.FC<ControlSurfaceNumberPropProps> = ({
    label,
    symbol,
    min = 0,
    max = 100,
    step = 0.1,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const { value, onChange, bindingStatus } = useSymbolBinding<number>(symbol, min);

    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === JSON.stringify(path);
    const isConnected = stateApi.state.connectionState === "connected";

    const designTools = designMode
        ? createDesignTools({
            onMoveUp,
            onMoveDown,
            onDelete,
            onSettings,
        })
        : null;

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            [symbol],
            stateApi.state.expressionResults ?? {},
            api?.showWarningMessage,
        );
    }, [api?.showWarningMessage, stateApi.state.expressionResults, symbol]);

    const copyTools = !designMode
        ? <PropControl.CopyButton onClick={handleCopy} />
        : null;

    return (
        <PropControlNumber
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            bindingStatus={bindingStatus}
            bindingStatusSeverity="error"
            designTools={designTools}
            copyTools={copyTools}
        />
    );
};
