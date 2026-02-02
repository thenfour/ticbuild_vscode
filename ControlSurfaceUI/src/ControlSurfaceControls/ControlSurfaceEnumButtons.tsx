/*


 {
      type: "enumButtons";
      label: string;
      symbol: string;
      options: { label?: string; value: string | number }[];
  }

*/

import React from "react";
import { EnumButtons } from "../basic/EnumButtons";
import { ControlSurfaceEnumButtonsSpec } from "../defs";
import { useControlSurfaceApi } from "../VsCodeApiContext";

export interface ControlSurfaceEnumButtonsProps extends ControlSurfaceEnumButtonsSpec {
  initialValue?: string | number;
}

export const ControlSurfaceEnumButtons: React.FC<ControlSurfaceEnumButtonsProps> = ({
  label,
  symbol,
  options,
  initialValue
}) => {
  const api = useControlSurfaceApi();
  const [value, setValue] = React.useState<string | number>(initialValue ?? options[0]?.value ?? "");

  // Update value when initialValue changes
  React.useEffect(() => {
    if (initialValue !== undefined) {
      setValue(initialValue);
    }
  }, [initialValue]);

  const handleChange = (newValue: string | number) => {
    setValue(newValue);
    api?.postMessage({ type: "setSymbol", symbol, value: newValue });
  };

  return (
    <div className="control-surface-enum-buttons">
      <label className="control-surface-label">{label}</label>
      <EnumButtons
        options={options}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};
