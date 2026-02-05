import React from "react";
import { ControlSurfaceEnumButtonsSpec } from "../defs";
import { PropControlEnumButtons } from "../PropControls/PropControlEnumButtons";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceEnumButtonsPropProps extends ControlSurfaceEnumButtonsSpec {
    path: string[];
    onDelete?: () => void;
    onSettings?: () => void;
    onMoveToDestination?: () => void;
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
    onDelete,
    onSettings,
    onMoveToDestination,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const defaultValue = options[0]?.value ?? "";
    const { value, onChange, bindingStatus } = useSymbolBinding<string | number>(symbol, defaultValue);

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
        <PropControlEnumButtons
            label={label}
            value={value}
            onChange={onChange}
            options={options}
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
