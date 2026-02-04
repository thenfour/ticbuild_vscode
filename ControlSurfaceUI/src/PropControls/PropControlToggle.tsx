import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { CheckboxButton } from "../Buttons/CheckboxButton";

export interface PropControlToggleProps {
    label: React.ReactNode;
    value: boolean;
    onChange: (value: boolean) => void;

    // PropControl Shell props
    designMode: boolean;
    selected: boolean;
    disabled?: boolean;
    validationStatus?: React.ReactNode;
    validationSeverity?: PropControlSeverity;
    bindingStatus?: React.ReactNode;
    bindingStatusSeverity?: PropControlSeverity;
    designTools?: React.ReactNode;
    isConnected: boolean;
}

/**
 * Pure UI component for boolean toggle using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlToggle: React.FC<PropControlToggleProps> = ({
    label,
    value,
    onChange,
    designMode,
    selected,
    disabled = false,
    validationStatus,
    validationSeverity,
    bindingStatus,
    bindingStatusSeverity,
    designTools,
    isConnected,
}) => {
    return (
        <PropControl.Shell
            designMode={designMode}
            selected={selected}
            isConnected={isConnected}
            disabled={disabled}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            value={
                <CheckboxButton
                    checked={value}
                    onChange={onChange}
                    disabled={disabled || designMode}
                >
                    {/* Empty - label is shown in Shell */}
                </CheckboxButton>
            }
            designTools={designTools}
        />
    );
};
