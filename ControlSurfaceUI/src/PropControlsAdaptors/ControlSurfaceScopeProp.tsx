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
    const [paused, setPaused] = React.useState(false);

    const resolvedRateHz = Number.isFinite(rateHz) && (rateHz ?? 0) > 0 ? (rateHz as number) : DEFAULT_SCOPE_RATE_HZ;
    const rangeMode = range ?? DEFAULT_SCOPE_RANGE;
    const sampleCount = Math.max(1, Math.round(width ?? DEFAULT_SCOPE_WIDTH));

    const resolvedSeries = React.useMemo(() => {
        return (series ?? []).slice(0, MAX_SCOPE_SERIES).map((entry, index) => {
            const key = makePlotSeriesKey(entry.expression, resolvedRateHz, sampleCount);
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

    const expressions = React.useMemo(() => (
        (series ?? []).slice(0, MAX_SCOPE_SERIES)
            .map((entry) => entry.expression)
            .filter(Boolean)
    ), [series]);

    const expressionsKey = React.useMemo(
        () => expressions.join("|"),
        [expressions],
    );

    React.useEffect(() => {
        if (!api || expressions.length === 0) {
            return;
        }

        //api.log?.(`[scope] subscribe (${expressions.join(", ")}) @ ${resolvedRateHz}Hz`);
        expressions.forEach((expression) => api.subscribePlotSeries(expression, resolvedRateHz, sampleCount));

        return () => {
            //api.log?.(`[scope] unsubscribe (${expressions.join(", ")}) @ ${resolvedRateHz}Hz`);
            expressions.forEach((expression) => api.unsubscribePlotSeries(expression, resolvedRateHz, sampleCount));
        };
    }, [api, expressionsKey, resolvedRateHz, sampleCount]);

    React.useEffect(() => {
        if (!api) {
            return;
        }
        expressions.forEach((expression) => api.setPlotPaused(expression, resolvedRateHz, paused, sampleCount));
    }, [api, expressionsKey, resolvedRateHz, paused, sampleCount]);

    const lastLengthsRef = React.useRef<Record<string, number>>({});

    React.useEffect(() => {
        if (!api) {
            return;
        }
        expressions.forEach((expression) => {
            const key = makePlotSeriesKey(expression, resolvedRateHz, sampleCount);
            const values = stateApi.state.plotData?.[key]?.values ?? [];
            const prev = lastLengthsRef.current[key];
            if (prev !== values.length) {
                lastLengthsRef.current[key] = values.length;
                //api.log?.(`[scope] data ${expression} @ ${resolvedRateHz}Hz -> ${values.length} samples`);
            }
        });
    }, [api, expressionsKey, resolvedRateHz, sampleCount, stateApi.state.plotData]);

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
            paused={paused}
            setPaused={setPaused}
            designMode={designMode}
            isConnected={isConnected}
            selected={selected}
            bindingStatus={""}
            bindingStatusSeverity="error"
            designTools={designTools}
        />
    );
};
