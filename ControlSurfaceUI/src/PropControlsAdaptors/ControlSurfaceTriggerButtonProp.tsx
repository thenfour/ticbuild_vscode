import React from "react";
import { PropControlTriggerButton } from "../PropControls/PropControlTriggerButton";
import { ControlSurfaceTriggerButtonSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceTriggerButtonPropProps {
    spec: ControlSurfaceTriggerButtonSpec;
    path: string;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    onSettings: () => void;
}

/**
 * Control Surface adaptor for TriggerButton control.
 * Wraps PropControlTriggerButton with eval execution and control surface integration.
 */
export const ControlSurfaceTriggerButtonProp: React.FC<ControlSurfaceTriggerButtonPropProps> = ({
    spec,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const stateApi = useControlSurfaceState();
    const api = useControlSurfaceApi();

    // Create trigger handler
    const handleTrigger = () => {
        api?.postMessage({ type: "eval", expression: spec.eval });
    };

    // Create design tools
    const designTools = createDesignTools({
        onMoveUp,
        onMoveDown,
        onDelete,
        onSettings,
    });

    const isConnected = stateApi.state.connectionState === "connected";

    return (
        <PropControlTriggerButton
            label={spec.label}
            onTrigger={handleTrigger}
            designMode={stateApi.state.designMode}
            isConnected={isConnected}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
        />
    );
};
