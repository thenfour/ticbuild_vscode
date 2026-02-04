import React from "react";
import { Button } from "./Buttons/PushButton";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { ControlSurfaceDiscoveredInstance } from "./defs";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";
import { Divider } from "./basic/Divider";

export type ConnectionStateControlProps = {
    connectionState: "connected" | "connecting" | "disconnected" | "error";
    statusText: string;
    connectedInstance?: { host: string; port: number };
    discoveredInstances?: ControlSurfaceDiscoveredInstance[];
};

export const ConnectionStateControl: React.FC<ConnectionStateControlProps> = ({
    connectionState,
    statusText,
    connectedInstance,
    discoveredInstances,
}) => {
    const api = useControlSurfaceApi();
    const isConnected = connectionState === "connected";
    const instances = discoveredInstances ?? [];

    const isConnectedTo = (instance: ControlSurfaceDiscoveredInstance) => {
        if (!isConnected || !connectedInstance) {
            return false;
        }
        return instance.host === connectedInstance.host && instance.port === connectedInstance.port;
    };

    const filteredInstances = instances.filter((instance) => !isConnectedTo(instance));

    const formatInstanceLabel = (instance: ControlSurfaceDiscoveredInstance): string => {
        const rawLabel = (instance.label ?? "").trim();
        if (!rawLabel || rawLabel === "(empty)") {
            return `${instance.host}:${instance.port}`;
        }
        return rawLabel;
    };


    const statusColor = isConnected ? "var(--vscode-testing-iconPassed)"
        : "var(--vscode-testing-iconErrored)";

    return (
        <div
            style={{
                marginBottom: 12,
                color: "var(--vscode-descriptionForeground)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <div
                style={{ color: statusColor }}
            >
                {statusText}
            </div>
            <ButtonGroup>
                {isConnected ? (
                    <Button
                        onClick={() => api?.postMessage({ type: "detach" })}
                    >
                        Disconnect
                    </Button>
                ) : (
                    <Button
                        onClick={() => api?.postMessage({ type: "attach" })}
                    >
                        Connect...
                    </Button>
                )}
                <Divider />
                {filteredInstances.map((instance, index) => (
                    <Button
                        key={index} // host/port is not unique enough because there can be dummy/stale items.
                        onClick={() => api?.postMessage({
                            type: "connectInstance",
                            host: instance.host,
                            port: instance.port,
                        })}
                    >
                        {formatInstanceLabel(instance)}
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    );
};
