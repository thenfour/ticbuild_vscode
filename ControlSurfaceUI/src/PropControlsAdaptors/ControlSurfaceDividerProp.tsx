import React from "react";
import { PropControlDivider } from "../PropControls/PropControlDivider";
import { ControlSurfaceDividerSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { classes } from "../utils";
import { ButtonGroup } from "../Buttons/ButtonGroup";

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

    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === path;

    return <div
        className={classes(
            "cs-pp-control cs-pp-control-divider",
            designMode && "cs-pp-control-divider-design-mode",
            selected && "cs-pp-control-divider-selected",
        )}
    >
        {designMode && <ButtonGroup className="cs-pp-design-tools">
            {designTools}
        </ButtonGroup>}
        <div className="cs-pp-control-divider-line"></div>
    </div>;

};



