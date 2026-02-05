import React from "react";
import { PropControlLabel } from "../PropControls/PropControlLabel";
import { ControlSurfaceLabelSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { useLuaExpressionResult } from "../hooks/useLuaExpressionResult";
import { createDesignTools } from "../utils/designTools";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceLabelPropProps {
    spec: ControlSurfaceLabelSpec;
    path: string;
    onDelete: () => void;
    onSettings: () => void;
    onMoveToDestination?: () => void;
}

/**
 * Control Surface adaptor for Label control.
 * Wraps PropControlLabel with expression evaluation and control surface integration.
 */
export const ControlSurfaceLabelProp: React.FC<ControlSurfaceLabelPropProps> = ({
    spec,
    path,
    onDelete,
    onSettings,
    onMoveToDestination,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();

    // Evaluate the expression
    const { value: displayValue, error } = useLuaExpressionResult(spec.expression);

    // Create design tools
    const designTools = createDesignTools({
        onDelete,
        onSettings,
        onMoveToDestination,
    });

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            [spec.expression],
            stateApi.state.expressionResults ?? {},
            api?.showWarningMessage,
        );
    }, [api?.showWarningMessage, spec.expression, stateApi.state.expressionResults]);

    const copyTools = !stateApi.state.designMode
        ? <PropControl.CopyButton onClick={handleCopy} />
        : null;

    return (
        <PropControlLabel
            isConnected={stateApi.state.connectionState === "connected"}
            label={spec.label}
            displayValue={displayValue ?? spec.expression}
            error={error ?? undefined}
            designMode={stateApi.state.designMode}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
            copyTools={copyTools}
        />
    );
};
