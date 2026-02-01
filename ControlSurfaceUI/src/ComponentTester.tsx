import React from "react";
import { KeyValueTable } from "./basic/KeyValueTable";
import { Knob } from "./basic/Knob2";
import { Tab, TabPanel } from "./basic/Tabs";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { CheckboxButton } from "./Buttons/CheckboxButton";
import { Button } from "./Buttons/PushButton";
import { IntegerUpDown, NumericUpDown } from "./basic/NumericUpDown";
import { EnumButtons } from "./basic/EnumButtons";
import { Dropdown } from "./basic/Dropdown";


export const ComponentTester: React.FC = () => {

    const [knobValue, setKnobValue] = React.useState(0);
    const [integerValue, setIntegerValue] = React.useState(5);
    const [numericValue, setNumericValue] = React.useState(5.0);
    const [enumValue, setEnumValue] = React.useState("option1");

    return <div>
        <h2 style={{ fontSize: 12, margin: "0 0 6px 0" }}>Control Gallery</h2>
        <ButtonGroup orientation="horizontal">
            <Button>a button</Button>
            <Button>a button</Button>
        </ButtonGroup>
        <ButtonGroup orientation="vertical">
            <Button>a button</Button>
            <CheckboxButton checked={false}>check!</CheckboxButton>
        </ButtonGroup>
        <KeyValueTable value={{
            name: "lucie",
            ages: [12, "thirtyfour", 1.22333]
        }} />
        <Knob
            value={knobValue}
            onChange={setKnobValue}
            centerValue={0.5}
            label="a knob"

        />

        <IntegerUpDown
            min={3}
            max={10}
            value={integerValue}
            onChange={setIntegerValue}
        />

        <EnumButtons
            options={[
                { value: "option1", label: "Option 1" },
                { value: "option2", label: "Option 2" },
                { value: "option3", label: "Option 3" },
            ]}
            value={enumValue}
            onChange={(newValue) => setEnumValue(newValue)}
        />


        <Dropdown
            options={[
                { value: "option1", label: "Option 1" },
                { value: "option2", label: "Option 2" },
                { value: "option3", label: "Option 3" },
            ]}
            value={enumValue}
            onChange={(newValue) => setEnumValue(newValue)}
        />

        <NumericUpDown
            min={3}
            max={10}
            step={0.25}
            value={numericValue}
            onChange={setNumericValue}
        />

        <TabPanel selectedTabId={1} handleTabChange={() => { }}>
            <Tab thisTabId={1} summaryTitle="Tab number one">
                <ButtonGroup orientation="horizontal">
                    <Button>a button</Button>
                    <Button>a button</Button>
                </ButtonGroup>
            </Tab>
            <Tab thisTabId={2} summaryTitle="Tab number two">
                aoeu
            </Tab>
            <Tab thisTabId={3} summaryTitle="Tab number three">
                aoeu
            </Tab>
        </TabPanel>
    </div>




};