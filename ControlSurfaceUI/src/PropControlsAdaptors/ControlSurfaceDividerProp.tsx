import React from "react";
import { PropControlDivider } from "../PropControls/PropControlDivider";
import { ControlSurfaceDividerSpec } from "../defs";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools, createPropControlClasses } from "../utils/designTools";
import { classes } from "../utils";
import { ButtonGroup } from "../Buttons/ButtonGroup";

export interface ControlSurfaceDividerPropProps {
    spec: ControlSurfaceDividerSpec;
    path: string;
    onDelete: () => void;
    onSettings: () => void;
    onMoveToDestination?: () => void;
}

/**
 * Control Surface adaptor for Divider control.
 * Wraps PropControlDivider with control surface integration.
 */
export const ControlSurfaceDividerProp: React.FC<ControlSurfaceDividerPropProps> = ({
    spec,
    path,
    onDelete,
    onSettings,
    onMoveToDestination,
}) => {
    const stateApi = useControlSurfaceState();

    // Create design tools
    const designTools = createDesignTools({
        onDelete,
        onSettings,
        onMoveToDestination,
    });

    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === path;

    return <div
        className={createPropControlClasses({
            additionalClasses: "cs-pp-control-divider",
            designMode: designMode,
            selected: selected,
            isMoveDestination: false,
            disabled: false
        })}
    >
        {designMode && <ButtonGroup className="cs-pp-design-tools">
            {designTools}
        </ButtonGroup>}
        <div className="cs-pp-control-divider-line"></div>
    </div>;

};



