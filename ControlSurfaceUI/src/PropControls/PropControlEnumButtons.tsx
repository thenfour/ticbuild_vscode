import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { EnumButtons } from "../basic/EnumButtons";

export interface PropControlEnumButtonsProps {
    label: React.ReactNode;
    value: string | number;
    onChange: (value: string | number) => void;
    options: { label?: string; value: string | number }[];

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
 * Pure UI component for enum button selection using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlEnumButtons: React.FC<PropControlEnumButtonsProps> = ({
    label,
    value,
    onChange,
    options,
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
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            isMoveDestination={false}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            copyTools={copyTools}
            value={
                <EnumButtons
                    options={options}
                    value={value}
                    onChange={onChange}
                    disabled={disabled || designMode}
                />
            }
            designTools={designTools}
        />
    );
};
