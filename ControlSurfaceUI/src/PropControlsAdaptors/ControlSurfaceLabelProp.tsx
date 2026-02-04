import React from "react";
import { PropControlLabel } from "../PropControls/PropControlLabel";
import { ControlSurfaceLabelSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { useLuaExpressionResult } from "../hooks/useLuaExpressionResult";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceLabelPropProps {
    spec: ControlSurfaceLabelSpec;
    path: string;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    onSettings: () => void;
}

/**
 * Control Surface adaptor for Label control.
 * Wraps PropControlLabel with expression evaluation and control surface integration.
 */
export const ControlSurfaceLabelProp: React.FC<ControlSurfaceLabelPropProps> = ({
    spec,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const stateApi = useControlSurfaceState();

    // Evaluate the expression
    const { value: displayValue, error } = useLuaExpressionResult(spec.expression);

    // Create design tools
    const designTools = createDesignTools({
        onMoveUp,
        onMoveDown,
        onDelete,
        onSettings,
    });

    return (
        <PropControlLabel
            isConnected={stateApi.state.connectionState === "connected"}
            label={spec.label}
            displayValue={displayValue ?? spec.expression}
            error={error ?? undefined}
            designMode={stateApi.state.designMode}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
        />
    );
};
