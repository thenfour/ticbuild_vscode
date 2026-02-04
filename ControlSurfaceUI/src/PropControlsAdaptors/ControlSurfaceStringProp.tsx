import React from "react";
import { ControlSurfaceStringSpec } from "../defs";
import { PropControlString } from "../PropControls/PropControlString";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceStringPropProps extends ControlSurfaceStringSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

/**
 * Control Surface wrapper for PropControlString.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceStringProp: React.FC<ControlSurfaceStringPropProps> = ({
    label,
    symbol,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const { value, onChange, bindingStatus } = useSymbolBinding<string>(symbol, "");

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
        <PropControlString
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
