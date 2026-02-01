/*

 {
      type: "knob";
      label: string;
      symbol: string;
      min?: number;
      max?: number;
      step?: number;
      size?: "small" | "medium" | "large";
  }
*/

import React from "react";
import { Knob } from "../basic/Knob2";
import { ControlSurfaceKnobSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceKnobProps extends ControlSurfaceKnobSpec {
  api?: ControlSurfaceApi;
}

export const ControlSurfaceKnob: React.FC<ControlSurfaceKnobProps> = ({
  label,
  symbol,
  min = 0,
  max = 1,
  step = 0.01,
  size = "medium", // Note: size is currently not used by Knob component
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
    <Knob
      label={label}
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
    />
  );
};
