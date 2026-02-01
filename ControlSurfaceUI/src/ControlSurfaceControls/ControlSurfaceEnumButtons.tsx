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
import { ControlSurfaceEnumButtonsSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceEnumButtonsProps extends ControlSurfaceEnumButtonsSpec {
  api?: ControlSurfaceApi;
}

export const ControlSurfaceEnumButtons: React.FC<ControlSurfaceEnumButtonsProps> = ({
  label,
  symbol,
  options,
  api
}) => {
  const [value, setValue] = React.useState<string | number>(options[0]?.value ?? "");

  // Fetch initial value on mount
  React.useEffect(() => {
    api?.postMessage({ type: "getSymbol", symbol });
  }, [symbol, api]);

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
