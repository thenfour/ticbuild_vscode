import React from "react";
import { Button } from "./Buttons/PushButton";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { ControlSurfaceNode, ControlSurfaceApi } from "./defs";
import { ControlRegistry } from "./controlRegistry";
import { PagePropertiesPanel } from "./ControlSurfacePropertiesPanels";
import { ControlSurfaceStateApi } from "./hooks/ControlSurfaceState";

export type ControlSurfacePropertiesPanelContainerProps = {
    resolvedSelection: { node: ControlSurfaceNode; index: number; parentControls: ControlSurfaceNode[] } | null;
    draftNode: ControlSurfaceNode | null;
    draftDirty: boolean;
    setDraftNode: (node: ControlSurfaceNode) => void;
    setDraftDirty: (dirty: boolean) => void;
    handleApplyDraft: () => void;
    handleCancelDraft: () => void;
    api: ControlSurfaceApi | undefined;
    stateApi: ControlSurfaceStateApi;
    setSelectedControlPath: React.Dispatch<React.SetStateAction<string[] | null>>;
};

export const ControlSurfacePropertiesPanelContainer: React.FC<ControlSurfacePropertiesPanelContainerProps> = ({
    resolvedSelection,
    draftNode,
    draftDirty,
    setDraftNode,
    setDraftDirty,
    handleApplyDraft,
    handleCancelDraft,
    api,
    stateApi,
    setSelectedControlPath,
}) => {
    if (!stateApi.state.designMode || !resolvedSelection) {
        return null;
    }

    const activeNode = draftNode ?? resolvedSelection.node;
    const entry = ControlRegistry.getByType(activeNode.type);
    const PropertiesPanel = entry?.propertiesPanelComponent;

    return (
        <div className="control-surface-properties-panel">
            <div className="control-surface-properties-header">
                <div className="control-surface-properties-title">
                    Selected: {resolvedSelection.node.type}
                </div>
            </div>
            <ButtonGroup>
                <Button onClick={handleApplyDraft} disabled={!draftDirty}>
                    Apply
                </Button>
                <Button onClick={handleCancelDraft} disabled={!draftDirty}>
                    Cancel
                </Button>
            </ButtonGroup>
            <ButtonGroup>
                <Button
                    onClick={() => {
                        if (!stateApi.state.selectedControlPath) {
                            return;
                        }
                        api?.postMessage({
                            type: "deleteControl",
                            path: stateApi.state.selectedControlPath,
                        });
                        setSelectedControlPath(null);
                    }}
                >
                    Delete
                </Button>
                <Button
                    onClick={() => {
                        if (!stateApi.state.selectedControlPath || !resolvedSelection) {
                            return;
                        }
                        const nextIndex = resolvedSelection.index - 1;
                        if (nextIndex < 0) {
                            return;
                        }
                        const nextPath = [...stateApi.state.selectedControlPath];
                        nextPath[nextPath.length - 1] = `c${nextIndex}`;
                        api?.postMessage({
                            type: "moveControl",
                            path: stateApi.state.selectedControlPath,
                            direction: "up",
                        });
                        setSelectedControlPath(nextPath);
                    }}
                    disabled={resolvedSelection.index === 0}
                >
                    Move Up
                </Button>
                <Button
                    onClick={() => {
                        if (!stateApi.state.selectedControlPath || !resolvedSelection) {
                            return;
                        }
                        const nextIndex = resolvedSelection.index + 1;
                        if (nextIndex >= resolvedSelection.parentControls.length) {
                            return;
                        }
                        const nextPath = [...stateApi.state.selectedControlPath];
                        nextPath[nextPath.length - 1] = `c${nextIndex}`;
                        api?.postMessage({
                            type: "moveControl",
                            path: stateApi.state.selectedControlPath,
                            direction: "down",
                        });
                        setSelectedControlPath(nextPath);
                    }}
                    disabled={resolvedSelection.index >= resolvedSelection.parentControls.length - 1}
                >
                    Move Down
                </Button>
            </ButtonGroup>

            <div style={{ marginTop: 12 }}>
                {(() => {
                    if (!PropertiesPanel) {
                        if (activeNode.type === "page") {
                            return (
                                <PagePropertiesPanel
                                    node={activeNode}
                                    onChange={(nextNode) => {
                                        setDraftNode(nextNode);
                                        setDraftDirty(true);
                                    }}
                                />
                            );
                        }
                        return (
                            <div className="control-surface-properties-hint">
                                No editable properties for this control.
                            </div>
                        );
                    }
                    return (
                        <PropertiesPanel
                            node={activeNode}
                            onChange={(nextNode: ControlSurfaceNode) => {
                                setDraftNode(nextNode);
                                setDraftDirty(true);
                            }}
                        />
                    );
                })()}
            </div>
        </div>
    );
};
