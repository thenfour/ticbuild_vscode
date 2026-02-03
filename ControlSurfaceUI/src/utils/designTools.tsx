import React from "react";
import { PropControl } from "../PropControlsBase/PropControlShell";

export interface DesignToolsConfig {
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
}

/**
 * Factory function to create standardized design tool buttons for controls.
 * Returns null if no callbacks are provided, or a fragment with enabled buttons.
 * 
 * @param config - Configuration object with callbacks and enable states
 * @returns React fragment with design tool buttons, or null if no tools
 */
export const createDesignTools = (config: DesignToolsConfig): React.ReactNode => {
    const buttons: React.ReactNode[] = [];

    if (config.onMoveUp) {
        buttons.push(
            <PropControl.DesignToolButton
                key="moveUp"
                tool="moveUp"
                onClick={config.onMoveUp}
            />
        );
    }

    if (config.onMoveDown) {
        buttons.push(
            <PropControl.DesignToolButton
                key="moveDown"
                tool="moveDown"
                onClick={config.onMoveDown}
            />
        );
    }

    if (config.onDelete) {
        buttons.push(
            <PropControl.DesignToolButton
                key="delete"
                tool="delete"
                onClick={config.onDelete}
            />
        );
    }

    if (config.onSettings) {
        buttons.push(
            <PropControl.DesignToolButton
                key="settings"
                tool="settings"
                onClick={config.onSettings}
            />
        );
    }

    return buttons.length > 0 ? <>{buttons}</> : null;
};
