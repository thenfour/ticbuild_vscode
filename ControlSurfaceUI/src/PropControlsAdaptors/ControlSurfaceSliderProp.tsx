import React from "react";
import { ControlSurfaceSliderSpec } from "../defs";
import { PropControlSlider } from "../PropControls/PropControlSlider";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceSliderPropProps extends ControlSurfaceSliderSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

/**
 * Control Surface wrapper for PropControlSlider.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceSliderProp: React.FC<ControlSurfaceSliderPropProps> = ({
    label,
    symbol,
    min = 0,
    max = 100,
    step = 1,
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
        <PropControlSlider
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            designMode={designMode}
            selected={selected}
            bindingStatus={bindingStatus}
            bindingStatusSeverity="error"
            designTools={designTools}
        />
    );
};
