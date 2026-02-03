import React from "react";
import { ControlSurfaceKnobSpec } from "../defs";
import { PropControlKnob } from "../PropControls/PropControlKnob";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceKnobPropProps extends ControlSurfaceKnobSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
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
}) => {
    const stateApi = useControlSurfaceState();
    const { value, onChange, bindingStatus } = useSymbolBinding<number>(symbol, min);

    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === JSON.stringify(path);

    const designTools = designMode
        ? createDesignTools({
            onMoveUp,
            onMoveDown,
            onDelete,
            onSettings,
        })
        : null;

    return (
        <PropControlKnob
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            size={size}
            designMode={designMode}
            selected={selected}
            bindingStatus={bindingStatus}
            bindingStatusSeverity="error"
            designTools={designTools}
        />
    );
};
