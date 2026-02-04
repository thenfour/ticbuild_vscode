
export type ControlSurfaceViewKind = "panel" | "explorer" | "activity";

export type WatchItem = {
    id: string;
    label: string;
    value: string;
    stale?: boolean;
    error?: string;
};

// the serialized state of the control surface UI;
// this is what's sent from the extension host to the webview
// must be serializable
export type ControlSurfaceConnectionState = "connected" | "connecting" | "disconnected" | "error";

export type ControlSurfaceConnectedInstance = {
    host: string;
    port: number;
};

export type ControlSurfaceState = {
    connectionState: ControlSurfaceConnectionState;
    statusText: string;
    connectedInstance?: ControlSurfaceConnectedInstance;
    watches: WatchItem[];
    controlSurfaceRoot: ControlSurfaceNode[];
    expressionResults?: Record<string, { value?: string; error?: string }>;
    plotData?: ControlSurfacePlotData;
    discoveredInstances?: ControlSurfaceDiscoveredInstance[];
    pollIntervalMs: number; // interval for polling expressions in ms
    uiRefreshMs: number; // UI refresh interval in ms

    selectedPageId: string; // persisted selected page ID
    designMode: boolean;
    selectedControlPath: string[] | null;

    viewId?: string; // unique ID for this view (panel or sidebar)
};

export type ControlSurfaceDiscoveredInstance = {
    host: string;
    port: number;
    label?: string;
    description?: string;
    detail?: string;
    cartPath?: string;
    metaTitle?: string;
    metaVersion?: string;
    startedAt?: string;
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

export type ControlSurfaceAxisSpec = {
    symbol: string;
    min?: number;
    max?: number;
    step?: number;
    center?: number;
    size?: number;
};

export type ControlSurfaceXYSpec = {
    type: "xy";
    label: string;
    size?: ControlSurfaceKnobSizeSpec;
    x: ControlSurfaceAxisSpec;
    y: ControlSurfaceAxisSpec;
};

export type ControlSurfaceScopeRangeMode = "autoUnified" | "autoPerSeries";

export type ControlSurfaceScopeSeriesSpec = {
    expression: string;
    min?: number;
    max?: number;
};

export type ControlSurfaceScopeSpec = {
    type: "scope";
    label?: string;
    rateHz?: number;
    range?: ControlSurfaceScopeRangeMode;
    width?: number;
    height?: number;
    series: ControlSurfaceScopeSeriesSpec[];
};

export type ControlSurfaceGroupSpec = {
    type: "group";
    label?: string;
    orientation?: "horizontal" | "vertical";
    controls: ControlSurfaceNode[];
}

export type ControlSurfaceRowSpec = {
    type: "row";
    controls: ControlSurfaceNode[];
}

export type ControlSurfaceColumnSpec = {
    type: "column";
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
    | ControlSurfaceXYSpec
    | ControlSurfaceScopeSpec
    | ControlSurfaceToggleSpec
    | ControlSurfacePageSpec
    | ControlSurfaceGroupSpec
    | ControlSurfaceRowSpec
    | ControlSurfaceColumnSpec
    | ControlSurfaceDividerSpec
    | ControlSurfaceEnumButtonsSpec
    | ControlSurfaceLabelSpec
    | ControlSurfaceNumberSpec
    | ControlSurfaceStringSpec
    | ControlSurfaceTabsSpec;

export type ControlSurfaceApi = {
    postMessage: (message: unknown) => void;
    evalExpression: (expression: string) => Promise<string>;
    setSymbolValue: (symbol: string, value: unknown) => void;
    log: (message: string) => void;
    showWarningMessage: <T extends string>(message: string, ...items: T[]) => Promise<T | undefined>;
    subscribeExpression: (expression: string) => void;
    unsubscribeExpression: (expression: string) => void;
    subscribePlotSeries: (expression: string, rateHz: number, sampleCount?: number) => void;
    unsubscribePlotSeries: (expression: string, rateHz: number, sampleCount?: number) => void;
    setPlotPaused: (expression: string, rateHz: number, paused: boolean, sampleCount?: number) => void;
    listGlobals: () => Promise<string[]>;
};

export type ControlSurfacePlotSeriesPayload = {
    expression: string;
    rateHz: number;
    values: number[];
    startTime: number;
    endTime: number;
};

export type ControlSurfacePlotData = Record<string, ControlSurfacePlotSeriesPayload>;

export type ControlSurfaceDataSource = {
    subscribe: (listener: (payload: ControlSurfaceState) => void) => () => void;
};
