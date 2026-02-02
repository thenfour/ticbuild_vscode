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
import { ControlSurfaceSelectable } from "./ControlSurfaceSelectable";
import { buildControlPath, isPathEqual } from "./controlPath";

export type ControlSurfaceRenderOptions = {
    parentPath: string[];
    designMode: boolean;
    selectedPath?: string[] | null;
    onSelectPath?: (path: string[], node: ControlSurfaceNode) => void;
    onDeletePath?: (path: string[], node: ControlSurfaceNode) => void;
};

export const renderControlSurfaceControl = (
    node: ControlSurfaceNode,
    index: number,
    api: ControlSurfaceApi,
    symbolValues: Record<string, any>,
    pollIntervalMs: number,
    options: ControlSurfaceRenderOptions,
): JSX.Element => {
    const currentPath = buildControlPath(options.parentPath, index);
    const isSelected = isPathEqual(options.selectedPath, currentPath);

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
            designMode={options.designMode}
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
                <ControlSurfaceEnumButtons {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `enumButtons-${index}`,
            );

        case "knob":
            return wrapSelectable(
                <ControlSurfaceKnob {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `knob-${index}`,
            );

        case "label":
            return wrapSelectable(
                <ControlSurfaceLabel {...node} api={api} pollIntervalMs={pollIntervalMs} />,
                `label-${index}`,
            );

        case "number":
            return wrapSelectable(
                <ControlSurfaceNumber {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `number-${index}`,
            );

        case "slider":
            return wrapSelectable(
                <ControlSurfaceSlider {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `slider-${index}`,
            );

        case "string":
            return wrapSelectable(
                <ControlSurfaceString {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `string-${index}`,
            );

        case "toggle":
            return wrapSelectable(
                <ControlSurfaceToggle {...node} api={api} initialValue={symbolValues?.[node.symbol]} />,
                `toggle-${index}`,
            );

        case "triggerButton":
            return wrapSelectable(
                <ControlSurfaceTriggerButton {...node} api={api} />,
                `triggerButton-${index}`,
            );

        case "group":
            return wrapSelectable(
                <ControlSurfaceGroup
                    {...node}
                    api={api}
                    renderControl={renderControlSurfaceControl}
                    symbolValues={symbolValues}
                    pollIntervalMs={pollIntervalMs}
                    parentPath={currentPath}
                    designMode={options.designMode}
                    selectedPath={options.selectedPath}
                    onSelectPath={options.onSelectPath}
                />,
                `group-${index}`,
            );

        case "tabs":
            return wrapSelectable(
                <ControlSurfaceTabs
                    {...node}
                    api={api}
                    renderControl={renderControlSurfaceControl}
                    symbolValues={symbolValues}
                    pollIntervalMs={pollIntervalMs}
                    parentPath={currentPath}
                    designMode={options.designMode}
                    selectedPath={options.selectedPath}
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
                            renderControlSurfaceControl(child, childIndex, api, symbolValues, pollIntervalMs, {
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
