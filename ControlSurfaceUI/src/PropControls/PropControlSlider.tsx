import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { Slider2 } from "../basic/Slider2";

export interface PropControlSliderProps {
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
    isConnected: boolean;
}

/**
 * Pure UI component for slider input using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlSlider: React.FC<PropControlSliderProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    designMode,
    selected,
    disabled = false,
    validationStatus,
    validationSeverity,
    bindingStatus,
    bindingStatusSeverity,
    designTools,
    isConnected
}) => {
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
            value={
                <Slider2
                    value={value}
                    onChange={onChange}
                    min={min}
                    max={max}
                    defaultValue={min}
                    centerValue={min}
                    step={step}
                    disabled={disabled || designMode}
                    showValue={true}
                />
            }
            designTools={designTools}
        />
    );
};
