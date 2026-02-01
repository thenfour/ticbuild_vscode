
export type ControlSurfaceViewKind = "panel" | "explorer" | "activity";

export type WatchItem = {
    id: string;
    label: string;
    value: string;
    stale?: boolean;
    error?: string;
};

// basically the same schema as in TIC-80 control surface JSON definition;
// this is what's sent from the extension host to the webview
export type ControlSurfaceState = {
    status: string;
    watches: WatchItem[];
    controlSurfaceRoot: ControlSurfaceNode[];
    symbolValues?: Record<string, any>; // map of symbol names to their current values
    pollIntervalMs?: number; // interval for polling expressions in ms
};

export type ControlSurfacePageSpec = {
    type: "page";
    label: string;
    controls: ControlSurfaceNode[];
};

export type ControlSurfaceToggleSpec = {
    type: "toggle";
    label: string;
    symbol: string;
};

export type ControlSurfaceTriggerButtonSpec = {
    type: "triggerButton";
    label: string;
    eval: string;
};

export type ControlSurfaceKnobSizeSpec = "small" | "medium" | "large";

export type ControlSurfaceScalarCommonSpec = {
    label: string;
    symbol: string;
    min?: number;
    max?: number;
    step?: number;
};

export type ControlSurfaceKnobSpec = ControlSurfaceScalarCommonSpec & {
    type: "knob";
    size?: ControlSurfaceKnobSizeSpec;
};

export type ControlSurfaceSliderSpec = ControlSurfaceScalarCommonSpec & {
    type: "slider";
};

export type ControlSurfaceGroupSpec = {
    type: "group";
    label: string;
    orientation?: "horizontal" | "vertical";
    controls: ControlSurfaceNode[];
}

export type ControlSurfaceDividerSpec = {
    type: "divider";
};

export type ControlSurfaceEnumButtonsSpec = {
    type: "enumButtons";
    label: string;
    symbol: string;
    options: { label?: string; value: string | number }[];
};

export type ControlSurfaceLabelSpec = {
    type: "label";
    label?: string;
    expression: string;
};

export type ControlSurfaceNumberSpec = ControlSurfaceScalarCommonSpec & {
    type: "number";
};

export type ControlSurfaceStringSpec = {
    type: "string";
    label: string;
    symbol: string;
};

export type ControlSurfaceTabsSpec = {
    type: "tabs";
    tabs: {
        label: string;
        controls: ControlSurfaceNode[];
    }[];
};

export type ControlSurfaceNode =
    | ControlSurfaceKnobSpec
    | ControlSurfaceTriggerButtonSpec
    | ControlSurfaceSliderSpec
    | ControlSurfaceToggleSpec
    | ControlSurfacePageSpec
    | ControlSurfaceGroupSpec
    | ControlSurfaceDividerSpec
    | ControlSurfaceEnumButtonsSpec
    | ControlSurfaceLabelSpec
    | ControlSurfaceNumberSpec
    | ControlSurfaceStringSpec
    | ControlSurfaceTabsSpec;

export type ControlSurfaceApi = {
    postMessage: (message: unknown) => void;
    evalExpression?: (expression: string) => Promise<string>;
    log?: (message: string) => void;
};

export type ControlSurfaceDataSource = {
    subscribe: (listener: (payload: ControlSurfaceState) => void) => () => void;
};
