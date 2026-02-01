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
