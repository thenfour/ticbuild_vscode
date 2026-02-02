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
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";

export interface ControlSurfaceStringProps extends ControlSurfaceStringSpec {
    initialValue?: string;
}

export const ControlSurfaceString: React.FC<ControlSurfaceStringProps> = ({ label, symbol, initialValue }) => {
    const api = useControlSurfaceApi();
    const [value, setValue] = React.useState<string>(initialValue ?? "");

    // Update value when initialValue changes
    React.useEffect(() => {
        if (initialValue !== undefined) {
            setValue(initialValue);
        }
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        api?.postMessage({ type: "setSymbol", symbol, value: newValue });
    };

    return (
        <div className="control-surface-string">
            <label className="control-surface-label">{label}</label>
            <input
                type="text"
                className="control-surface-string-input"
                value={value}
                onChange={handleChange}
            />
        </div>
    );
};
