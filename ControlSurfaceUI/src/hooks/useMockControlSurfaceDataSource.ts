import React from "react";
import { ControlSurfaceDataSource, ControlSurfaceNode, ControlSurfaceState, WatchItem } from "../defs";

type MockWatch = {
    id: string;
    label: string;
    value: string;
};

export type MockControlSurfaceDataSourceOptions = {
    connected: boolean;
    watches: MockWatch[];
    controlSurfaceRoot: ControlSurfaceNode[];
    expressionResults: Record<string, { value?: string; error?: string }>;
    discoveredInstances?: ControlSurfaceState["discoveredInstances"];
    selectedPageId?: string;
};

export const useMockControlSurfaceDataSource = ({
    connected,
    watches,
    controlSurfaceRoot,
    expressionResults,
    discoveredInstances,
    selectedPageId,
}: MockControlSurfaceDataSourceOptions): ControlSurfaceDataSource => {
    const subscribersRef = React.useRef(
        new Set<(payload: ControlSurfaceState) => void>(),
    );
    const latestPayloadRef = React.useRef<ControlSurfaceState>({
        status: "Disconnected (mock)",
        watches: [],
        controlSurfaceRoot: [],
        symbolValues: {},
        expressionResults: {},
        discoveredInstances: [],
        uiRefreshMs: 250,
        pollIntervalMs: 250,
        designMode: false,
        selectedControlPath: null,
        selectedPageId: "root",
    });

    const payload = React.useMemo<ControlSurfaceState>(() => {
        const mappedWatches: WatchItem[] = watches.map((watch) => ({
            id: watch.id,
            label: watch.label,
            value: watch.value,
        }));
        return {
            status: connected ? "Connected (mock)" : "Disconnected (mock)",
            watches: mappedWatches,
            controlSurfaceRoot,
            uiRefreshMs: 250,
            pollIntervalMs: 250,
            symbolValues: { mockSymbol: 123 },
            expressionResults,
            discoveredInstances,
            designMode: false,
            selectedControlPath: null,
            selectedPageId: selectedPageId ?? "root",
        } satisfies ControlSurfaceState;
    }, [connected, controlSurfaceRoot, discoveredInstances, expressionResults, selectedPageId, watches]);

    React.useEffect(() => {
        latestPayloadRef.current = payload;
        subscribersRef.current.forEach((listener) => listener(payload));
    }, [payload]);

    return React.useMemo<ControlSurfaceDataSource>(
        () => ({
            subscribe: (listener) => {
                subscribersRef.current.add(listener);
                listener(latestPayloadRef.current);
                return () => subscribersRef.current.delete(listener);
            },
        }),
        [],
    );
};
