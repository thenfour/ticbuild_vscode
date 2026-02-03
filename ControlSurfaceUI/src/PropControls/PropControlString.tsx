import React from "react";
import { PropControl, PropControlSeverity } from "../PropControlsBase/PropControlShell";

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
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || designMode}
                    style={{
                        flex: 1,
                        background: "var(--vscode-input-background)",
                        color: "var(--vscode-input-foreground)",
                        border: "1px solid var(--vscode-input-border)",
                        padding: "4px 8px",
                        fontSize: "12px",
                    }}
                />
            }
            designTools={designTools}
        />
    );
};
