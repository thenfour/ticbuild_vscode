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
import { ControlSurfaceKnobSpec } from "../defs";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceKnobProps extends ControlSurfaceKnobSpec {
  initialValue?: number;
}

export const ControlSurfaceKnob: React.FC<ControlSurfaceKnobProps> = ({
  label,
  symbol,
  min = 0,
  max = 1,
  step = 0.01,
  size = "medium", // Note: size is currently not used by Knob component
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
