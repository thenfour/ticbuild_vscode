import React from "react";

export type WatchItem = {
  id: string;
  label: string;
  value: string;
  stale?: boolean;
  error?: string;
};

export type ControlSurfaceState = {
  status: string;
  watches: WatchItem[];
};

export type ControlSurfaceApi = {
  postMessage: (message: unknown) => void;
};

export type ControlSurfaceDataSource = {
  subscribe: (listener: (payload: ControlSurfaceState) => void) => () => void;
};

const initialState: ControlSurfaceState = {
  status: "Disconnected",
  watches: [],
};

const getWindowApi = (): ControlSurfaceApi | undefined => {
  const globalAny = window as typeof window & {
    acquireVsCodeApi?: () => { postMessage: (message: unknown) => void };
  };
  return globalAny.acquireVsCodeApi ? globalAny.acquireVsCodeApi() : undefined;
};

const createWindowMessageDataSource = (): ControlSurfaceDataSource => ({
  subscribe: (listener) => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as ControlSurfaceState | undefined;
      if (!payload || !Array.isArray(payload.watches)) {
        return;
      }
      listener(payload);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  },
});

export type ControlSurfaceAppProps = {
  api?: ControlSurfaceApi;
  dataSource?: ControlSurfaceDataSource;
  initialState?: ControlSurfaceState;
};

export function ControlSurfaceApp({
  api,
  dataSource,
  initialState: initialStateOverride,
}: ControlSurfaceAppProps): JSX.Element {
  const [state, setState] = React.useState<ControlSurfaceState>(
    initialStateOverride ?? initialState,
  );
  const resolvedApi = React.useMemo(() => api ?? getWindowApi(), [api]);
  const resolvedDataSource = React.useMemo(
    () => dataSource ?? createWindowMessageDataSource(),
    [dataSource],
  );

  React.useEffect(() => {
    const unsubscribe = resolvedDataSource.subscribe((payload) => {
      setState(payload);
    });
    return () => {
      unsubscribe?.();
    };
  }, [resolvedDataSource]);

  return (
    <div
      style={{
        padding: 12,
        fontFamily: "var(--vscode-font-family)",
        color: "var(--vscode-foreground)",
      }}
    >
      <h1 style={{ fontSize: 14, margin: "0 0 8px 0" }}>
        TIC-80 Control Surfaces
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => resolvedApi?.postMessage({ type: "addWatch" })}>
          Add Watch
        </button>
        <button
          onClick={() => resolvedApi?.postMessage({ type: "removeWatch" })}
        >
          Remove Watch
        </button>
        <button
          onClick={() => resolvedApi?.postMessage({ type: "clearWatches" })}
        >
          Clear Watches
        </button>
      </div>
      <div
        style={{
          marginBottom: 12,
          color: "var(--vscode-descriptionForeground)",
        }}
      >
        {state.status}
      </div>
      {state.watches.length === 0 ? (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            fontStyle: "italic",
          }}
        >
          No watches.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {state.watches.map((watch) => (
              <tr key={watch.id}>
                <td style={{ padding: "4px 6px", fontWeight: 600 }}>
                  {watch.label}
                </td>
                <td
                  style={{
                    padding: "4px 6px",
                    textAlign: "right",
                    color: "var(--vscode-descriptionForeground)",
                  }}
                >
                  {watch.error
                    ? "(error)"
                    : watch.stale
                      ? "(stale)"
                      : watch.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
