import React from "react";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { ControlSurfacePageSpec, ControlSurfaceNode, ControlSurfaceApi } from "../defs";
import { ControlSurfaceStateApi } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";

export interface ControlSurfacePagePropProps {
    spec: ControlSurfacePageSpec;
    path: string;
    renderControl: (
        node: ControlSurfaceNode,
        index: number,
        api: ControlSurfaceApi,
        stateApi: ControlSurfaceStateApi,
        options: ControlSurfaceRenderOptions
    ) => JSX.Element;
    api: ControlSurfaceApi;
    stateApi: ControlSurfaceStateApi;
    options: ControlSurfaceRenderOptions;
    currentPath: string[];
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    onSettings: () => void;
}

/**
 * Control Surface adaptor for Page control.
 * Wraps PropControl.Page with control surface integration.
 * Pages behave like columns - vertical containers with labels and design tools.
 */
export const ControlSurfacePageProp: React.FC<ControlSurfacePagePropProps> = ({
    spec,
    path,
    renderControl,
    api,
    stateApi,
    options,
    currentPath,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    // Create design tools
    const designTools = createDesignTools({
        onMoveUp,
        onMoveDown,
        onDelete,
        onSettings,
    });

    return (
        <PropControl.Page
            label={spec.label}
            designMode={stateApi.state.designMode}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
        >
            {spec.controls.map((child, childIndex) =>
                renderControl(child, childIndex, api, stateApi, {
                    ...options,
                    parentPath: currentPath,
                })
            )}
        </PropControl.Page>
    );
};
