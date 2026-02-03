import React from "react";
import { PropControl, PropControlSeverity } from "./PropControlShell"
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { Button } from "../Buttons/PushButton";
import { CheckboxButton } from "../Buttons/CheckboxButton";
import { Dropdown } from "../basic/Dropdown";


interface PropControlTextBoxProps {
    designMode: boolean;
    selected: boolean; // in design mode

    validationStatus: string; // falsy if no error.
    validationSeverity: PropControlSeverity; // ignored if no validation error.
    bindingStatus: string; // falsy if none.
    bindingStatusSeverity: PropControlSeverity; // ignored if no binding status.

    label: string; // can be null; empty label
    value: string; // can be null and the value is not shown.
    designTools: React.ReactNode; // only show in design mode, on hover, or when selected.
}

export const PropControlTextBox: React.FC<PropControlTextBoxProps> = (props) => {
    return <PropControl.Shell
        designMode={props.designMode}
        selected={props.selected}
        validationStatus={props.validationStatus}
        validationSeverity={props.validationSeverity}
        bindingStatus={props.bindingStatus}
        bindingStatusSeverity={props.bindingStatusSeverity}
        label={props.label}
        value={props.value}
        designTools={props.designTools}
    />;
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
                <PropControl.Column
                    designMode={designMode}
                    selected={false}
                    label="Example Column"
                >
                    <PropControlTextBox
                        designMode={designMode}
                        selected={selected}
                        validationStatus={validationStatus}
                        validationSeverity={validationSeverity}
                        bindingStatus={bindingStatus}
                        bindingStatusSeverity={bindingStatusSeverity}
                        label="Example Label"
                        value={value}
                        designTools={null}
                    />
                    <PropControlTextBox
                        designMode={designMode}
                        selected={false}
                        validationStatus={validationStatus}
                        validationSeverity={"info"}
                        bindingStatus={bindingStatus}
                        bindingStatusSeverity={bindingStatusSeverity}
                        label="Example Label"
                        value={value}
                        designTools={null}
                    />
                </PropControl.Column>
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