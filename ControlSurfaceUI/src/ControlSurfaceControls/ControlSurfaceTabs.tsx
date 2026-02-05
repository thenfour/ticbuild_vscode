/*

conceptually a multi-group which displays tabs to switch between different sets of controls.
each tab is basically a group, where the group label is rendered as a tab.

{
    "kind": "tabs",
    "tabs": {
        "label": string,
        "controls": ControlSurfaceNode[]
    }[]
}

*/

import React from "react";
import { DndContainer, DndDraggable } from "../dnd";
import { TabPanel, Tab } from "../basic/Tabs";
import { ControlSurfaceTabsSpec, ControlSurfaceApi } from "../defs";
import type { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { buildControlPath, buildTabPath } from "../controlPathBase";
import { AddControlControl } from "../AddControlControl";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { ControlSurfaceStateApi, useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { createDesignTools, createPropControlClasses } from "../utils/designTools";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { collectSymbolsForTabs, copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";

export interface ControlSurfaceTabsProps extends ControlSurfaceTabsSpec {
    renderControl: (
        node: any,
        index: number,
        api: ControlSurfaceApi,
        stateApi: ControlSurfaceStateApi,
        // symbolValues: Record<string, any>,
        // pollIntervalMs: number,
        options: ControlSurfaceRenderOptions,
    ) => JSX.Element;
    // symbolValues: Record<string, any>;
    // pollIntervalMs: number;
    parentPath: string[];
    // designMode: boolean;
    // selectedPath?: string[] | null;
    onSelectPath?: (path: string[], node: any) => void;
    onDeletePath?: (path: string[], node: any) => void;
    onSetMoveDestination?: (path: string[] | null) => void;
    onMoveToDestination?: () => void;
    // onMoveUp?: () => void;
    // onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    isMoveDestination: boolean;
}

export const ControlSurfaceTabs: React.FC<ControlSurfaceTabsProps> = ({
    tabs,
    renderControl,
    // symbolValues,
    // pollIntervalMs,
    parentPath,
    // designMode,
    // selectedPath,
    onSelectPath,
    onDeletePath,
    // onMoveUp,
    // onMoveDown,
    onDelete,
    onSettings,
    isMoveDestination,
    onSetMoveDestination,
    onMoveToDestination,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const [selectedTabId, setSelectedTabId] = React.useState<number>(0);

    const handleTabChange = (e: React.SyntheticEvent | undefined, newTabId: number) => {
        setSelectedTabId(newTabId);
    };

    if (!api) {
        return null;
    }

    // Wrap onSetMoveDestination to include the currently selected tab path
    const wrappedSetMoveDestination = React.useCallback(() => {
        if (onSetMoveDestination) {
            // Build path to the currently selected tab
            const tabPath = buildTabPath(parentPath, selectedTabId);
            onSetMoveDestination(tabPath);
        }
    }, [onSetMoveDestination, parentPath, selectedTabId]);

    const designTools = stateApi.state.designMode
        ? createDesignTools({
            onDelete,
            onSettings,
            onSetMoveDestination: wrappedSetMoveDestination,
            onMoveToDestination,
        })
        : null;

    const symbols = React.useMemo(() => collectSymbolsForTabs(tabs), [tabs]);

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            symbols,
            stateApi.state.expressionResults ?? {},
            api?.showWarningMessage,
        );
    }, [api?.showWarningMessage, stateApi.state.expressionResults, symbols]);

    const copyTools = !stateApi.state.designMode
        ? <PropControl.CopyButton onClick={handleCopy} />
        : null;

    const handleDrop = React.useCallback((tabPath: string[], dropResult: any) => {
        if (!api || !stateApi.state.designMode) {
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
            targetParentPath: tabPath,
            targetIndex: addedIndex,
        });
    }, [api, stateApi.state.designMode]);

    const shouldAcceptDrop = React.useCallback(() => stateApi.state.designMode, [stateApi.state.designMode]);

    return (
        <div className={createPropControlClasses({
            designMode: stateApi.state.designMode,
            selected: false,
            disabled: false,
            isMoveDestination: isMoveDestination,
            additionalClasses: "control-surface-tabs-wrapper cs-pp-control-tabs  cs-pp-control-container"
        })}>
            {stateApi.state.designMode && designTools ? (
                <ButtonGroup className="cs-pp-design-tools">
                    {designTools}
                </ButtonGroup>
            ) : null}
            {!stateApi.state.designMode && copyTools ? (
                <ButtonGroup className="cs-pp-copy-tools">
                    {copyTools}
                </ButtonGroup>
            ) : null}
            <TabPanel
                selectedTabId={selectedTabId}
                handleTabChange={(e, id) => handleTabChange(e, id as number)}
                className="control-surface-tabs"
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        thisTabId={index}
                        summaryTitle={tab.label}
                    >
                        <div className="control-surface-tab-content">
                            <DndContainer
                                groupName="control-surface-controls"
                                orientation="vertical"
                                disabled={!stateApi.state.designMode}
                                shouldAcceptDrop={shouldAcceptDrop}
                                dragHandleSelector=".cs-dnd-handle"
                                onDrop={(dropResult: any) => handleDrop(buildTabPath(parentPath, index), dropResult)}
                                getChildPayload={(childIndex: number) => ({ sourcePath: buildControlPath(buildTabPath(parentPath, index), childIndex) })}
                                dropPlaceholder={{ animationDuration: 150, showOnTop: true, className: "cs-dnd-drop-placeholder" }}
                                className="cs-dnd-container"
                            >
                                {tab.controls.map((child, childIndex) => (
                                    <DndDraggable key={`tab-${index}-${childIndex}`}>
                                        {renderControl(child, childIndex, api, stateApi, {
                                            parentPath: buildTabPath(parentPath, index),
                                            // designMode,
                                            // selectedPath,
                                            onSelectPath,
                                            onDeletePath,
                                        })}
                                    </DndDraggable>
                                ))}
                            </DndContainer>
                        </div>
                        <AddControlControl parentPath={buildTabPath(parentPath, index)} />
                    </Tab>
                ))}
            </TabPanel>
        </div>
    );
};
