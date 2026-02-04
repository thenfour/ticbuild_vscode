import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";
import { ScopePlot, ScopeRangeMode, ScopeSeriesData } from "../basic/ScopePlot";

export interface PropControlScopeProps {
    label?: React.ReactNode;
    width?: number;
    height?: number;
    rangeMode?: ScopeRangeMode;
    series: ScopeSeriesData[];

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
 * Pure UI component for scope plot using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlScope: React.FC<PropControlScopeProps> = ({
    label,
    width,
    height,
    rangeMode,
    series,
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
            label={label ?? "Scope"}
            value={
                <ScopePlot
                    width={width}
                    height={height}
                    rangeMode={rangeMode}
                    series={series}
                />
            }
            designTools={designTools}
        />
    );
};
