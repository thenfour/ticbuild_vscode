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
import { ControlSurfaceNumberSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceNumberProps extends ControlSurfaceNumberSpec {
      api?: ControlSurfaceApi;
}

export const ControlSurfaceNumber: React.FC<ControlSurfaceNumberProps> = ({
      label,
      symbol,
      min = 0,
      max = 100,
      step = 0.1,
      api
}) => {
      const [value, setValue] = React.useState<number>(min);

      // Fetch initial value on mount
      React.useEffect(() => {
            api?.postMessage({ type: "getSymbol", symbol });
      }, [symbol, api]);

      const handleChange = (newValue: number) => {
            setValue(newValue);
            api?.postMessage({ type: "setSymbol", symbol, value: newValue });
      };

      return (
            <div className="control-surface-number">
                  <label className="control-surface-label">{label}</label>
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
