import React from "react";
import { ControlSurfaceToggleSpec } from "../defs";
import { PropControlToggle } from "../PropControls/PropControlToggle";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceTogglePropProps extends ControlSurfaceToggleSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    onMoveToDestination?: () => void;
}

/**
 * Control Surface wrapper for PropControlToggle.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceToggleProp: React.FC<ControlSurfaceTogglePropProps> = ({
    label,
    symbol,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
    onMoveToDestination,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const { value, onChange, bindingStatus } = useSymbolBinding<boolean>(symbol, false);

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
        <PropControlToggle
            label={label}
            value={value}
            onChange={onChange}
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
