import React from "react";

import "./NumericUpDown.css";

interface TextInputProps {
    value: string;
    onChange: (newValue: string) => void;
    disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = (props) => {
    return <input
        type="text"
        className="text-input__input"
        disabled={props.disabled}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
    />
};
