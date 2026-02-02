/*
renders as a <NumericUpDown>
// similar schema to knob, which allows easy swapping controls.
{
      type: "knob";
      label: string;
      symbol: string;
      min?: number;
      max?: number;
      step?: number;
}

*/

import React from "react";
import { NumericUpDown } from "../basic/NumericUpDown";
import { ControlSurfaceNumberSpec } from "../defs";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceNumberProps extends ControlSurfaceNumberSpec {
    initialValue?: number;
}

export const ControlSurfaceNumber: React.FC<ControlSurfaceNumberProps> = ({
    label,
    symbol,
    min = 0,
    max = 100,
    step = 0.1,
    initialValue
}) => {
    const api = useControlSurfaceApi();
    const [value, setValue] = React.useState<number>(initialValue ?? min);

    // Update value when initialValue changes
    React.useEffect(() => {
        if (initialValue !== undefined) {
            setValue(initialValue);
        }
    }, [initialValue]);

    const handleChange = (newValue: number) => {
        setValue(newValue);
        api?.postMessage({ type: "setSymbol", symbol, value: newValue });
    };

    return (
        <div>
            <label>{label}</label>
            <NumericUpDown
                value={value}
                onChange={handleChange}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
};
