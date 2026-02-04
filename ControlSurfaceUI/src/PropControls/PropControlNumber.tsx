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
    //validationStatus?: React.ReactNode;
    //validationSeverity?: PropControlSeverity;
    bindingStatus?: React.ReactNode;
    bindingStatusSeverity?: PropControlSeverity;
    designTools?: React.ReactNode;
    isConnected: boolean;
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
    //validationStatus,
    //validationSeverity,
    bindingStatus,
    bindingStatusSeverity,
    designTools,
    isConnected,
}) => {

    // if the input is not a number, or out of range, show validation error
    let validationError: React.ReactNode = null;
    let canRender = true;
    //console.log("PropControlNumber value:", value);
    if ((typeof (value) !== "number") || !isFinite(value) || isNaN(value)) {
        validationError = "Value must be a number";
        canRender = false;
    } else if (value < (min ?? -Infinity)) {
        validationError = `Value must be at least ${min}`;
    } else if (value > (max ?? Infinity)) {
        validationError = `Value must be at most ${max}`;
    }

    return (
        <PropControl.Shell
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            validationStatus={validationError}
            validationSeverity={validationError ? "error" : undefined}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            value={
                canRender &&
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
