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
import { TabPanel, Tab } from "../basic/Tabs";
import { ControlSurfaceTabsSpec, ControlSurfaceApi } from "../defs";
import type { ControlSurfaceRenderOptions } from "../controlSurfaceControlDelegator";
import { buildTabPath } from "../controlPathBase";
import { AddControlControl } from "../AddControlControl";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { ControlSurfaceStateApi, useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { createDesignTools, createPropControlClasses } from "../utils/designTools";

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
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
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
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
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

    const designTools = stateApi.state.designMode
        ? createDesignTools({
            onMoveUp,
            onMoveDown,
            onDelete,
            onSettings,
        })
        : null;

    return (
        <div className={createPropControlClasses({
            designMode: stateApi.state.designMode,
            selected: false,
            disabled: false,
            additionalClasses: "control-surface-tabs-wrapper cs-pp-control-tabs"
        })}>
            {stateApi.state.designMode && designTools ? (
                <ButtonGroup className="cs-pp-design-tools">
                    {designTools}
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
                            {tab.controls.map((child, childIndex) =>
                                renderControl(child, childIndex, api, stateApi, {
                                    parentPath: buildTabPath(parentPath, index),
                                    // designMode,
                                    // selectedPath,
                                    onSelectPath,
                                })
                            )}
                        </div>
                        <AddControlControl parentPath={buildTabPath(parentPath, index)} />
                    </Tab>
                ))}
            </TabPanel>
        </div>
    );
};
