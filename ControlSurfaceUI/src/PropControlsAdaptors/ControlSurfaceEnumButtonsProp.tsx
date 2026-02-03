import React from "react";
import { ControlSurfaceEnumButtonsSpec } from "../defs";
import { PropControlEnumButtons } from "../PropControls/PropControlEnumButtons";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceEnumButtonsPropProps extends ControlSurfaceEnumButtonsSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

/**
 * Control Surface wrapper for PropControlEnumButtons.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceEnumButtonsProp: React.FC<ControlSurfaceEnumButtonsPropProps> = ({
    label,
    symbol,
    options,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const stateApi = useControlSurfaceState();
    const defaultValue = options[0]?.value ?? "";
    const { value, onChange, bindingStatus } = useSymbolBinding<string | number>(symbol, defaultValue);

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
        <PropControlEnumButtons
            label={label}
            value={value}
            onChange={onChange}
            options={options}
            designMode={designMode}
            selected={selected}
            bindingStatus={bindingStatus}
            bindingStatusSeverity="error"
            designTools={designTools}
        />
    );
};
