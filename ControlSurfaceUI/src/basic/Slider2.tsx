// A linear slider component based on Knob2.tsx
// Features:
//
// - mouse capture on click + drag up & down OR left & right to affect value
// - ctrl+click to set default
// - shift for fine control
// - min / max / step props; the most basic usage can be a drop-in replacement for <input type="range" />
// - value formatter / parser support
// - show current value and label
// - themed colors
// - caller can specify delta sensitivity
// - highlight from center value to current value.
//
// future features:
// - double-click to type value
// - accept keyboard focus;
//   - left/right or up/down to change value by step
//
// internally we use 0-1; externally the user defines mapping & formatting.
// renders as divs for easier layout
// track background is a horizontal bar
// from the center value to the current value is a highlighted bar
// a thumb circle at the current value position
//
// label is shown (handled by parent/PropControl)
// value is drawn at the right of the slider
//
// width: 100% to fill container
// height: fixed

import { clampRange, clamp01 } from "../utils";
import "./Slider2.css";
import React, {
    useCallback,
    useMemo,
    useRef,
    useState,
    PointerEvent,
} from "react";

export interface Slider2Props {
    /** Controlled value (external domain). */
    value: number;
    /** Called whenever the value changes due to user interaction. */
    onChange: (value: number) => void;

    /** Minimum and maximum external values (for linear mapping). */
    min?: number;
    max?: number;
    /** Step size in external units. If omitted, no snapping is applied. */
    step?: number;

    /** Default value for Ctrl+click reset. Defaults to midpoint between min and max. */
    defaultValue?: number;

    /** Optional "center" value in external units for the highlight bar. Defaults to midpoint. */
    centerValue?: number;

    /** Optional label shown (typically handled by parent). */
    label?: string;

    /** Optional mapping from external value -> normalized [0, 1]. */
    toUnit?: (external: number) => number;
    /** Optional mapping from normalized [0, 1] -> external value. */
    fromUnit?: (unit: number) => number;

    /** Format the value for display. */
    formatValue?: (value: number) => string;
    // Parse a typed value (future: double-click to edit).
    // converts to external domain
    parseValue?: (text: string) => number | null;

    /**
     * Approximate pixels of drag for a full sweep from min to max.
     * Larger = slower / finer, smaller = faster / coarser.
     */
    dragSensitivity?: number;

    /**
     * Scale applied to drag delta when Shift is held.
     * E.g. 0.2 means "5x finer" when Shift is pressed.
     */
    fineTuneScale?: number;
    normalDeltaScale?: number;

    /** Disable interaction. */
    disabled?: boolean;

    /** Additional class name for outer container. */
    className?: string;
    style?: React.CSSProperties;

    /** Whether to show the value text. Default: true */
    showValue?: boolean;
}

