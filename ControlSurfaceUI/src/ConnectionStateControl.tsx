import React from "react";
import { Button } from "./Buttons/PushButton";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { ControlSurfaceDiscoveredInstance } from "./defs";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";
import { Divider } from "./basic/Divider";

export type ConnectionStateControlProps = {
    status: string;
    discoveredInstances?: ControlSurfaceDiscoveredInstance[];
};

export const ConnectionStateControl: React.FC<ConnectionStateControlProps> = ({
    status,
    discoveredInstances,
}) => {
    const api = useControlSurfaceApi();
    const isConnected = status.includes("Connected");
    const instances = discoveredInstances ?? [];

    const connectedMatch = status.match(/Connected\s+([^:\s]+):(\d+)/i);
    const connectedHost = connectedMatch?.[1];
    const connectedPort = connectedMatch ? Number(connectedMatch[2]) : undefined;

    const isConnectedTo = (instance: ControlSurfaceDiscoveredInstance) => {
        if (!isConnected || !connectedHost || connectedPort == null) {
            return false;
        }
        return instance.host === connectedHost && instance.port === connectedPort;
    };

    const filteredInstances = instances.filter((instance) => !isConnectedTo(instance));


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
                {status}
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
                        {instance.label || "?"}
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    );
};
