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

////////////////////////////////////////////////////////////////////////////////////////////////////////
const PlaceholderControl: React.FC<{ designMode: boolean }> = ({ designMode }) => {
    return <PropControlTextBox
        designMode={designMode}
        selected={false}
        validationStatus={""}
        isConnected={true}
        bindingStatus={""}
        label="Example Label"
        value={"some text"}
        designTools={null}
        disabled={true}
        onChange={() => { }}
    />

};

////////////////////////////////////////////////////////////////////////////////////////////////////////
export const PropControlTextBoxDemo: React.FC = () => {
    const [value, setValue] = React.useState("Hello, world!");
    const [designMode, setDesignMode] = React.useState(true);
    const [selected, setSelected] = React.useState(false);
    const [validationStatus, setValidationStatus] = React.useState("");
    const [validationSeverity, setValidationSeverity] = React.useState<PropControlSeverity>("error");
    const [bindingStatus, setBindingStatus] = React.useState("");
    const [bindingStatusSeverity, setBindingStatusSeverity] = React.useState<PropControlSeverity>("warning");

    return (
        <div>
            <PropControl.Root>
                <PropControl.Row
                    designMode={designMode}
                    selected={false}
                    label="Example Row"
                >
                    <PropControl.Column
                        designMode={designMode}
                        selected={false}
                        label="Example Column"
                    >
                        <PlaceholderControl designMode={designMode} />
                    </PropControl.Column>

                    <PropControl.Column
                        designMode={designMode}
                        selected={false}
                        label="Example Column"
                    >
                        <PlaceholderControl designMode={designMode} />
                        <PropControlTextBox
                            designMode={designMode}
                            selected={selected}
                            validationStatus={validationStatus}
                            validationSeverity={validationSeverity}
                            isConnected={true}
                            bindingStatus={bindingStatus}
                            bindingStatusSeverity={bindingStatusSeverity}
                            label="Example Label"
                            value={value}
                            designTools={null}
                            disabled={false}
                            onChange={setValue}
                        />
                        <PlaceholderControl designMode={designMode} />
                    </PropControl.Column>
                </PropControl.Row>
            </PropControl.Root>
            <ButtonGroup>
                <CheckboxButton checked={designMode} onChange={setDesignMode}>Design Mode</CheckboxButton>
                <CheckboxButton checked={selected} onChange={setSelected}>Selected</CheckboxButton>
                <Dropdown value={validationSeverity} onChange={setValidationSeverity} options={[
                    { value: "error", label: "Error" },
                    { value: "warning", label: "Warning" },
                    { value: "info", label: "Info" },
                ]} />
                <Dropdown value={bindingStatusSeverity} onChange={setBindingStatusSeverity} options={[
                    { value: "error", label: "Error" },
                    { value: "warning", label: "Warning" },
                    { value: "info", label: "Info" },
                ]} />
            </ButtonGroup>
        </div>
    );
};