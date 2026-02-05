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
import { AddControlControl } from "../AddControlControl";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { Tab, TabPanel } from "../basic/Tabs";
import { buildControlPath, buildTabPath, isPathEqual } from "../controlPathBase";
import type { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { collectSymbolsForTabs, copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { ControlSurfaceApi, ControlSurfaceTabsSpec } from "../defs";
import { DndContainer, DndDraggable } from "../dnd";
import { ControlSurfaceStateApi, useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { createDesignTools, createPropControlClasses } from "../utils/designTools";

export interface ControlSurfaceTabsProps extends ControlSurfaceTabsSpec {
    renderControl: (
        node: any,
        index: number,
        api: ControlSurfaceApi,
        stateApi: ControlSurfaceStateApi,
        options: ControlSurfaceRenderOptions,
    ) => JSX.Element;
    parentPath: string[];
    onSelectPath: (path: string[], node: any) => void;
    onDeletePath: (path: string[], node: any) => void;
    onSetMoveDestination?: (pathOverride?: string[]) => void;
    onMoveToDestination?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    selected: boolean;
    isMoveDestination: boolean;
}

export const ControlSurfaceTabs: React.FC<ControlSurfaceTabsProps> = ({
    tabs,
    renderControl,
    parentPath,
    onSelectPath,
    onDeletePath,
    selected,
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
    const wrappedSetMoveDestination = React.useCallback((pathOverride?: string[]) => {
        if (onSetMoveDestination) {
            // Build path to the currently selected tab
            const tabPath = buildTabPath(parentPath, selectedTabId);
            onSetMoveDestination(tabPath);
        } else {
            //console.log(`[TABS] wrappedSetMoveDestination: onSetMoveDestination is undefined`);
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

    // move destination path is not going to equal the control path directly; calculate it.
    let isRealMoveDestination = false;
    if (stateApi.state.moveDestinationPath) {
        // get parent of move destination path
        const parentOfMoveDestinationPath = stateApi.state.moveDestinationPath.slice(0, -1);
        //console.log(`[TABS] parentOfMoveDestinationPath: ${JSON.stringify(parentOfMoveDestinationPath)}, this control's tab path: ${JSON.stringify(buildTabPath(parentPath, selectedTabId))}`);
        isRealMoveDestination = isPathEqual(parentOfMoveDestinationPath, parentPath);
    }

    // when the selected tab changes, and we're the move destination, we need to update the move destination path
    React.useEffect(() => {
        if (isRealMoveDestination) {
            //console.log(`[TABS] useEffect: updating move destination path due to tab change to tab ${selectedTabId}`);
            wrappedSetMoveDestination();
        }
    }, [selectedTabId]);

    return (
        <div className={createPropControlClasses({
            designMode: stateApi.state.designMode,
            selected,
            disabled: false,
            isMoveDestination: isRealMoveDestination,
            additionalClasses: "control-surface-tabs-wrapper cs-pp-control-tabs cs-pp-control-container"
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
