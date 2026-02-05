import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";

export interface PropControlLabelProps {
    label: React.ReactNode;
    displayValue: string;
    error?: string;

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
 * Pure UI component for displaying expression results using PropControl.Shell.
 * Does not interact with control surface API or state directly.
 */
export const PropControlLabel: React.FC<PropControlLabelProps> = ({
    label,
    displayValue,
    error,
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
            isMoveDestination={false}
            isConnected={isConnected}
            selected={selected}
            disabled={disabled}
            validationStatus={validationStatus ?? null}
            validationSeverity={validationSeverity}
            bindingStatus={bindingStatus ?? (error || null)}
            bindingStatusSeverity={bindingStatusSeverity ?? "error"}
            label={label}
            copyTools={copyTools}
            value={
                <span style={{
                    color: error ? 'var(--vscode-errorForeground)' : undefined,
                    fontFamily: 'var(--vscode-font-family)',
                    fontSize: '12px',
                }}>
                    {displayValue}
                </span>
            }
            designTools={designTools}
        />
    );
};
