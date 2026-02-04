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
import { useSymbolBinding } from "../hooks/useSymbolBinding";

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
  const { value, onChange } = useSymbolBinding<number>(symbol, initialValue ?? min);

  //console.log("Rendering ControlSurfaceKnob with value:", value);

  return (
    <Knob
      label={label}
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={step}
    />
  );
};
