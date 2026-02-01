import React from "react";

type WatchItem = {
  id: string;
  label: string;
  value: string;
  stale?: boolean;
  error?: string;
};

type ControlSurfaceState = {
  status: string;
  watches: WatchItem[];
};

const initialState: ControlSurfaceState = {
  status: "Disconnected",
  watches: [],
};

export function ControlSurfaceApp(): JSX.Element {
  const [state, setState] = React.useState<ControlSurfaceState>(initialState);
  const vscodeApi = React.useMemo(() => {
    const globalAny = window as typeof window & {
      acquireVsCodeApi?: () => { postMessage: (message: unknown) => void };
    };
    return globalAny.acquireVsCodeApi
      ? globalAny.acquireVsCodeApi()
      : undefined;
  }, []);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as ControlSurfaceState | undefined;
      if (!payload || !payload.watches) {
        return;
      }
      setState(payload);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
        <button onClick={() => vscodeApi?.postMessage({ type: "addWatch" })}>
          Add Watch
        </button>
        <button onClick={() => vscodeApi?.postMessage({ type: "removeWatch" })}>
          Remove Watch
        </button>
        <button
          onClick={() => vscodeApi?.postMessage({ type: "clearWatches" })}
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
