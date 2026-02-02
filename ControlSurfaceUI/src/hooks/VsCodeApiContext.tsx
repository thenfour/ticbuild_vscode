import React from "react";

import { vscodeApi } from "./vscodeApi";
import { ControlSurfaceApi } from "../defs";

export type VsCodeApi = typeof vscodeApi;

const VsCodeApiContext = React.createContext<VsCodeApi | undefined>(vscodeApi);

export const VsCodeApiProvider = ({
    children,
    api,
}: {
    children: React.ReactNode;
    api?: VsCodeApi;
}) => (
    <VsCodeApiContext.Provider value={api ?? vscodeApi}>
        {children}
    </VsCodeApiContext.Provider>
);

export const useVsCodeApi = (): VsCodeApi | undefined =>
    React.useContext(VsCodeApiContext);

/**
 * Hook that provides the wrapped Control Surface API with evalExpression and log methods.
 * This wraps the raw VS Code API with request/response handling for async operations.
 */
export const useControlSurfaceApi = (): ControlSurfaceApi | undefined => {
    const rawApi = useVsCodeApi();
    const pendingEvaluationsRef = React.useRef(new Map<string, { resolve: (value: string) => void; reject: (error: Error) => void }>());
    const pendingWarningsRef = React.useRef(new Map<string, { resolve: (value: string | undefined) => void; reject: (error: Error) => void }>());

    React.useEffect(() => {
        if (!rawApi) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === "evalResult" && typeof message.requestId === "string") {
                const pending = pendingEvaluationsRef.current.get(message.requestId);
                if (pending) {
                    pendingEvaluationsRef.current.delete(message.requestId);
                    if (message.error) {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message.result ?? "");
                    }
                }
            } else if (message.type === "showWarningMessageResult" && typeof message.requestId === "string") {
                const pending = pendingWarningsRef.current.get(message.requestId);
                if (pending) {
                    pendingWarningsRef.current.delete(message.requestId);
                    if (message.error) {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message.result);
                    }
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [rawApi]);

    const wrappedApi = React.useMemo(() => {
        if (!rawApi) {
            return undefined;
        }

        const api: ControlSurfaceApi = {
            postMessage: (message: unknown) => {
                rawApi.postMessage(message);
            },
            log: (message: string) => {
                rawApi.postMessage({
                    type: "log",
                    message,
                });
            },
            evalExpression: async (expression: string): Promise<string> => {
                const requestId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                return new Promise((resolve, reject) => {
                    pendingEvaluationsRef.current.set(requestId, { resolve, reject });

                    rawApi.postMessage({
                        type: "evalExpression",
                        requestId,
                        expression,
                    });

                    // Timeout after 5 seconds
                    setTimeout(() => {
                        if (pendingEvaluationsRef.current.has(requestId)) {
                            pendingEvaluationsRef.current.delete(requestId);
                            reject(new Error("Evaluation timeout"));
                        }
                    }, 5000);
                });
            },
            subscribeExpression: (expression: string) => {
                rawApi.postMessage({
                    type: "subscribeExpression",
                    expression,
                });
            },
            unsubscribeExpression: (expression: string) => {
                rawApi.postMessage({
                    type: "unsubscribeExpression",
                    expression,
                });
            },
            showWarningMessage: async <T extends string>(message: string, ...items: T[]): Promise<T | undefined> => {
                const requestId = `warning_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                return new Promise((resolve, reject) => {
                    pendingWarningsRef.current.set(requestId, { resolve: resolve as (value: string | undefined) => void, reject });

                    rawApi.postMessage({
                        type: "showWarningMessage",
                        requestId,
                        message,
                        items,
                    });

                    // Timeout after 30 seconds
                    setTimeout(() => {
                        if (pendingWarningsRef.current.has(requestId)) {
                            pendingWarningsRef.current.delete(requestId);
                            reject(new Error("Warning message timeout"));
                        }
                    }, 30000);
                });
            },
        };

        return api;
    }, [rawApi]);

    return wrappedApi;
};
