import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { Button } from "../Buttons/PushButton";

export interface PropControlTriggerButtonProps {
    label: React.ReactNode;
    onTrigger: () => void;

    // PropControl Shell props
    designMode: boolean;
    selected: boolean;
    disabled?: boolean;
    validationStatus?: React.ReactNode;
    validationSeverity?: PropControlSeverity;
    bindingStatus?: React.ReactNode;
    bindingStatusSeverity?: PropControlSeverity;
    designTools?: React.ReactNode;
}

/**
 * Pure UI component for trigger button control using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlTriggerButton: React.FC<PropControlTriggerButtonProps> = ({
    label,
    onTrigger,
    designMode,
    selected,
    disabled = false,
    validationStatus,
    validationSeverity,
    bindingStatus,
    bindingStatusSeverity,
    designTools,
}) => {
    return (
        <PropControl.Shell
            designMode={designMode}
            selected={selected}
            disabled={disabled}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            value={
                <Button onClick={onTrigger} disabled={disabled}>
                    {label}
                </Button>
            }
            designTools={designTools}
        />
    );
};
