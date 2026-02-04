import { buildControlPath, isPathEqual } from "./controlPathBase";
import { ControlSurfaceTabs } from "./ControlSurfaceControls/ControlSurfaceTabs";
import { ControlSurfaceApi, ControlSurfaceNode } from "./defs";
import { ControlSurfaceStateApi } from "./hooks/ControlSurfaceState";
import { ControlSurfaceDividerProp } from "./PropControlsAdaptors/ControlSurfaceDividerProp";
import { ControlSurfaceEnumButtonsProp } from "./PropControlsAdaptors/ControlSurfaceEnumButtonsProp";
import { ControlSurfaceKnobProp } from "./PropControlsAdaptors/ControlSurfaceKnobProp";
import { ControlSurfaceLabelProp } from "./PropControlsAdaptors/ControlSurfaceLabelProp";
import { ControlSurfaceNumberProp } from "./PropControlsAdaptors/ControlSurfaceNumberProp";
import { ControlSurfacePageProp } from "./PropControlsAdaptors/ControlSurfacePageProp";
import { ControlSurfaceSliderProp } from "./PropControlsAdaptors/ControlSurfaceSliderProp";
import { ControlSurfaceScopeProp } from "./PropControlsAdaptors/ControlSurfaceScopeProp";
import { ControlSurfaceStringProp } from "./PropControlsAdaptors/ControlSurfaceStringProp";
import { ControlSurfaceToggleProp } from "./PropControlsAdaptors/ControlSurfaceToggleProp";
import { ControlSurfaceTriggerButtonProp } from "./PropControlsAdaptors/ControlSurfaceTriggerButtonProp";
import { ControlSurfaceXYProp } from "./PropControlsAdaptors/ControlSurfaceXYProp";
import { ControlSurfaceGroup } from "./ControlSurfaceControls/ControlSurfaceGroup";

export type ControlSurfaceRenderOptions = {
    parentPath: string[] | undefined; // the "root page" has no parent path.
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
    if (!options.parentPath) {
        throw new Error("parentPath is required in ControlSurfaceRenderOptions");
    }
    const currentPath = buildControlPath(options.parentPath, index);
    const isSelected = isPathEqual(stateApi.state.selectedControlPath, currentPath);

    const handleSelect = options.onSelectPath
        ? (path: string[]) => options.onSelectPath?.(path, node)
        : undefined;
    const handleDelete = options.onDeletePath
        ? (path: string[]) => options.onDeletePath?.(path, node)
        : undefined;

    switch (node.type) {
        case "divider":
            // New PropControl-based implementation
            return (
                <ControlSurfaceDividerProp
                    key={`divider-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "enumButtons":
            // New PropControl-based implementation
            return (
                <ControlSurfaceEnumButtonsProp
                    key={`enumButtons-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
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
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "label":
            // New PropControl-based implementation
            return (
                <ControlSurfaceLabelProp
                    key={`label-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
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
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
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
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "xy":
            return (
                <ControlSurfaceXYProp
                    key={`xy-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "scope":
            return (
                <ControlSurfaceScopeProp
                    key={`scope-${index}`}
                    {...node}
                    path={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
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
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
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
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "triggerButton":
            // New PropControl-based implementation
            return (
                <ControlSurfaceTriggerButtonProp
                    key={`triggerButton-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        case "group":
        case "column":
        case "row":
            return (
                <ControlSurfaceGroup
                    key={`${node.type}-${index}`}
                    {...node}
                    layout={node.type}
                    renderControl={renderControlSurfaceControl}
                    parentPath={currentPath}
                    onSelectPath={options.onSelectPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />);
        case "tabs":
            return (
                <ControlSurfaceTabs
                    key={`${node.type}-${index}`}
                    {...node}
                    renderControl={renderControlSurfaceControl}
                    parentPath={currentPath}
                    onSelectPath={options.onSelectPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />);

        case "page":
            // New PropControl-based implementation
            return (
                <ControlSurfacePageProp
                    key={`page-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    renderControl={renderControlSurfaceControl}
                    api={api}
                    stateApi={stateApi}
                    options={options}
                    currentPath={currentPath}
                    onMoveUp={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "up" })}
                    onMoveDown={() => api?.postMessage?.({ type: "moveControl", path: currentPath, direction: "down" })}
                    onDelete={() => handleDelete?.(currentPath)}
                    onSettings={() => options.onSelectPath?.(currentPath, node)}
                />
            );

        default:
            return <div>Unknown control type.</div>;
    }
};