export const Slider2: React.FC<Slider2Props> = ({
    value,
    onChange,
    min = 0,
    max = 1,
    step,
    defaultValue,
    centerValue,
    label,

    toUnit,
    fromUnit,

    formatValue,
    //parseValue, // currently unused, future double-click to type
    dragSensitivity = 150,
    fineTuneScale = 0.025,
    normalDeltaScale = 0.4,
    disabled = false,
    className,
    style,
    showValue = true,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    const dragStateRef = useRef<{
        startX: number;
        startUnit: number;
        lastShiftKey: boolean;
    } | null>(null);

    const minMaxFixed = useMemo(() => {
        // Avoid zero span; fall back to [0,1] if invalid.
        if (max === min) {
            return { min: 0, max: 1 };
        }
        return { min, max };
    }, [min, max]);

    const defaultVal = useMemo(() => {
        if (defaultValue != null) return defaultValue;
        return (minMaxFixed.min + minMaxFixed.max) / 2;
    }, [defaultValue, minMaxFixed]);

    const centerValExternal = useMemo(() => {
        if (centerValue != null) return centerValue;
        return (minMaxFixed.min + minMaxFixed.max) / 2;
    }, [centerValue, minMaxFixed]);

    const unitFromExternalUnclamped = useCallback(
        (external: number): number => {
            let unit = toUnit
                ? toUnit(external)
                : (external - minMaxFixed.min) / (minMaxFixed.max - minMaxFixed.min);
            return unit;
        },
        [toUnit, minMaxFixed],
    );

    const externalFromUnit = useCallback(
        (unit: number): number => {
            const clamped = clamp01(unit);
            const raw = fromUnit
                ? fromUnit(clamped)
                : minMaxFixed.min + clamped * (minMaxFixed.max - minMaxFixed.min);

            if (!step || step <= 0) {
                return clampRange(raw, minMaxFixed.min, minMaxFixed.max);
            }

            const snapped =
                Math.round((raw - minMaxFixed.min) / step) * step + minMaxFixed.min;
            return clampRange(snapped, minMaxFixed.min, minMaxFixed.max);
        },
        [fromUnit, minMaxFixed, step],
    );

    const { unitValueClamped, unitValueUnclamped, oob } = useMemo(() => {
        const unitValueUnclamped = unitFromExternalUnclamped(value);
        const unitValueClamped = clamp01(unitValueUnclamped);
        const oob = unitValueUnclamped < 0 || unitValueUnclamped > 1;
        return { unitValueClamped, unitValueUnclamped, oob };
    }, [value, unitFromExternalUnclamped]);

    const unitCenter = useMemo(
        () => unitFromExternalUnclamped(centerValExternal),
        [centerValExternal, unitFromExternalUnclamped],
    );

    // External-domain value corresponding to the current slider position.
    const valueExternalForDisplay = useMemo(
        () => externalFromUnit(unitValueUnclamped),
        [externalFromUnit, unitValueUnclamped],
    );

    const formattedValue = useMemo(() => {
        if (formatValue) return formatValue(valueExternalForDisplay);
        return valueExternalForDisplay.toFixed(2);
    }, [formatValue, valueExternalForDisplay]);

    const handlePointerDown = useCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            if (disabled) return;

            // Ctrl+click (or Cmd+click on macOS) resets to default and does NOT start drag.
            if ((e.ctrlKey || e.metaKey) && defaultVal != null) {
                e.preventDefault();
                onChange(defaultVal);
                return;
            }

            const track = e.currentTarget;
            track.setPointerCapture(e.pointerId);
            e.preventDefault();

            dragStateRef.current = {
                startX: e.clientX,
                startUnit: unitValueClamped,
                lastShiftKey: e.shiftKey,
            };
            setIsDragging(true);
        },
        [disabled, defaultVal, onChange, unitValueClamped],
    );

    const handlePointerMove = useCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            if (!isDragging || !dragStateRef.current || disabled) return;

            const state = dragStateRef.current;
            const dx = e.clientX - state.startX;

            // If the user toggles Shift mid-drag, re-baseline from the *current* value so
            // the slider doesn't jump back toward the drag-start value.
            if (state.lastShiftKey !== e.shiftKey) {
                const prevScale = state.lastShiftKey ? fineTuneScale : normalDeltaScale;
                const prevDeltaUnit = (dx / dragSensitivity) * prevScale;
                const unitAtTransition = clamp01(state.startUnit + prevDeltaUnit);

                state.startX = e.clientX;
                state.startUnit = unitAtTransition;
                state.lastShiftKey = e.shiftKey;

                onChange(externalFromUnit(unitAtTransition));
                return;
            }

            const fineScale = e.shiftKey ? fineTuneScale : normalDeltaScale;
            const deltaUnit = (dx / dragSensitivity) * fineScale; // drag right = increase value

            const nextUnit = clamp01(state.startUnit + deltaUnit);
            const nextExternal = externalFromUnit(nextUnit);

            onChange(nextExternal);
        },
        [
            isDragging,
            disabled,
            dragSensitivity,
            fineTuneScale,
            normalDeltaScale,
            externalFromUnit,
            onChange,
        ],
    );

    const endDrag = useCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            if (!isDragging) return;

            const track = e.currentTarget;
            try {
                track.releasePointerCapture(e.pointerId);
            } catch {
                // ignore if already released
            }

            dragStateRef.current = null;
            setIsDragging(false);
        },
        [isDragging],
    );

    const handlePointerUp = useCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            if (!isDragging) return;
            e.preventDefault();
            endDrag(e);
        },
        [endDrag, isDragging],
    );

    const handlePointerLeave = useCallback(
        (e: PointerEvent<HTMLDivElement>) => {
            // Do not end drag on leave; pointer capture keeps events coming.
            // Only end if button is up.
            if (isDragging && e.buttons === 0) {
                endDrag(e);
            }
        },
        [endDrag, isDragging],
    );

    // Calculate positions for highlight bar
    const highlightStyle = useMemo(() => {
        const left = Math.min(unitCenter, unitValueClamped) * 100;
        const right = Math.max(unitCenter, unitValueClamped) * 100;
        return {
            left: `${left}%`,
            width: `${right - left}%`,
        };
    }, [unitCenter, unitValueClamped]);

    const thumbStyle = useMemo(() => {
        return {
            left: `${unitValueClamped * 100}%`,
        };
    }, [unitValueClamped]);

    const ariaLabel = label ?? "Slider";

    return (
        <div className={`somatic-slider ${className || ""}`} style={style}>
            <div className="somatic-slider-container">
                {/* Track */}
                <div
                    ref={trackRef}
                    className="somatic-slider-track"
                    style={{
                        cursor: disabled ? "default" : "ew-resize",
                        touchAction: "none",
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    role="slider"
                    aria-label={ariaLabel}
                    aria-valuemin={minMaxFixed.min}
                    aria-valuemax={minMaxFixed.max}
                    aria-valuenow={valueExternalForDisplay}
                    aria-disabled={disabled || undefined}
                >
                    {/* Highlight bar from center to current value */}
                    <div
                        className="somatic-slider-highlight"
                        style={highlightStyle}
                    />

                    {/* Thumb */}
                    <div
                        className={`somatic-slider-thumb ${oob ? "somatic-slider-thumb--error" : ""}`}
                        style={thumbStyle}
                    />
                </div>

                {/* Value text */}
                {showValue && (
                    <div className="somatic-slider-value">{formattedValue}</div>
                )}
            </div>
        </div>
    );
};
