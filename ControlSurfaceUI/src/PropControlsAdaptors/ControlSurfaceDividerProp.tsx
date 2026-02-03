import React from "react";
import { PropControlDivider } from "../PropControls/PropControlDivider";
import { ControlSurfaceDividerSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";

export interface ControlSurfaceDividerPropProps {
    spec: ControlSurfaceDividerSpec;
    path: string;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    onSettings: () => void;
}

/**
 * Control Surface adaptor for Divider control.
 * Wraps PropControlDivider with control surface integration.
 */
export const ControlSurfaceDividerProp: React.FC<ControlSurfaceDividerPropProps> = ({
    spec,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const stateApi = useControlSurfaceState();

    // Create design tools
    const designTools = createDesignTools({
        onMoveUp,
        onMoveDown,
        onDelete,
        onSettings,
    });

    return (
        <PropControlDivider
            designMode={stateApi.state.designMode}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
        />
    );
};
