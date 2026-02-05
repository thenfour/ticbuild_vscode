import React from "react";
import { ControlSurfaceXYSpec } from "../defs";
import { PropControlXY } from "../PropControls/PropControlXY";
import { PropControl } from "../PropControlsBase/PropControlShell";
import { useSymbolBinding } from "../hooks/useSymbolBinding";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { copyLuaAssignmentsToClipboard } from "../controlSurfaceCopy";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceXYPropProps extends ControlSurfaceXYSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    onMoveToDestination?: () => void;
}

/**
 * Control Surface wrapper for PropControlXY.
 * Handles symbol binding, state management, and design mode integration.
 */
export const ControlSurfaceXYProp: React.FC<ControlSurfaceXYPropProps> = ({
    label,
    x,
    y,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
    onMoveToDestination,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();

    const minX = x.min ?? 0;
    const maxX = x.max ?? 100;
    const stepX = x.step ?? 1;

    const minY = y.min ?? 0;
    const maxY = y.max ?? 100;
    const stepY = y.step ?? 1;

    const xBinding = useSymbolBinding<number>(x.symbol, minX);
    const yBinding = useSymbolBinding<number>(y.symbol, minY);

    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === JSON.stringify(path);
    const isConnected = stateApi.state.connectionState === "connected";

    const designTools = designMode
        ? createDesignTools({
            onMoveUp,
            onMoveDown,
            onDelete,
            onSettings,
            onMoveToDestination,
        })
        : null;

    const bindingStatus = [
        xBinding.bindingStatus ? `X: ${xBinding.bindingStatus}` : "",
        yBinding.bindingStatus ? `Y: ${yBinding.bindingStatus}` : "",
    ].filter(Boolean).join(" | ");

    const handleChange = React.useCallback((nextX: number, nextY: number) => {
        if (nextX !== xBinding.value) {
            xBinding.onChange(nextX);
        }
        if (nextY !== yBinding.value) {
            yBinding.onChange(nextY);
        }
    }, [xBinding, yBinding]);

    const handleCopy = React.useCallback(() => {
        void copyLuaAssignmentsToClipboard(
            [x.symbol, y.symbol],
            stateApi.state.expressionResults ?? {},
            api?.showWarningMessage,
        );
    }, [api?.showWarningMessage, stateApi.state.expressionResults, x.symbol, y.symbol]);

    const copyTools = !designMode
        ? <PropControl.CopyButton onClick={handleCopy} />
        : null;

    return (
        <PropControlXY
            label={label}
            valueX={xBinding.value}
            valueY={yBinding.value}
            onChange={handleChange}
            minX={minX}
            maxX={maxX}
            stepX={stepX}
            centerX={x.center ?? minX}
            sizeX={x.size}
            minY={minY}
            maxY={maxY}
            stepY={stepY}
            centerY={y.center ?? minY}
            sizeY={y.size}
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            bindingStatus={bindingStatus}
            bindingStatusSeverity="error"
            designTools={designTools}
            copyTools={copyTools}
        />
    );
};
