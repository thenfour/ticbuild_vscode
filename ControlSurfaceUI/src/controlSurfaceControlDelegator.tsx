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
import { isBlockedCopyDestination } from "./controlPathUtils";

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
    // const isSelected = isPathEqual(stateApi.state.selectedControlPath, currentPath);

    // const handleSelect = options.onSelectPath
    //     ? (path: string[]) => options.onSelectPath?.(path, node)
    //     : undefined;

    const handleDelete = options.onDeletePath
        ? (path: string[]) => options.onDeletePath?.(path, node)
        : undefined;

    const deleteProc = () => handleDelete?.(currentPath);
    const settingsProc = () => options.onSelectPath?.(currentPath, node);

    const isMoveDestination = isPathEqual(stateApi.state.moveDestinationPath, currentPath);
    const setAsDestinationPath = () => {
        if (isMoveDestination) {
            stateApi.setMoveDestinationPath(null);
            console.log(`clearing move destination path`);
        } else {
            console.log(`setting move destination path to: ${JSON.stringify(currentPath)}`);
            stateApi.setMoveDestinationPath(currentPath);
        }
    }

    const containerProps = {
        onSetMoveDestination: setAsDestinationPath,
        renderControl: renderControlSurfaceControl,
        isMoveDestination,
    };

    // you can move to destination if:
    // - there is a move destination path
    // - it's not going to cause issues in the tree.
    let isBlockedByTree = true;
    if (stateApi.state.moveDestinationPath) {
        isBlockedByTree = isBlockedCopyDestination(stateApi.state.moveDestinationPath, currentPath);
    }
    const canMoveToDestination = (!!stateApi.state.moveDestinationPath) && !isBlockedByTree;
    const moveToDestinationProc = canMoveToDestination ? () => {
        // todo;
        console.log(`Move '${JSON.stringify(currentPath)}' to destination: ${JSON.stringify(stateApi.state.moveDestinationPath)}`);
    } : undefined;

    const commonProps = {
        onDelete: deleteProc,
        onSettings: settingsProc,
        onMoveToDestination: moveToDestinationProc,
    }
    switch (node.type) {
        case "divider":
            return (
                <ControlSurfaceDividerProp
                    key={`divider-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    {...commonProps}
                />
            );

        case "enumButtons":
            return (
                <ControlSurfaceEnumButtonsProp
                    key={`enumButtons-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "knob":
            return (
                <ControlSurfaceKnobProp
                    key={`knob-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "label":
            return (
                <ControlSurfaceLabelProp
                    key={`label-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    {...commonProps}
                />
            );

        case "number":
            return (
                <ControlSurfaceNumberProp
                    key={`number-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "slider":
            return (
                <ControlSurfaceSliderProp
                    key={`slider-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "xy":
            return (
                <ControlSurfaceXYProp
                    key={`xy-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "scope":
            return (
                <ControlSurfaceScopeProp
                    key={`scope-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "string":
            return (
                <ControlSurfaceStringProp
                    key={`string-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "toggle":
            return (
                <ControlSurfaceToggleProp
                    key={`toggle-${index}`}
                    {...node}
                    path={currentPath}
                    {...commonProps}
                />
            );

        case "triggerButton":
            return (
                <ControlSurfaceTriggerButtonProp
                    key={`triggerButton-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    {...commonProps}
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
                    onSelectPath={options.onSelectPath}
                    onDeletePath={options.onDeletePath}
                    parentPath={currentPath}
                    {...commonProps}
                    {...containerProps}
                />);
        case "tabs":
            return (
                <ControlSurfaceTabs
                    key={`${node.type}-${index}`}
                    {...node}
                    parentPath={currentPath}
                    {...commonProps}
                    {...containerProps}
                />);

        case "page":
            return (
                <ControlSurfacePageProp
                    key={`page-${index}`}
                    spec={node}
                    path={JSON.stringify(currentPath)}
                    api={api}
                    stateApi={stateApi}
                    options={options}
                    currentPath={currentPath}
                    {...commonProps}
                    {...containerProps}
                />
            );

        default:
            return <div>Unknown control type.</div>;
    }
};
