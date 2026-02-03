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
import { Divider } from "./basic/Divider";
import { ControlSurfaceGroup, ControlSurfaceGroupBase } from "./ControlSurfaceControls/ControlSurfaceGroup";
import { PropControlTextBoxDemo } from "./PropControlsBase/PropControlTextBox";


export const ComponentTester: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(true);
    const [knobValue, setKnobValue] = React.useState(0);
    const [integerValue, setIntegerValue] = React.useState(5);
    const [numericValue, setNumericValue] = React.useState(5.0);
    const [enumValue, setEnumValue] = React.useState("option1");
    const [toggleValue, setToggleValue] = React.useState(false);
    const [tabId, setTabId] = React.useState(1);

    return (
        <div className="component-tester">
            <div
                style={{
                    cursor: "pointer",
                    userSelect: "none",
                    padding: "4px 8px",
                    backgroundColor: "var(--vscode-editor-background)",
                    borderBottom: "1px solid var(--vscode-panel-border)"
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <h2 style={{ fontSize: 12, margin: 0, display: "inline" }}>
                    {isCollapsed ? "▶" : "▼"} Component Gallery
                </h2>
            </div>

            {!isCollapsed && (
                <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "16px" }}>

                    <fieldset>
                        <legend>PropControlTextBoxDemo</legend>
                        <PropControlTextBoxDemo />
                    </fieldset>

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Buttons</h3>
                        <ButtonGroup orientation="horizontal">
                            <Button>Button 1</Button>
                            <Button>Button 2</Button>
                            <Button disabled>Disabled</Button>
                        </ButtonGroup>
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Checkbox Button</h3>
                        <CheckboxButton checked={toggleValue} onChange={setToggleValue}>
                            Toggle Me
                        </CheckboxButton>
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Knob</h3>
                        <Knob
                            value={knobValue}
                            onChange={setKnobValue}
                            centerValue={0.5}
                            label="Volume"
                        />
                    </section>

                    <Divider />

                    <section>
                        <ControlSurfaceGroupBase label="Up/Down Controls" designMode={true} orientation="vertical" selected={false}>
                            <IntegerUpDown
                                min={3}
                                max={10}
                                value={integerValue}
                                onChange={setIntegerValue}
                            />
                            <NumericUpDown
                                min={3}
                                max={10}
                                step={0.25}
                                value={numericValue}
                                onChange={setNumericValue}
                            />
                        </ControlSurfaceGroupBase>
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Numeric Up/Down (Float)</h3>
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Enum Buttons</h3>
                        <EnumButtons
                            options={[
                                { value: "option1", label: "Option 1" },
                                { value: "option2", label: "Option 2" },
                                { value: "option3", label: "Option 3" },
                            ]}
                            value={enumValue}
                            onChange={(newValue) => setEnumValue(newValue)}
                        />
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Dropdown</h3>
                        <Dropdown
                            options={[
                                { value: "option1", label: "Option 1" },
                                { value: "option2", label: "Option 2" },
                                { value: "option3", label: "Option 3" },
                            ]}
                            value={enumValue}
                            onChange={(newValue) => setEnumValue(newValue)}
                        />
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Tabs</h3>
                        <TabPanel selectedTabId={tabId} handleTabChange={(e, id) => setTabId(id as number)}>
                            <Tab thisTabId={1} summaryTitle="First">
                                <div style={{ padding: "8px" }}>Content of first tab</div>
                            </Tab>
                            <Tab thisTabId={2} summaryTitle="Second">
                                <div style={{ padding: "8px" }}>Content of second tab</div>
                            </Tab>
                            <Tab thisTabId={3} summaryTitle="Third">
                                <div style={{ padding: "8px" }}>Content of third tab</div>
                            </Tab>
                        </TabPanel>
                    </section>

                    <Divider />

                    <section>
                        <h3 style={{ fontSize: 11, margin: "0 0 4px 0", opacity: 0.7 }}>Key-Value Table</h3>
                        <KeyValueTable value={{
                            name: "lucie",
                            ages: [12, "thirtyfour", 1.22333]
                        }} />
                    </section>
                </div>
            )}
        </div>
    );
};