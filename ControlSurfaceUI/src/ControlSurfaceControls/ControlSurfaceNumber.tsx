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
import { useSymbolBinding } from "../hooks/useSymbolBinding";

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
    const { value, onChange } = useSymbolBinding<number>(symbol, initialValue ?? min);

    return (
        <div>
            <label>{label}</label>
            <NumericUpDown
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
};
