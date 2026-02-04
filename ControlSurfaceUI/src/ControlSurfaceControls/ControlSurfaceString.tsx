/*

not yet necessary to have maxlength et al; just allow single line string. multi-line in the future.

{
    "type": "string",
    label: string;
    symbol: string;
}

*/

import React from "react";
import { ControlSurfaceStringSpec } from "../defs";
import { useSymbolBinding } from "../hooks/useSymbolBinding";

export interface ControlSurfaceStringProps extends ControlSurfaceStringSpec {
    initialValue?: string;
}

export const ControlSurfaceString: React.FC<ControlSurfaceStringProps> = ({ label, symbol, initialValue }) => {
    const { value, onChange } = useSymbolBinding<string>(symbol, initialValue ?? "");

    return (
        <div className="control-surface-string">
            <label className="control-surface-label">{label}</label>
            <input
                type="text"
                className="control-surface-string-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};
