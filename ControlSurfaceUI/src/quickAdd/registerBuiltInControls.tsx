import React from "react";
import { ControlRegistry } from "../controlRegistry";
import { ControlSurfaceGroup } from "../ControlSurfaceControls/ControlSurfaceGroup";
import { ControlSurfaceTabs } from "../ControlSurfaceControls/ControlSurfaceTabs";
import {
  DividerPropertiesPanel,
  EnumButtonsPropertiesPanel,
  GroupPropertiesPanel,
  KnobPropertiesPanel,
  LabelPropertiesPanel,
  NumberPropertiesPanel,
  PagePropertiesPanel,
  SliderPropertiesPanel,
  ScopePropertiesPanel,
  StringPropertiesPanel,
  TabsPropertiesPanel,
  TogglePropertiesPanel,
  TriggerButtonPropertiesPanel,
  XYPropertiesPanel,
} from "../ControlSurfacePropertiesPanels";
import { ControlSurfaceDividerProp } from "../PropControlsAdaptors/ControlSurfaceDividerProp";
import { ControlSurfaceEnumButtonsProp } from "../PropControlsAdaptors/ControlSurfaceEnumButtonsProp";
import { ControlSurfaceKnobProp } from "../PropControlsAdaptors/ControlSurfaceKnobProp";
import { ControlSurfaceLabelProp } from "../PropControlsAdaptors/ControlSurfaceLabelProp";
import { ControlSurfaceNumberProp } from "../PropControlsAdaptors/ControlSurfaceNumberProp";
import { ControlSurfacePageProp } from "../PropControlsAdaptors/ControlSurfacePageProp";
import { ControlSurfaceSliderProp } from "../PropControlsAdaptors/ControlSurfaceSliderProp";
import { ControlSurfaceScopeProp } from "../PropControlsAdaptors/ControlSurfaceScopeProp";
import { ControlSurfaceStringProp } from "../PropControlsAdaptors/ControlSurfaceStringProp";
import { ControlSurfaceToggleProp } from "../PropControlsAdaptors/ControlSurfaceToggleProp";
import { ControlSurfaceTriggerButtonProp } from "../PropControlsAdaptors/ControlSurfaceTriggerButtonProp";
import { ControlSurfaceXYProp } from "../PropControlsAdaptors/ControlSurfaceXYProp";
import { SymbolQuickAdd } from "./SymbolQuickAdd";
import { ScopeQuickAdd } from "./ScopeQuickAdd";
import { XYQuickAdd } from "./XYQuickAdd";
import { DEFAULT_SCOPE_HEIGHT, DEFAULT_SCOPE_RATE_HZ, DEFAULT_SCOPE_RANGE, DEFAULT_SCOPE_WIDTH, MAX_SCOPE_SERIES } from "../scopeConstants";

