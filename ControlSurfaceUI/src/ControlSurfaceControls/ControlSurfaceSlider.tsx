/*
// should be similar to knob, numbers
{
      type: "slider";
      label: string;
      symbol: string;
      min?: number;
      max?: number;
      step?: number;
    }

*/

import React from "react";
import { ControlSurfaceSliderSpec } from "../defs";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceSliderProps extends ControlSurfaceSliderSpec {
  initialValue?: number;
}

export const ControlSurfaceSlider: React.FC<ControlSurfaceSliderProps> = ({
  label,
  symbol,
  min = 0,
  max = 100,
  step = 1,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    api?.postMessage({ type: "setSymbol", symbol, value: newValue });
  };

  return (
    <div className="control-surface-slider">
      <label className="control-surface-label">{label}</label>
      <input
        type="range"
        className="control-surface-slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
      />
      <span className="control-surface-slider-value">{value}</span>
    </div>
  );
};
