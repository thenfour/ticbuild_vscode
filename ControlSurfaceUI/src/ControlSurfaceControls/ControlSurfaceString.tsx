/*

not yet necessary to have maxlength et al; just allow single line string. multi-line in the future.

{
    "type": "string",
    label: string;
    symbol: string;
}

*/

import React from "react";
import { ControlSurfaceStringSpec, ControlSurfaceApi } from "../defs";

export interface ControlSurfaceStringProps extends ControlSurfaceStringSpec {
    api?: ControlSurfaceApi;
}

export const ControlSurfaceString: React.FC<ControlSurfaceStringProps> = ({ label, symbol, api }) => {
    const [value, setValue] = React.useState<string>("");

    // Fetch initial value on mount
    React.useEffect(() => {
        api?.postMessage({ type: "getSymbol", symbol });
    }, [symbol, api]);

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
