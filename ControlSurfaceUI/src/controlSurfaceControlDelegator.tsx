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

export const renderControlSurfaceControl = (
    node: ControlSurfaceNode,
    index: number,
    api: ControlSurfaceApi,
    symbolValues: Record<string, any>,
    pollIntervalMs: number,
): JSX.Element => {
    switch (node.type) {
        case "divider":
            return <ControlSurfaceDivider key={`divider-${index}`} {...node} />;

        case "enumButtons":
            return <ControlSurfaceEnumButtons key={`enumButtons-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "knob":
            return <ControlSurfaceKnob key={`knob-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "label":
            return <ControlSurfaceLabel key={`label-${index}`} {...node} api={api} pollIntervalMs={pollIntervalMs} />;

        case "number":
            return <ControlSurfaceNumber key={`number-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "slider":
            return <ControlSurfaceSlider key={`slider-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "string":
            return <ControlSurfaceString key={`string-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "toggle":
            return <ControlSurfaceToggle key={`toggle-${index}`} {...node} api={api} initialValue={symbolValues?.[node.symbol]} />;

        case "triggerButton":
            return <ControlSurfaceTriggerButton key={`triggerButton-${index}`} {...node} api={api} />;

        case "group":
            return (
                <ControlSurfaceGroup
                    key={`group-${index}`}
                    {...node}
                    api={api}
                    renderControl={renderControlSurfaceControl}
                    symbolValues={symbolValues}
                    pollIntervalMs={pollIntervalMs}
                />
            );

        case "tabs":
            return (
                <ControlSurfaceTabs
                    key={`tabs-${index}`}
                    {...node}
                    api={api}
                    renderControl={renderControlSurfaceControl}
                    symbolValues={symbolValues}
                    pollIntervalMs={pollIntervalMs}
                />
            );

        case "page":
            return (
                <div key={`page-${index}`} className="control-surface-page">
                    <h3 className="control-surface-page-title">{node.label}</h3>
                    <div className="control-surface-page-content">
                        {node.controls.map((child, childIndex) =>
                            renderControlSurfaceControl(child, childIndex, api, symbolValues, pollIntervalMs),
                        )}
                    </div>
                </div>
            );

        default:
            return <div key={`unknown-${index}`}>Unknown control type.</div>;
    }
};
