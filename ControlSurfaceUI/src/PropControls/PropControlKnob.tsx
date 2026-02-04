import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { Knob } from "../basic/Knob2";
import { ControlSurfaceKnobSizeSpec } from "../defs";

export interface PropControlKnobProps {
    label: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    size?: ControlSurfaceKnobSizeSpec;
    centerValue?: number;

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
 * Pure UI component for knob input using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlKnob: React.FC<PropControlKnobProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    size = "medium",
    centerValue,
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
    // Note: size is in the spec but Knob component doesn't currently support it
    // const sizePixels = size === "small" ? 40 : size === "large" ? 80 : 60;

    return (
        <PropControl.Shell
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            copyTools={copyTools}
            value={
                <Knob
                    value={value}
                    onChange={onChange}
                    min={min}
                    max={max}
                    step={step}
                    centerValue={centerValue}
                    disabled={disabled || designMode}
                />
            }
            designTools={designTools}
        />
    );
};
