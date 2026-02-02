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

export interface ControlSurfaceTabsProps extends ControlSurfaceTabsSpec {
    api: ControlSurfaceApi;
    renderControl: (
        node: any,
        index: number,
        api: ControlSurfaceApi,
        symbolValues: Record<string, any>,
        pollIntervalMs: number,
        options: ControlSurfaceRenderOptions,
    ) => JSX.Element;
    symbolValues: Record<string, any>;
    pollIntervalMs: number;
    parentPath: string[];
    designMode: boolean;
    selectedPath?: string[] | null;
    onSelectPath?: (path: string[], node: any) => void;
}

export const ControlSurfaceTabs: React.FC<ControlSurfaceTabsProps> = ({
    tabs,
    api,
    renderControl,
    symbolValues,
    pollIntervalMs,
    parentPath,
    designMode,
    selectedPath,
    onSelectPath,
}) => {
    const [selectedTabId, setSelectedTabId] = React.useState<number>(0);

    const handleTabChange = (e: React.SyntheticEvent | undefined, newTabId: number) => {
        setSelectedTabId(newTabId);
    };

    return (
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
                            renderControl(child, childIndex, api, symbolValues, pollIntervalMs, {
                                parentPath: buildTabPath(parentPath, index),
                                designMode,
                                selectedPath,
                                onSelectPath,
                            })
                        )}
                    </div>
                    <AddControlControl api={api} parentPath={buildTabPath(parentPath, index)} disabled={designMode} />
                </Tab>
            ))}
        </TabPanel>
    );
};
