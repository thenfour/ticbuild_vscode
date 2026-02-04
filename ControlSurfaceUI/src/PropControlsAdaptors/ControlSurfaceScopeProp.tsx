import React from "react";
import { ControlSurfaceScopeSpec } from "../defs";
import { PropControlScope } from "../PropControls/PropControlScope";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import { createDesignTools } from "../utils/designTools";
import { DEFAULT_SCOPE_HEIGHT, DEFAULT_SCOPE_RATE_HZ, DEFAULT_SCOPE_RANGE, DEFAULT_SCOPE_WIDTH, MAX_SCOPE_SERIES } from "../scopeConstants";
import { makePlotSeriesKey, SCOPE_SERIES_COLORS } from "../plotUtils";

export interface ControlSurfaceScopePropProps extends ControlSurfaceScopeSpec {
    path: string[];
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
}

export const ControlSurfaceScopeProp: React.FC<ControlSurfaceScopePropProps> = ({
    label,
    rateHz,
    range,
    width,
    height,
    series,
    path,
    onMoveUp,
    onMoveDown,
    onDelete,
    onSettings,
}) => {
    const api = useControlSurfaceApi();
    const stateApi = useControlSurfaceState();
    const designMode = stateApi.state.designMode;
    const selected = JSON.stringify(stateApi.state.selectedControlPath) === JSON.stringify(path);
    const isConnected = stateApi.state.connectionState === "connected";

    const resolvedRateHz = Number.isFinite(rateHz) && (rateHz ?? 0) > 0 ? (rateHz as number) : DEFAULT_SCOPE_RATE_HZ;
    const rangeMode = range ?? DEFAULT_SCOPE_RANGE;

    const resolvedSeries = React.useMemo(() => {
        return (series ?? []).slice(0, MAX_SCOPE_SERIES).map((entry, index) => {
            const key = makePlotSeriesKey(entry.expression, resolvedRateHz);
            const payload = stateApi.state.plotData?.[key];
            return {
                expression: entry.expression,
                values: payload?.values ?? [],
                min: entry.min,
                max: entry.max,
                color: SCOPE_SERIES_COLORS[index % SCOPE_SERIES_COLORS.length],
            };
        });
    }, [series, resolvedRateHz, stateApi.state.plotData]);

    React.useEffect(() => {
        if (!api) {
            return;
        }
        const expressions = (series ?? []).slice(0, MAX_SCOPE_SERIES)
            .map((entry) => entry.expression)
            .filter(Boolean);

        expressions.forEach((expression) => api.subscribePlotSeries(expression, resolvedRateHz));

        return () => {
            expressions.forEach((expression) => api.unsubscribePlotSeries(expression, resolvedRateHz));
        };
    }, [api, series, resolvedRateHz]);

    const designTools = designMode
        ? createDesignTools({
            onMoveUp,
            onMoveDown,
            onDelete,
            onSettings,
        })
        : null;

    return (
        <PropControlScope
            label={label}
            width={width ?? DEFAULT_SCOPE_WIDTH}
            height={height ?? DEFAULT_SCOPE_HEIGHT}
            rangeMode={rangeMode}
            series={resolvedSeries}
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            bindingStatus={""}
            bindingStatusSeverity="error"
            designTools={designTools}
        />
    );
};
