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
import { ControlSurfaceToggleSpec } from "../defs";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceToggleProps extends ControlSurfaceToggleSpec {
  initialValue?: boolean;
}

export const ControlSurfaceToggle: React.FC<ControlSurfaceToggleProps> = ({ label, symbol, initialValue }) => {
  const api = useControlSurfaceApi();
  const [checked, setChecked] = React.useState<boolean>(initialValue ?? false);

  // Update value when initialValue changes
  React.useEffect(() => {
    if (initialValue !== undefined) {
      setChecked(initialValue);
    }
  }, [initialValue]);

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
