import React from "react";
import {
    ControlSurfaceDataSource,
    ControlSurfaceDiscoveredInstance,
    ControlSurfaceNode,
    ControlSurfaceState,
    WatchItem,
} from "../defs";

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
    discoveredInstances?: ControlSurfaceDiscoveredInstance[];
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
        connectionState: "disconnected",
        statusText: "Disconnected (mock)",
        connectedInstance: undefined,
        watches: [],
        controlSurfaceRoot: [],
        expressionResults: {},
        discoveredInstances,
        uiRefreshMs: 250,
        pollIntervalMs: 250,
        designMode: false,
        moveDestinationPath: null,
        selectedControlPath: null,
        selectedPageId: selectedPageId ?? "root",
    });

    const payload = React.useMemo<ControlSurfaceState>(() => {
        const mappedWatches: WatchItem[] = watches.map((watch) => ({
            id: watch.id,
            label: watch.label,
            value: watch.value,
        }));
        return {
            connectionState: connected ? "connected" : "disconnected",
            statusText: connected ? "Connected (mock)" : "Disconnected (mock)",
            connectedInstance: connected && discoveredInstances?.[0]
                ? { host: discoveredInstances[0].host, port: discoveredInstances[0].port }
                : undefined,
            watches: mappedWatches,
            controlSurfaceRoot,
            uiRefreshMs: 250,
            pollIntervalMs: 250,
            expressionResults,
            discoveredInstances,
            designMode: false,
            moveDestinationPath: null,
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
