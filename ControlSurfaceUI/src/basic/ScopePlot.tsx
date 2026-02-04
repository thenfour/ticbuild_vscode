import React, { useEffect, useMemo, useRef } from "react";
import "./ScopePlot.css";
import { DEFAULT_SCOPE_HEIGHT, DEFAULT_SCOPE_WIDTH } from "../scopeConstants";

export type ScopeRangeMode = "autoUnified" | "autoPerSeries";

export type ScopeSeriesData = {
    values: number[];
    min?: number;
    max?: number;
    color: string;
};

export interface ScopePlotProps {
    width?: number;
    height?: number;
    rangeMode?: ScopeRangeMode;
    series: ScopeSeriesData[];
}

const DEFAULT_WIDTH = DEFAULT_SCOPE_WIDTH;
const DEFAULT_HEIGHT = DEFAULT_SCOPE_HEIGHT;

const finiteValues = (values: number[]) => values.filter((value) => Number.isFinite(value));

const computeRange = (values: number[]): { min: number; max: number } | null => {
    const filtered = finiteValues(values);
    if (filtered.length === 0) {
        return null;
    }
    let min = filtered[0];
    let max = filtered[0];
    for (const v of filtered) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    if (min === max) {
        return { min, max: min + 1 };
    }
    return { min, max };
};

export const ScopePlot: React.FC<ScopePlotProps> = ({
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    rangeMode = "autoUnified",
    series,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const ranges = useMemo(() => {
        const computed = series.map((item) => ({
            fixed: item.min != null || item.max != null,
            min: item.min,
            max: item.max,
            auto: computeRange(item.values),
        }));

        if (rangeMode === "autoUnified") {
            let unifiedMin: number | null = null;
            let unifiedMax: number | null = null;
            computed.forEach((item) => {
                if (item.fixed || !item.auto) {
                    return;
                }
                unifiedMin = unifiedMin == null ? item.auto.min : Math.min(unifiedMin, item.auto.min);
                unifiedMax = unifiedMax == null ? item.auto.max : Math.max(unifiedMax, item.auto.max);
            });

            return computed.map((item) => {
                if (item.fixed) {
                    const min = item.min ?? item.auto?.min ?? 0;
                    const max = item.max ?? item.auto?.max ?? min + 1;
                    return { min, max };
                }
                if (unifiedMin == null || unifiedMax == null) {
                    return item.auto ?? { min: 0, max: 1 };
                }
                return { min: unifiedMin, max: unifiedMax };
            });
        }

        return computed.map((item) => {
            if (item.fixed) {
                const min = item.min ?? item.auto?.min ?? 0;
                const max = item.max ?? item.auto?.max ?? min + 1;
                return { min, max };
            }
            return item.auto ?? { min: 0, max: 1 };
        });
    }, [series, rangeMode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(width * pixelRatio));
        canvas.height = Math.max(1, Math.floor(height * pixelRatio));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();
        context.scale(pixelRatio, pixelRatio);

        context.fillStyle = "var(--vscode-input-background)";
        context.fillRect(0, 0, width, height);

        context.strokeStyle = "var(--vscode-panel-border)";
        context.lineWidth = 1;
        context.strokeRect(0.5, 0.5, width - 1, height - 1);

        series.forEach((item, index) => {
            const values = item.values;
            if (!values || values.length < 2) {
                return;
            }
            const range = ranges[index] ?? { min: 0, max: 1 };
            const span = range.max - range.min;
            if (!Number.isFinite(span) || span === 0) {
                return;
            }

            context.strokeStyle = item.color;
            context.lineWidth = 1.25;
            context.beginPath();

            const lastIndex = values.length - 1;
            for (let i = 0; i < values.length; i += 1) {
                const value = values[i];
                if (!Number.isFinite(value)) {
                    continue;
                }
                const x = (i / lastIndex) * (width - 1);
                const t = (value - range.min) / span;
                const y = height - 1 - t * (height - 1);
                if (i === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }

            context.stroke();
        });

        context.restore();
    }, [series, ranges, width, height]);

    return (
        <div className="scope-plot">
            <canvas ref={canvasRef} />
        </div>
    );
};
