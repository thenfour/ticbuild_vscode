import React from "react";
import { PropControl, PropControlSeverity } from "./PropControlShell"
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { Button } from "../Buttons/PushButton";
import { CheckboxButton } from "../Buttons/CheckboxButton";
import { Dropdown } from "../basic/Dropdown";
import { TextInput } from "../basic/TextInput";




interface PropControlTextBoxProps {
    designMode: boolean;
    selected: boolean; // in design mode
    disabled: boolean;

    validationStatus: string; // falsy if no error.
    validationSeverity?: PropControlSeverity; // ignored if no validation error.
    bindingStatus: string; // falsy if none.
    bindingStatusSeverity?: PropControlSeverity; // ignored if no binding status.

    label: string; // can be null; empty label
    value: string; // can be null and the value is not shown.
    designTools: React.ReactNode; // only show in design mode, on hover, or when selected.

    onChange: (newValue: string) => void;

    isConnected: boolean;
}

export const PropControlTextBox: React.FC<PropControlTextBoxProps> = (props) => {
    return <PropControl.Shell
        designMode={props.designMode}
        selected={props.selected}
        isMoveDestination={false}
        isConnected={props.isConnected}
        disabled={props.disabled}
        validationStatus={props.validationStatus}
        validationSeverity={props.validationSeverity}
        bindingStatus={props.bindingStatus}
        bindingStatusSeverity={props.bindingStatusSeverity}
        label={props.label}
        value={
            <TextInput disabled={props.disabled} value={props.value} onChange={props.onChange} />
        }
        designTools={props.designTools}
    />;
};
