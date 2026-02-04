import React from "react";
import { DndContainer, DndDraggable } from "../dnd";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { ControlSurfacePageSpec, ControlSurfaceNode, ControlSurfaceApi } from "../defs";
import { ControlSurfaceStateApi } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { AddControlControl } from "../AddControlControl";
import { buildControlPath } from "../controlPathBase";
import { collectSymbolsForNodes, copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";

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

    const symbols = React.useMemo(() => collectSymbolsForNodes(spec.controls), [spec.controls]);

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            symbols,
            stateApi.state.expressionResults ?? {},
            api.showWarningMessage,
        );
    }, [api.showWarningMessage, stateApi.state.expressionResults, symbols]);

    const copyTools = !stateApi.state.designMode
        ? <PropControl.CopyButton onClick={handleCopy} />
        : null;

    const handleDrop = React.useCallback((dropResult: any) => {
        if (!stateApi.state.designMode) {
            return;
        }
        const { addedIndex, payload } = dropResult;
        if (addedIndex === null || addedIndex === undefined) {
            return;
        }
        const sourcePath = (payload as { sourcePath?: string[] } | undefined)?.sourcePath;
        if (!sourcePath) {
            return;
        }
        api.postMessage({
            type: "reorderControl",
            sourcePath,
            targetParentPath: currentPath,
            targetIndex: addedIndex,
        });
    }, [api, currentPath, stateApi.state.designMode]);

    const shouldAcceptDrop = React.useCallback(() => stateApi.state.designMode, [stateApi.state.designMode]);

    return (
        <PropControl.Page
            label={spec.label}
            designMode={stateApi.state.designMode}
            selected={JSON.stringify(stateApi.state.selectedControlPath) === path}
            designTools={designTools}
            copyTools={copyTools}
        >
            <DndContainer
                groupName="control-surface-controls"
                orientation="vertical"
                disabled={!stateApi.state.designMode}
                shouldAcceptDrop={shouldAcceptDrop}
                dragHandleSelector=".cs-dnd-handle"
                onDrop={handleDrop}
                getChildPayload={(index: number) => ({ sourcePath: buildControlPath(currentPath, index) })}
                dropPlaceholder={{ animationDuration: 150, showOnTop: true, className: "cs-dnd-drop-placeholder" }}
                className="cs-dnd-container"
            >
                {spec.controls.map((child, childIndex) => (
                    <DndDraggable key={`page-${childIndex}`}>
                        {renderControl(child, childIndex, api, stateApi, {
                            ...options,
                            parentPath: currentPath,
                        })}
                    </DndDraggable>
                ))}
            </DndContainer>
            <AddControlControl parentPath={currentPath} />
        </PropControl.Page>
    );
};



/*
just like page prop, but for the root "page". cannot be edited; it doesn't have a real spec node.
 */

export interface ControlSurfaceRootPagePropProps {
    spec: ControlSurfacePageSpec;
    //path: string;
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
}

export const ControlSurfaceRootPageProp: React.FC<ControlSurfaceRootPagePropProps> = ({
    spec,
    renderControl,
    api,
    stateApi,
    options,
    currentPath,
}) => {
    const symbols = React.useMemo(() => collectSymbolsForNodes(spec.controls), [spec.controls]);

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            symbols,
            stateApi.state.expressionResults ?? {},
            api.showWarningMessage,
        );
    }, [api.showWarningMessage, stateApi.state.expressionResults, symbols]);

    const handleDrop = React.useCallback((dropResult: any) => {
        if (!stateApi.state.designMode) {
            return;
        }
        const { addedIndex, payload } = dropResult;
        if (addedIndex === null || addedIndex === undefined) {
            return;
        }
        const sourcePath = (payload as { sourcePath?: string[] } | undefined)?.sourcePath;
        if (!sourcePath) {
            return;
        }
        api.postMessage({
            type: "reorderControl",
            sourcePath,
            targetParentPath: currentPath,
            targetIndex: addedIndex,
        });
    }, [api, currentPath, stateApi.state.designMode]);

    const shouldAcceptDrop = React.useCallback(() => stateApi.state.designMode, [stateApi.state.designMode]);

    return (
        <PropControl.Page
            label={spec.label}
            designMode={stateApi.state.designMode}
            selected={false}
            designTools={null}
            copyTools={!stateApi.state.designMode ? <PropControl.CopyButton onClick={handleCopy} /> : null}
        >
            <DndContainer
                groupName="control-surface-controls"
                orientation="vertical"
                disabled={!stateApi.state.designMode}
                shouldAcceptDrop={shouldAcceptDrop}
                dragHandleSelector=".cs-dnd-handle"
                onDrop={handleDrop}
                getChildPayload={(index: number) => ({ sourcePath: buildControlPath(currentPath, index) })}
                dropPlaceholder={{ animationDuration: 150, showOnTop: true, className: "cs-dnd-drop-placeholder" }}
                className="cs-dnd-container"
            >
                {spec.controls.map((child, childIndex) => (
                    <DndDraggable key={`root-${childIndex}`}>
                        {renderControl(child, childIndex, api, stateApi, {
                            ...options,
                            parentPath: currentPath,
                        })}
                    </DndDraggable>
                ))}
            </DndContainer>
            <AddControlControl parentPath={currentPath} />
        </PropControl.Page>
    );
};
