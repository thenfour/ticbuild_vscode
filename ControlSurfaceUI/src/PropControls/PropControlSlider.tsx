import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";

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
                <>
                    <input
                        type="range"
                        className="control-surface-slider-input"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        disabled={disabled || designMode}
                        style={{ flex: 1 }}
                    />
                    <span className="control-surface-slider-value">{value}</span>
                </>
            }
            designTools={designTools}
        />
    );
};
