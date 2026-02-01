/*

// boolean datatype. renders as a <CheckboxButton>

{
      type: "toggle";
      label: string;
      symbol: string;
    }
      
*/

import React from "react";
import { CheckboxButton } from "../Buttons/CheckboxButton";
import { ControlSurfaceToggleSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceToggleProps extends ControlSurfaceToggleSpec {
  api?: ControlSurfaceApi;
}

export const ControlSurfaceToggle: React.FC<ControlSurfaceToggleProps> = ({ label, symbol, api }) => {
  const [checked, setChecked] = React.useState<boolean>(false);

  // Fetch initial value on mount
  React.useEffect(() => {
    api?.postMessage({ type: "getSymbol", symbol });
  }, [symbol, api]);

  const handleChange = (newValue: boolean) => {
    setChecked(newValue);
    api?.postMessage({ type: "setSymbol", symbol, value: newValue });
  };

  return (
    <CheckboxButton
      checked={checked}
      onChange={handleChange}
    >
      {label}
    </CheckboxButton>
  );
};
