import { clamp, clamp01 } from "../utils";
import "./XY2.css";
import React, { PointerEvent, useCallback, useMemo, useRef, useState } from "react";

export interface XY2Props {
    valueX: number;
    valueY: number;
    onChange: (valueX: number, valueY: number) => void;

    minX?: number;
    maxX?: number;
    stepX?: number;

    minY?: number;
    maxY?: number;
    stepY?: number;

    centerX?: number;
    centerY?: number;

    defaultX?: number;
    defaultY?: number;

    label?: string;

    formatValueX?: (value: number) => string;
    formatValueY?: (value: number) => string;

    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;

    showValue?: boolean;
}

const snapValue = (value: number, min: number, max: number, step?: number): number => {
    const clamped = clamp(value, min, max);
    if (!step || step <= 0) {
        return clamped;
    }
    const snapped = Math.round((clamped - min) / step) * step + min;
    return clamp(snapped, min, max);
};

export const XY2: React.FC<XY2Props> = ({
    valueX,
    valueY,
    onChange,
    minX = 0,
    maxX = 1,
    stepX,
    minY = 0,
    maxY = 1,
    stepY,
    centerX,
    centerY,
    defaultX,
    defaultY,
    label,
    formatValueX,
    formatValueY,
    disabled = false,
    className,
    style,
    showValue = true,
}) => {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const minMaxX = useMemo(() => {
        if (maxX === minX) {
            return { min: 0, max: 1 };
        }
        return { min: minX, max: maxX };
    }, [minX, maxX]);

    const minMaxY = useMemo(() => {
        if (maxY === minY) {
            return { min: 0, max: 1 };
        }
        return { min: minY, max: maxY };
    }, [minY, maxY]);

    const defaultXValue = useMemo(() => {
        if (defaultX != null) return defaultX;
        return (minMaxX.min + minMaxX.max) / 2;
    }, [defaultX, minMaxX]);

    const defaultYValue = useMemo(() => {
        if (defaultY != null) return defaultY;
        return (minMaxY.min + minMaxY.max) / 2;
    }, [defaultY, minMaxY]);

    const centerXValue = useMemo(() => {
        if (centerX != null) return centerX;
        return (minMaxX.min + minMaxX.max) / 2;
    }, [centerX, minMaxX]);

    const centerYValue = useMemo(() => {
        if (centerY != null) return centerY;
        return (minMaxY.min + minMaxY.max) / 2;
    }, [centerY, minMaxY]);

    const unitFromExternalX = useCallback(
        (external: number) => (external - minMaxX.min) / (minMaxX.max - minMaxX.min),
        [minMaxX],
    );

    const unitFromExternalY = useCallback(
        (external: number) => (external - minMaxY.min) / (minMaxY.max - minMaxY.min),
        [minMaxY],
    );

    const externalFromUnitX = useCallback(
        (unit: number) => {
            const clamped = clamp01(unit);
            const raw = minMaxX.min + clamped * (minMaxX.max - minMaxX.min);
            return snapValue(raw, minMaxX.min, minMaxX.max, stepX);
        },
        [minMaxX, stepX],
    );

    const externalFromUnitY = useCallback(
        (unit: number) => {
            const clamped = clamp01(unit);
            const raw = minMaxY.min + clamped * (minMaxY.max - minMaxY.min);
            return snapValue(raw, minMaxY.min, minMaxY.max, stepY);
        },
        [minMaxY, stepY],
    );

    const unitX = useMemo(() => clamp01(unitFromExternalX(valueX)), [valueX, unitFromExternalX]);
    const unitY = useMemo(() => clamp01(unitFromExternalY(valueY)), [valueY, unitFromExternalY]);

    const centerUnitX = useMemo(() => clamp01(unitFromExternalX(centerXValue)), [centerXValue, unitFromExternalX]);
    const centerUnitY = useMemo(() => clamp01(unitFromExternalY(centerYValue)), [centerYValue, unitFromExternalY]);

    const formattedX = useMemo(() => {
        const snapped = snapValue(valueX, minMaxX.min, minMaxX.max, stepX);
        return formatValueX ? formatValueX(snapped) : snapped.toFixed(2);
    }, [formatValueX, minMaxX, stepX, valueX]);

    const formattedY = useMemo(() => {
        const snapped = snapValue(valueY, minMaxY.min, minMaxY.max, stepY);
        return formatValueY ? formatValueY(snapped) : snapped.toFixed(2);
    }, [formatValueY, minMaxY, stepY, valueY]);

    const updateFromEvent = useCallback((event: PointerEvent<HTMLDivElement>) => {
        const rect = surfaceRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const rawX = (event.clientX - rect.left) / rect.width;
        const rawY = 1 - (event.clientY - rect.top) / rect.height;

        const nextX = externalFromUnitX(rawX);
        const nextY = externalFromUnitY(rawY);
        onChange(nextX, nextY);
    }, [externalFromUnitX, externalFromUnitY, onChange]);

    const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;

        if ((event.ctrlKey || event.metaKey) && (defaultXValue != null || defaultYValue != null)) {
            event.preventDefault();
            onChange(defaultXValue, defaultYValue);
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        setIsDragging(true);
        updateFromEvent(event);
    }, [disabled, defaultXValue, defaultYValue, onChange, updateFromEvent]);

    const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (!isDragging || disabled) return;
        updateFromEvent(event);
    }, [disabled, isDragging, updateFromEvent]);

    const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // ignore
        }
        setIsDragging(false);
    }, [isDragging]);

    const ariaLabel = label ?? "XY";

    return (
        <div className={`somatic-xy ${className ?? ""}`} style={style}>
            <div
                ref={surfaceRef}
                className="somatic-xy-surface"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="slider"
                aria-label={ariaLabel}
                aria-disabled={disabled}
                aria-valuetext={`X: ${formattedX}, Y: ${formattedY}`}
            >
                <div
                    className="somatic-xy-center"
                    style={{
                        left: `${centerUnitX * 100}%`,
                        top: `${(1 - centerUnitY) * 100}%`,
                    }}
                >
                    <span className="somatic-xy-center-line somatic-xy-center-line--h" />
                    <span className="somatic-xy-center-line somatic-xy-center-line--v" />
                </div>
                <div
                    className="somatic-xy-thumb"
                    style={{
                        left: `${unitX * 100}%`,
                        top: `${(1 - unitY) * 100}%`,
                    }}
                />
            </div>
            {showValue && (
                <div className="somatic-xy-value">
                    <span>X: {formattedX}</span>
                    <span className="somatic-xy-value-sep">·</span>
                    <span>Y: {formattedY}</span>
                </div>
            )}
        </div>
    );
};
