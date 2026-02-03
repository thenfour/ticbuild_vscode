import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { NumericUpDown } from "../basic/NumericUpDown";

export interface PropControlNumberProps {
    label: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;

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
 * Pure UI component for numeric input using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlNumber: React.FC<PropControlNumberProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 0.1,
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
                <NumericUpDown
                    value={value}
                    onChange={onChange}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled || designMode}
                />
            }
            designTools={designTools}
        />
    );
};
