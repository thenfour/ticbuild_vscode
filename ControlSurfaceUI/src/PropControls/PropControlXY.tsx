import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { XY2 } from "../basic/XY2";

export interface PropControlXYProps {
    label: React.ReactNode;
    valueX: number;
    valueY: number;
    onChange: (valueX: number, valueY: number) => void;

    minX?: number;
    maxX?: number;
    stepX?: number;
    centerX?: number;

    minY?: number;
    maxY?: number;
    stepY?: number;
    centerY?: number;

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
 * Pure UI component for XY input using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlXY: React.FC<PropControlXYProps> = ({
    label,
    valueX,
    valueY,
    onChange,
    minX = 0,
    maxX = 100,
    stepX = 1,
    centerX,
    minY = 0,
    maxY = 100,
    stepY = 1,
    centerY,
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
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? null}
            bindingStatusSeverity={bindingStatusSeverity}
            label={label}
            value={
                <XY2
                    valueX={valueX}
                    valueY={valueY}
                    onChange={onChange}
                    minX={minX}
                    maxX={maxX}
                    stepX={stepX}
                    centerX={centerX}
                    defaultX={centerX}
                    minY={minY}
                    maxY={maxY}
                    stepY={stepY}
                    centerY={centerY}
                    defaultY={centerY}
                    disabled={disabled || designMode}
                />
            }
            designTools={designTools}
        />
    );
};
