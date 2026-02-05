import React from "react";
import { ControlSurfaceKnobSpec } from "../defs";
import { PropControlKnob } from "../PropControls/PropControlKnob";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceKnobPropProps extends ControlSurfaceKnobSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    onMoveToDestination?: () => void;
}

/**
 * Control Surface wrapper for PropControlKnob.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceKnobProp: React.FC<ControlSurfaceKnobPropProps> = ({
    label,
    symbol,
    min = 0,
    max = 1,
    step = 0.01,
    size = "medium",
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
    onMoveToDestination,
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
            onMoveToDestination,
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
        <PropControlKnob
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            centerValue={min}
            size={size}
            isMoveDestination={false}
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
