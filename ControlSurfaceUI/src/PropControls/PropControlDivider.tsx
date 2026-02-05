import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { Divider } from "../basic/Divider";

export interface PropControlDividerProps {
    // PropControl Shell props
    designMode: boolean;
    selected: boolean;
    disabled?: boolean;
    designTools?: React.ReactNode;
    isConnected: boolean;
}

/**
 * Pure UI component for divider control using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlDivider: React.FC<PropControlDividerProps> = ({
    designMode,
    selected,
    disabled = false,
    designTools,
    isConnected,
}) => {
    return (
        <PropControl.Shell
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            validationStatus={null}
            isMoveDestination={false}
            bindingStatus={null}
            label={null}
            value={<Divider />}
            designTools={designTools}
        />
    );
};
