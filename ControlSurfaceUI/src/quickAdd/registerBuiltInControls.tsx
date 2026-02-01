import React from "react";
import { ControlRegistry } from "../controlRegistry";
import { ControlSurfaceKnob } from "../ControlSurfaceControls/ControlSurfaceKnob";
import { ControlSurfaceSlider } from "../ControlSurfaceControls/ControlSurfaceSlider";
import { ControlSurfaceToggle } from "../ControlSurfaceControls/ControlSurfaceToggle";
import { ControlSurfaceNumber } from "../ControlSurfaceControls/ControlSurfaceNumber";
import { ControlSurfaceString } from "../ControlSurfaceControls/ControlSurfaceString";
import { ControlSurfaceEnumButtons } from "../ControlSurfaceControls/ControlSurfaceEnumButtons";
import { ControlSurfaceLabel } from "../ControlSurfaceControls/ControlSurfaceLabel";
import { ControlSurfaceTriggerButton } from "../ControlSurfaceControls/ControlSurfaceTriggerButton";
import { ControlSurfaceGroup } from "../ControlSurfaceControls/ControlSurfaceGroup";
import { SymbolQuickAdd } from "./SymbolQuickAdd";

export function registerBuiltInControls() {

  ControlRegistry.register({
    type: "knob",
    displayName: "Knob",
    category: "input",
    description: "Rotary knob for numeric input",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceKnob,
    createDefaultSpec: (data) => ({
      type: "knob",
      label: data.label || "Knob",
      symbol: data.symbol || "value",
      min: 0,
      max: 100,
      step: 1,
    }),
  });

  ControlRegistry.register({
    type: "slider",
    displayName: "Slider",
    category: "input",
    description: "Linear slider for numeric input",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceSlider,
    createDefaultSpec: (data) => ({
      type: "slider",
      label: data.label || "Slider",
      symbol: data.symbol || "value",
      min: 0,
      max: 100,
      step: 1,
    }),
  });

  ControlRegistry.register({
    type: "toggle",
    displayName: "Toggle",
    category: "input",
    description: "On/off toggle switch",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceToggle,
    createDefaultSpec: (data) => ({
      type: "toggle",
      label: data.label || "Toggle",
      symbol: data.symbol || "enabled",
    }),
  });

  ControlRegistry.register({
    type: "number",
    displayName: "Number Input",
    category: "input",
    description: "Numeric input with up/down buttons",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceNumber,
    createDefaultSpec: (data) => ({
      type: "number",
      label: data.label || "Number",
      symbol: data.symbol || "value",
      min: 0,
      max: 100,
      step: 0.1,
    }),
  });

  ControlRegistry.register({
    type: "string",
    displayName: "Text Input",
    category: "input",
    description: "Text input field",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceString,
    createDefaultSpec: (data) => ({
      type: "string",
      label: data.label || "Text",
      symbol: data.symbol || "text",
    }),
  });

  ControlRegistry.register({
    type: "enumButtons",
    displayName: "Button Group",
    category: "input",
    description: "Multiple choice buttons",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceEnumButtons,
    createDefaultSpec: (data) => ({
      type: "enumButtons",
      label: data.label || "Options",
      symbol: data.symbol || "mode",
      options: [
        { label: "Option 1", value: 0 },
        { label: "Option 2", value: 1 },
      ],
    }),
  });

  ControlRegistry.register({
    type: "label",
    displayName: "Label",
    category: "display",
    description: "Display dynamic text from expression",
    quickAddComponent: (props) => <SymbolQuickAdd {...props} label="Expression" />,
    renderComponent: ControlSurfaceLabel,
    createDefaultSpec: (data) => ({
      type: "label",
      label: data.label,
      expression: data.symbol || "\"value\"",
    }),
  });

  ControlRegistry.register({
    type: "triggerButton",
    displayName: "Button",
    category: "action",
    description: "Execute code on click",
    quickAddComponent: (props) => <SymbolQuickAdd {...props} label="Expression" />,
    renderComponent: ControlSurfaceTriggerButton,
    createDefaultSpec: (data) => ({
      type: "triggerButton",
      label: data.label || "Button",
      eval: data.symbol || "print('clicked')",
    }),
  });

  ControlRegistry.register({
    type: "group",
    displayName: "Group",
    category: "layout",
    description: "Container for grouping controls",
    quickAddComponent: (props) => {
      const [label, setLabel] = React.useState("");
      React.useEffect(() => {
        props.onSubmit({ label });
      }, [label, props]);
      return (
        <div>
          <label style={{ display: "block", marginBottom: "4px" }}>Group Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Group name"
            style={{
              width: "100%",
              padding: "4px 8px",
              backgroundColor: "var(--vscode-input-background)",
              color: "var(--vscode-input-foreground)",
              border: "1px solid var(--vscode-input-border)",
            }}
          />
        </div>
      );
    },
    renderComponent: ControlSurfaceGroup,
    createDefaultSpec: (data) => ({
      type: "group",
      label: data.label || "Group",
      orientation: "horizontal",
      controls: [],
    }),
  });

  ControlRegistry.register({
    type: "divider",
    displayName: "Divider",
    category: "layout",
    description: "Visual separator",
    quickAddComponent: (props) => {
      React.useEffect(() => {
        props.onSubmit({});
      }, [props]);
      return null;
    },
    renderComponent: () => <hr />,
    createDefaultSpec: () => ({
      type: "divider",
    }),
  });
}
