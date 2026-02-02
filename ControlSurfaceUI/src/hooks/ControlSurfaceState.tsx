
import React from "react";
import { ControlSurfaceNode, ControlSurfacePageSpec, ControlSurfaceState } from "../defs";
import { buildPageOptions, findControlPathByNode, PageOption } from "../controlPathUtils";
import { CONTROL_PATH_ROOT } from "../controlPathBase";

//type ControlSurfaceStateMutator = (state: ControlSurfaceState) => void;

export interface ControlSurfaceStateApi {
    state: ControlSurfaceState;
    pageOptions: PageOption[];
    activePage?: ControlSurfacePageSpec;
    activePagePath: string[];

    setSelectedPageId: React.Dispatch<React.SetStateAction<string>>;
    setDesignMode: React.Dispatch<React.SetStateAction<boolean>>;
    setState: React.Dispatch<React.SetStateAction<ControlSurfaceState>>;
    setSelectedControlPath: React.Dispatch<React.SetStateAction<string[] | null>>;
    applyHostState: (payload: Partial<ControlSurfaceState>) => void;
};

const DEFAULT_POLL_MS = 220;
const DEFAULT_UI_MS = 220;

const makeState = (overrides?: Partial<ControlSurfaceState>, prev?: ControlSurfaceState): ControlSurfaceState => ({
    status: overrides?.status ?? prev?.status ?? "Disconnected",
    watches: overrides?.watches ?? prev?.watches ?? [],
    controlSurfaceRoot: overrides?.controlSurfaceRoot ?? prev?.controlSurfaceRoot ?? [],
    symbolValues: overrides?.symbolValues ?? prev?.symbolValues ?? {},
    expressionResults: overrides?.expressionResults ?? prev?.expressionResults ?? {},
    discoveredInstances: overrides?.discoveredInstances ?? prev?.discoveredInstances ?? [],
    pollIntervalMs: overrides?.pollIntervalMs ?? prev?.pollIntervalMs ?? DEFAULT_POLL_MS,
    uiRefreshMs: overrides?.uiRefreshMs ?? prev?.uiRefreshMs ?? DEFAULT_UI_MS,
    selectedPageId: overrides?.selectedPageId ?? prev?.selectedPageId ?? "root",
    designMode: overrides?.designMode ?? prev?.designMode ?? false,
    selectedControlPath: overrides?.selectedControlPath ?? prev?.selectedControlPath ?? null,
    viewId: overrides?.viewId ?? prev?.viewId,
});

const makeApi = (): ControlSurfaceStateApi => ({
    state: makeState(),
    pageOptions: [],
    activePage: undefined,
    activePagePath: [CONTROL_PATH_ROOT],
    setSelectedPageId: () => { },
    setDesignMode: () => { },
    setState: () => { },
    setSelectedControlPath: () => { },
    applyHostState: () => { },
});


const ControlSurfaceStateContext = React.createContext<ControlSurfaceStateApi>(makeApi());

export const ControlSurfaceStateProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = React.useState<ControlSurfaceState>(() => makeState());

    const applyHostState = React.useCallback((payload: Partial<ControlSurfaceState>) => {
        setState((prev) => makeState({
            ...payload,
            // keep local-only UI state; host shouldn't override these
            designMode: prev.designMode,
            selectedControlPath: prev.selectedControlPath,
        }, prev));
    }, []);

    const setSelectedPageId = React.useCallback<React.Dispatch<React.SetStateAction<string>>>((value) => {
        setState((prev) => ({
            ...prev,
            selectedPageId: typeof value === "function" ? value(prev.selectedPageId) : value,
        }));
    }, []);

    const setDesignMode = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>((value) => {
        setState((prev) => ({
            ...prev,
            designMode: typeof value === "function" ? value(prev.designMode) : value,
        }));
    }, []);

    const setSelectedControlPath = React.useCallback<React.Dispatch<React.SetStateAction<string[] | null>>>((value) => {
        setState((prev) => ({
            ...prev,
            selectedControlPath: typeof value === "function" ? value(prev.selectedControlPath) : value,
        }));
    }, []);

    const pageOptions = React.useMemo(() => buildPageOptions(state.controlSurfaceRoot), [state.controlSurfaceRoot]);
    const activePage = React.useMemo(
        () => pageOptions.find((page) => page.id === state.selectedPageId)?.page ?? pageOptions[0]?.page,
        [pageOptions, state.selectedPageId],
    );
    const activePagePath = React.useMemo(() => {
        if (!activePage) {
            return [CONTROL_PATH_ROOT];
        }
        if (activePage.controls === state.controlSurfaceRoot) {
            return [CONTROL_PATH_ROOT];
        }
        const path = findControlPathByNode(state.controlSurfaceRoot, activePage as ControlSurfaceNode);
        return path ?? [CONTROL_PATH_ROOT];
    }, [activePage, state.controlSurfaceRoot]);

    const contextValue = React.useMemo<ControlSurfaceStateApi>(() => ({
        state,
        pageOptions,
        activePage,
        activePagePath,
        setSelectedPageId,
        setDesignMode,
        setState,
        setSelectedControlPath,
        applyHostState,
    }), [state, pageOptions, activePage, activePagePath, setSelectedPageId, setDesignMode, setSelectedControlPath, applyHostState]);

    return (
        <ControlSurfaceStateContext.Provider value={contextValue}>
            {children}
        </ControlSurfaceStateContext.Provider>
    );
};

export const useControlSurfaceState = (): ControlSurfaceStateApi => (
    React.useContext(ControlSurfaceStateContext)
);