export function registerBuiltInControls() {

  ControlRegistry.register({
    type: "knob",
    displayName: "Knob",
    category: "input",
    description: "Rotary knob for numeric input",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceKnobProp,
    propertiesPanelComponent: KnobPropertiesPanel,
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
    renderComponent: ControlSurfaceSliderProp,
    propertiesPanelComponent: SliderPropertiesPanel,
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
    type: "xy",
    displayName: "XY",
    category: "input",
    description: "2D control for paired numeric input",
    quickAddComponent: XYQuickAdd,
    renderComponent: ControlSurfaceXYProp,
    propertiesPanelComponent: XYPropertiesPanel,
    createDefaultSpec: (data) => ({
      type: "xy",
      label: data.label || "XY",
      x: {
        symbol: data.xSymbol || "x",
        min: 0,
        max: 100,
        step: 1,
      },
      y: {
        symbol: data.ySymbol || "y",
        min: 0,
        max: 100,
        step: 1,
      },
    }),
  });

  ControlRegistry.register({
    type: "scope",
    displayName: "Scope",
    category: "display",
    description: "Plot values over time",
    quickAddComponent: ScopeQuickAdd,
    renderComponent: ControlSurfaceScopeProp,
    propertiesPanelComponent: ScopePropertiesPanel,
    createDefaultSpec: (data) => {
      const rawSeries = String(data.seriesText ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
      const series = rawSeries.length > 0
        ? rawSeries.slice(0, MAX_SCOPE_SERIES).map((expression) => ({ expression }))
        : [{ expression: "" }];
      return {
        type: "scope",
        label: data.label || "Scope",
        rateHz: DEFAULT_SCOPE_RATE_HZ,
        range: DEFAULT_SCOPE_RANGE,
        width: DEFAULT_SCOPE_WIDTH,
        height: DEFAULT_SCOPE_HEIGHT,
        series,
      };
    },
  });

  ControlRegistry.register({
    type: "toggle",
    displayName: "Toggle",
    category: "input",
    description: "On/off toggle switch",
    quickAddComponent: SymbolQuickAdd,
    renderComponent: ControlSurfaceToggleProp,
    propertiesPanelComponent: TogglePropertiesPanel,
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
    renderComponent: ControlSurfaceNumberProp,
    propertiesPanelComponent: NumberPropertiesPanel,
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
    renderComponent: ControlSurfaceStringProp,
    propertiesPanelComponent: StringPropertiesPanel,
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
    renderComponent: ControlSurfaceEnumButtonsProp,
    propertiesPanelComponent: EnumButtonsPropertiesPanel,
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
    renderComponent: ControlSurfaceLabelProp,
    propertiesPanelComponent: LabelPropertiesPanel,
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
    quickAddComponent: (props) => <SymbolQuickAdd {...props} label="statement" />,
    renderComponent: ControlSurfaceTriggerButtonProp,
    propertiesPanelComponent: TriggerButtonPropertiesPanel,
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
    quickAddComponent: ({ onSubmit }) => {
      const [label, setLabel] = React.useState("");
      React.useEffect(() => {
        onSubmit({ label });
      }, [label, onSubmit]);
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
    propertiesPanelComponent: GroupPropertiesPanel,
    createDefaultSpec: (data) => ({
      type: "group",
      label: data.label || "Group",
      orientation: "horizontal",
      controls: [],
    }),
  });

  ControlRegistry.register({
    type: "page",
    displayName: "Page",
    category: "layout",
    description: "Defines a control surface",
    quickAddComponent: ({ onSubmit }) => {
      const [label, setLabel] = React.useState("");
      React.useEffect(() => {
        onSubmit({ label });
      }, [label, onSubmit]);
      return (
        <div>
          <label style={{ display: "block", marginBottom: "4px" }}>Page title</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Page title"
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
    renderComponent: ControlSurfacePageProp,
    propertiesPanelComponent: PagePropertiesPanel,
    createDefaultSpec: (data) => ({
      type: "page",
      label: data.label || "Page",
      controls: [],
    }),
  });

  ControlRegistry.register({
    type: "row",
    displayName: "Row",
    category: "layout",
    description: "Horizontal layout container",
    quickAddComponent: ({ onSubmit }) => {
      React.useEffect(() => {
        onSubmit({});
      }, [onSubmit]);
      return null;
    },
    renderComponent: ControlSurfaceGroup,
    createDefaultSpec: (data) => ({
      type: "row",
      controls: [],
    }),
  });

  ControlRegistry.register({
    type: "column",
    displayName: "Column",
    category: "layout",
    description: "Vertical layout container",
    quickAddComponent: ({ onSubmit }) => {
      React.useEffect(() => {
        onSubmit({});
      }, [onSubmit]);
      return null;
    },
    renderComponent: ControlSurfaceGroup,
    createDefaultSpec: (data) => ({
      type: "column",
      controls: [],
    }),
  });

  ControlRegistry.register({
    type: "tabs",
    displayName: "Tabs",
    category: "layout",
    description: "Tabbed container of controls",
    quickAddComponent: ({ onSubmit }) => {
      const [labels, setLabels] = React.useState("Tab 1, Tab 2");
      React.useEffect(() => {
        onSubmit({ labels });
      }, [labels, onSubmit]);
      return (
        <div>
          <label style={{ display: "block", marginBottom: "4px" }}>Tab Labels</label>
          <input
            type="text"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            placeholder="Tab 1, Tab 2"
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
    renderComponent: ControlSurfaceTabs,
    propertiesPanelComponent: TabsPropertiesPanel,
    createDefaultSpec: (data) => {
      const labels = String(data.labels ?? "Tab 1")
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      return {
        type: "tabs",
        tabs: labels.map((label) => ({ label, controls: [] })),
      };
    },
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
    renderComponent: ControlSurfaceDividerProp,
    propertiesPanelComponent: DividerPropertiesPanel,
    createDefaultSpec: () => ({
      type: "divider",
    }),
  });
}
