import React from "react";
import { ControlSurfaceSliderSpec } from "../defs";
import { PropControlSlider } from "../PropControls/PropControlSlider";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceSliderPropProps extends ControlSurfaceSliderSpec {
    path: string[];
    onDelete?: () => void;
    onSettings?: () => void;
    onMoveToDestination?: () => void;
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
        <PropControlSlider
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
