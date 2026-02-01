// similar to enumbuttons but a dropdown menu instead of buttons.

import React from "react";
import "./Dropdown.css";

export type TDropdownValue = string | number;

export type DropdownOption<TValue extends TDropdownValue> = {
    value: TValue;
    label?: React.ReactNode;
    disabled?: boolean;
};

export interface DropdownProps<TValue extends TDropdownValue> {
    options: DropdownOption<TValue>[];
    value: TValue;
    onChange: (newValue: TValue) => void;
    disabled?: boolean;
}

export const Dropdown = <TValue extends TDropdownValue>({
    options,
    value,
    onChange,
    disabled = false,
}: DropdownProps<TValue>) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedValue = e.target.value;

        // Find the matching option to get the correct typed value
        const option = options.find(opt => opt.value.toString() === selectedValue);
        if (option) {
            onChange(option.value);
        }
    };

    return (
        <select
            value={value.toString()}
            onChange={handleChange}
            disabled={disabled}
            className="somatic-dropdown"
        >
            {options.map((option) => (
                <option
                    key={option.value.toString()}
                    value={option.value.toString()}
                    disabled={option.disabled === true}
                >
                    {option.label ?? option.value.toString()}
                </option>
            ))}
        </select>
    );
}