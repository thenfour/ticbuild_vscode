import React, { useEffect, useMemo, useRef } from "react";
import "./ScopePlot.css";
import { DEFAULT_SCOPE_HEIGHT, DEFAULT_SCOPE_WIDTH } from "../scopeConstants";
import { SmallChipIconButton } from "../Buttons/IconButton";
import { mdiPause, mdiPlay } from "@mdi/js";

export type ScopeRangeMode = "autoUnified" | "autoPerSeries";

export type ScopeSeriesData = {
    expression: string;
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
    paused: boolean;
    setPaused: (paused: boolean) => void;
}

const DEFAULT_WIDTH = DEFAULT_SCOPE_WIDTH;
const DEFAULT_HEIGHT = DEFAULT_SCOPE_HEIGHT;

const resolveCssColor = (value: string, fallback: string) => {
    if (!value) {
        return fallback;
    }
    if (!value.startsWith("var(")) {
        return value;
    }
    try {
        const match = value.match(/var\(([^,\)]+)/);
        const token = match?.[1]?.trim();
        if (!token) {
            return fallback;
        }
        const computed = getComputedStyle(document.documentElement).getPropertyValue(token);
        return computed?.trim() || fallback;
    } catch {
        return fallback;
    }
};

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
    paused,
    setPaused,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const emptyLoggedRef = useRef(false);
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
    const [hiddenIndices, setHiddenIndices] = React.useState<Set<number>>(() => new Set());

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

        context.fillStyle = resolveCssColor("var(--vscode-input-background)", "#1a1c2c");
        context.fillRect(0, 0, width, height);

        context.strokeStyle = resolveCssColor("var(--vscode-panel-border)", "#333c57");
        context.lineWidth = 1;
        context.strokeRect(0.5, 0.5, width - 1, height - 1);

        series.forEach((item, index) => {
            if (hiddenIndices.has(index)) {
                return;
            }
            const values = item.values;
            if (!values || values.length < 2) {
                return;
            }
            const range = ranges[index] ?? { min: 0, max: 1 };
            const span = range.max - range.min;
            if (!Number.isFinite(span) || span === 0) {
                return;
            }

            context.strokeStyle = resolveCssColor(item.color, "#41a6f6");
            context.lineWidth = 1.25;
            context.beginPath();

            const lastIndex = values.length - 1;
            let started = false;
            for (let i = 0; i < values.length; i += 1) {
                const value = values[i];
                if (!Number.isFinite(value)) {
                    continue;
                }
                const x = (i / lastIndex) * (width - 1);
                const t = (value - range.min) / span;
                const y = height - 1 - t * (height - 1);
                if (!started) {
                    context.moveTo(x, y);
                    started = true;
                } else {
                    context.lineTo(x, y);
                }
            }

            if (started) {
                context.stroke();
            }

            if (hoverIndex != null && hoverIndex >= 0 && hoverIndex < values.length) {
                const hoverValue = values[hoverIndex];
                if (Number.isFinite(hoverValue)) {
                    const hoverX = (hoverIndex / lastIndex) * (width - 1);
                    const hoverT = (hoverValue - range.min) / span;
                    const hoverY = height - 1 - hoverT * (height - 1);
                    context.fillStyle = resolveCssColor(item.color, "#41a6f6");
                    //context.strokeStyle = resolveCssColor("var(--vscode-editor-background)", "#1a1c2c");
                    //context.lineWidth = 1.25;
                    //context.beginPath();
                    //context.arc(hoverX, hoverY, 5, 0, Math.PI * 2);
                    //context.fill();
                    context.fillRect(hoverX - 3, hoverY - 3, 6, 6);
                    context.stroke();
                }
            }
        });

        if (!emptyLoggedRef.current) {
            const finiteCount = series.reduce((count, item) => count + finiteValues(item.values).length, 0);
            if (finiteCount === 0) {
                console.debug("[scope] no finite samples to draw", { seriesCount: series.length });
                emptyLoggedRef.current = true;
            }
        }

        context.restore();
    }, [series, ranges, width, height, hiddenIndices, hoverIndex]);

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const ratio = rect.width > 0 ? x / rect.width : 0;
        const clamped = Math.min(1, Math.max(0, ratio));
        const maxLen = Math.max(...series.map((item) => item.values.length), 0);
        if (maxLen <= 1) {
            setHoverIndex(null);
            return;
        }
        const index = Math.round(clamped * (maxLen - 1));
        setHoverIndex(index);
    };

    const handlePointerLeave = () => {
        setHoverIndex(null);
    };

    const formatLegendValue = (value: number | null | undefined) => {
        if (value == null || !Number.isFinite(value)) {
            return "—";
        }
        return value.toFixed(3);
    };

    const toggleHidden = (index: number) => {
        setHiddenIndices((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    return (
        <div className="scope-plot">
            <canvas
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
            />
            <div className="scope-plot-legend">
                {series.map((item, index) => {
                    const value = hoverIndex != null ? item.values[hoverIndex] : null;
                    const text = hoverIndex != null
                        ? `${item.expression} = ${formatLegendValue(value)}`
                        : item.expression;
                    const hidden = hiddenIndices.has(index);
                    return (
                        <button
                            type="button"
                            className={`scope-plot-legend-row ${hidden ? "scope-plot-legend-row--hidden" : ""}`}
                            key={`${item.expression}-${index}`}
                            onClick={() => toggleHidden(index)}
                        >
                            <span
                                className={`scope-plot-legend-swatch ${hidden ? "scope-plot-legend-swatch--hidden" : ""}`}
                                style={{
                                    borderColor: resolveCssColor(item.color, "#41a6f6"),
                                    background: hidden ? "transparent" : resolveCssColor(item.color, "#41a6f6"),
                                }}
                            />
                            <span className="scope-plot-legend-text">{text}</span>
                        </button>
                    );
                })}
                <SmallChipIconButton onClick={() => setPaused(!paused)} iconPath={paused ? mdiPlay : mdiPause} style={{ width: 40 }} />
            </div>
        </div>
    );
};
