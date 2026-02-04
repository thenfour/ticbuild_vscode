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
import { useSymbolBinding } from "../hooks/useSymbolBinding";

export interface ControlSurfaceToggleProps extends ControlSurfaceToggleSpec {
  initialValue?: boolean;
}

export const ControlSurfaceToggle: React.FC<ControlSurfaceToggleProps> = ({ label, symbol, initialValue }) => {
  const { value: checked, onChange } = useSymbolBinding<boolean>(symbol, initialValue ?? false);

  return (
    <CheckboxButton
      checked={checked}
      onChange={onChange}
    >
      {label}
    </CheckboxButton>
  );
};
