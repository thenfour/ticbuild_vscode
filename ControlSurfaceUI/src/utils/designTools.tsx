import React from "react";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { classes } from "../utils";

export interface DesignToolsConfig {
    onDelete?: () => void;
    onSettings?: () => void;
    onSetMoveDestination?: (path: string[] | null) => void;
    onMoveToDestination?: () => void;
    includeDragHandle?: boolean;
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

    const includeDragHandle = config.includeDragHandle ?? true;
    if (includeDragHandle) {
        buttons.push(
            <PropControl.DesignToolButton
                key="drag"
                tool="drag"
            />
        );
    }

    if (config.onSetMoveDestination) {
        buttons.push(
            <PropControl.DesignToolButton
                key="set-move-destination"
                tool="setMoveDestination"
                onClick={() => config.onSetMoveDestination!(null)}
            />
        );
    }

    if (config.onMoveToDestination) {
        buttons.push(
            <PropControl.DesignToolButton
                key="move-to-destination"
                tool="moveToDestination"
                onClick={config.onMoveToDestination}
            />
        );
    }

    return buttons.length > 0 ? <>{buttons}</> : null;
};

type CreatePropControlClassesArgs = {
    designMode: boolean;
    selected: boolean;
    disabled: boolean;
    isMoveDestination: boolean;
    additionalClasses?: string;
}

export function createPropControlClasses(args: CreatePropControlClassesArgs): string {
    return classes(
        "cs-pp-control",
        args.designMode ? "cs-pp-design-mode" : "",
        args.selected ? "cs-pp-control-selected" : "",
        args.disabled ? "cs-pp-control-disabled" : "",
        args.isMoveDestination ? "cs-pp-control-move-destination" : "",
        args.additionalClasses
    );
}