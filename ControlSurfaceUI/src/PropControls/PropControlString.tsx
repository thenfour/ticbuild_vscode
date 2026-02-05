import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { TextInput } from "../basic/TextInput";

export interface PropControlStringProps {
    label: React.ReactNode;
    value: string;
    onChange: (value: string) => void;

    // PropControl Shell props
    designMode: boolean;
    selected: boolean;
    disabled?: boolean;
    validationStatus?: React.ReactNode;
    validationSeverity?: PropControlSeverity;
    bindingStatus?: React.ReactNode;
    bindingStatusSeverity?: PropControlSeverity;
    designTools?: React.ReactNode;
    copyTools?: React.ReactNode;
    isConnected: boolean;
}

/**
 * Pure UI component for string input using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlString: React.FC<PropControlStringProps> = ({
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
    copyTools,
    isConnected,
}) => {
    return (
        <PropControl.Shell
            designMode={designMode}
            selected={selected}
            disabled={disabled}
            isConnected={isConnected}
            isMoveDestination={false}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            copyTools={copyTools}
            value={
                <TextInput
                    value={value}
                    onChange={onChange}
                    disabled={disabled || designMode}
                />
            }
            designTools={designTools}
        />
    );
};
