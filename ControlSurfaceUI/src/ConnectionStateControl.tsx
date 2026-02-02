import React from "react";
import { Button } from "./Buttons/PushButton";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { ControlSurfaceDiscoveredInstance } from "./defs";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

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
            <div>{status}</div>
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
                        Connect
                    </Button>
                )}
                {instances.map((instance) => (
                    <Button
                        key={`${instance.host}:${instance.port}`}
                        onClick={() => api?.postMessage({
                            type: "connectInstance",
                            host: instance.host,
                            port: instance.port,
                        })}
                    >
                        {instance.label ?? `${instance.host}:${instance.port}`}
                    </Button>
                ))}
            </ButtonGroup>
        </div>
    );
};
