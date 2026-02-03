import { ButtonGroup } from "../Buttons/ButtonGroup";
import { Button } from "../Buttons/PushButton";

export type TEnumButtonValue = string | number;

export type EnumButtonOption<TValue extends TEnumButtonValue> = {
    value: TValue;
    label?: React.ReactNode;
    disabled?: boolean;
};

export interface EnumButtonProps<TValue extends TEnumButtonValue> {
    options: EnumButtonOption<TValue>[];
    value: TValue;
    onChange: (newValue: TValue) => void;
    disabled?: boolean;
}

export const EnumButtons = <TValue extends TEnumButtonValue>({
    options,
    value,
    onChange,
    disabled = false,
}: EnumButtonProps<TValue>) => {
    return <ButtonGroup>
        {options.map((option, index) => (
            <Button
                key={index}//option.value.toString()} -- don't rely on unique values.
                disabled={disabled || option.disabled === true}
                //pressed={option.value === value}
                highlighted={option.value === value}
                onClick={() => onChange(option.value)}
            >
                {option.label ?? option.value.toString()}
            </Button>
        ))}
    </ButtonGroup>
}