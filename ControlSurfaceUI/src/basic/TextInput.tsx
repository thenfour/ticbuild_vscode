import React from "react";

import "./NumericUpDown.css";
import { useDraftInput } from "../hooks/useDraftInput";

interface TextInputProps {
    value: string;
    onChange: (newValue: string) => void;
    disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = (props) => {
    const draft = useDraftInput<string>({
        value: props.value,
        format: (val) => val,
        parse: (text) => ({ value: text, isValid: true }),
        onCommit: props.onChange,
    });

    return <input
        type="text"
        className="text-input__input"
        disabled={props.disabled}
        value={draft.text}
        onChange={(e) => draft.onChangeText(e.target.value)}
        onFocus={draft.onFocus}
        onBlur={draft.onBlur}
        onKeyDown={draft.onKeyDown}
    />
};
