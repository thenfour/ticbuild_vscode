import React from "react";
import { ControlSurfaceApi, ControlSurfaceNode } from "./defs";
import { ControlSurfaceDivider } from "./ControlSurfaceControls/ControlSurfaceDivider";
import { ControlSurfaceEnumButtons } from "./ControlSurfaceControls/ControlSurfaceEnumButtons";
import { ControlSurfaceGroup } from "./ControlSurfaceControls/ControlSurfaceGroup";
import { ControlSurfaceKnob } from "./ControlSurfaceControls/ControlSurfaceKnob";
import { ControlSurfaceLabel } from "./ControlSurfaceControls/ControlSurfaceLabel";
import { ControlSurfaceNumber } from "./ControlSurfaceControls/ControlSurfaceNumber";
import { ControlSurfaceSlider } from "./ControlSurfaceControls/ControlSurfaceSlider";
import { ControlSurfaceString } from "./ControlSurfaceControls/ControlSurfaceString";
import { ControlSurfaceTabs } from "./ControlSurfaceControls/ControlSurfaceTabs";
import { ControlSurfaceToggle } from "./ControlSurfaceControls/ControlSurfaceToggle";
import { ControlSurfaceTriggerButton } from "./ControlSurfaceControls/ControlSurfaceTriggerButton";
import { ControlSurfaceSelectable } from "./ControlBase/ControlSurfaceSelectable";
import { buildControlPath, isPathEqual } from "./controlPathBase";
import { ControlSurfaceStateApi } from "./hooks/ControlSurfaceState";
import { ControlSurfaceStringProp } from "./PropControlsAdaptors/ControlSurfaceStringProp";
import { ControlSurfaceToggleProp } from "./PropControlsAdaptors/ControlSurfaceToggleProp";
import { ControlSurfaceNumberProp } from "./PropControlsAdaptors/ControlSurfaceNumberProp";
import { ControlSurfaceKnobProp } from "./PropControlsAdaptors/ControlSurfaceKnobProp";
import { ControlSurfaceSliderProp } from "./PropControlsAdaptors/ControlSurfaceSliderProp";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

export type ControlSurfaceRenderOptions = {
    parentPath: string[];
    //designMode: boolean;
    //selectedPath?: string[] | null;
    onSelectPath?: (path: string[], node: ControlSurfaceNode) => void;
    onDeletePath?: (path: string[], node: ControlSurfaceNode) => void;
};

export const renderControlSurfaceControl = (
    node: ControlSurfaceNode,
    index: number,
    api: ControlSurfaceApi,
    stateApi: ControlSurfaceStateApi,
    //symbolValues: Record<string, any>,
    //pollIntervalMs: number,
    options: ControlSurfaceRenderOptions,
): JSX.Element => {
    const currentPath = buildControlPath(options.parentPath, index);
    const isSelected = isPathEqual(stateApi.state.selectedControlPath, currentPath);

    const handleSelect = options.onSelectPath
        ? (path: string[]) => options.onSelectPath?.(path, node)
        : undefined;
    const handleDelete = options.onDeletePath
        ? (path: string[]) => options.onDeletePath?.(path, node)
        : undefined;

    const wrapSelectable = (content: JSX.Element, key: string) => (
        <ControlSurfaceSelectable
            key={key}
            path={currentPath}
            designMode={stateApi.state.designMode}
            isSelected={isSelected}
            onSelect={handleSelect}
            onDelete={handleDelete}
        >
            {content}
        </ControlSurfaceSelectable>
    );

    switch (node.type) {
        case "divider":
            return wrapSelectable(<ControlSurfaceDivider {...node} />, `divider-${index}`);

        case "enumButtons":
            return wrapSelectable(
                <ControlSurfaceEnumButtons {...node} initialValue={stateApi.state.symbolValues[node.symbol]} />,
                `enumButtons-${index}`,
            );

        case "knob":
            // New PropControl-based implementation
            return (
                <ControlSurfaceKnobProp
                    key={`knob-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                />
            );

        case "label":
            return wrapSelectable(
                <ControlSurfaceLabel {...node} />,
                `label-${index}`,
            );

        case "number":
            // New PropControl-based implementation
            return (
                <ControlSurfaceNumberProp
                    key={`number-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                />
            );

        case "slider":
            // New PropControl-based implementation
            return (
                <ControlSurfaceSliderProp
                    key={`slider-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                />
            );

        case "string":
            // New PropControl-based implementation
            return (
                <ControlSurfaceStringProp
                    key={`string-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                />
            );

        case "toggle":
            // New PropControl-based implementation
            return (
                <ControlSurfaceToggleProp
                    key={`toggle-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                />
            );

        case "triggerButton":
            return wrapSelectable(
                <ControlSurfaceTriggerButton {...node} />,
                `triggerButton-${index}`,
            );

        case "group":
        case "column":
        case "row":
            return wrapSelectable(
                <ControlSurfaceGroup
                    {...node}
                    layout={node.type}
                    renderControl={renderControlSurfaceControl}
                    //symbolValues={stateApi.state.symbolValues}
                    //pollIntervalMs={stateApi.state.pollIntervalMs}
                    parentPath={currentPath}
                    //designMode={stateApi.state.designMode}
                    //selectedPath={stateApi.state.selectedControlPath}
                    onSelectPath={options.onSelectPath}
                />,
                `group-${index}`,
            );
        case "tabs":
            return wrapSelectable(
                <ControlSurfaceTabs
                    {...node}
                    renderControl={renderControlSurfaceControl}
                    //symbolValues={stateApi.state.symbolValues}
                    //pollIntervalMs={stateApi.state.pollIntervalMs}
                    parentPath={currentPath}
                    //designMode={stateApi.state.designMode}
                    //selectedPath={stateApi.state.selectedControlPath}
                    onSelectPath={options.onSelectPath}
                />,
                `tabs-${index}`,
            );

        case "page":
            return wrapSelectable(
                <div className="control-surface-page">
                    <h3 className="control-surface-page-title">{node.label}</h3>
                    <div className="control-surface-page-content">
                        {node.controls.map((child, childIndex) =>
                            renderControlSurfaceControl(child, childIndex, api, stateApi, {
                                ...options,
                                parentPath: currentPath,
                            }),
                        )}
                    </div>
                </div>,
                `page-${index}`,
            );

        default:
            return wrapSelectable(<div>Unknown control type.</div>, `unknown-${index}`);
    }
};
