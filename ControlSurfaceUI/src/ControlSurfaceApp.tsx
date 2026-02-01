import React from "react";

import { ControlSurfacePage } from "./ControlSurfacePage";

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
  controlSurfaceRoot: ControlSurfaceNode[];
};

export type ControlSurfaceNode =
  | {
      type: "knob";
      label: string;
      symbol: string;
      min?: number;
      max?: number;
      step?: number;
      size?: "small" | "medium" | "large";
      [key: string]: unknown;
    }
  | {
      type: "button";
      label: string;
      eval: string;
      [key: string]: unknown;
    }
  | {
      type: "slider";
      label: string;
      symbol: string;
      min?: number;
      max?: number;
      step?: number;
      [key: string]: unknown;
    }
  | {
      type: "toggle";
      label: string;
      symbol: string;
      [key: string]: unknown;
    }
  | {
      type: "page";
      label: string;
      controls: ControlSurfaceNode[];
      [key: string]: unknown;
    }
  | {
      type: "group";
      label: string;
      orientation?: "horizontal" | "vertical";
      controls: ControlSurfaceNode[];
      [key: string]: unknown;
    };

export type ControlSurfaceApi = {
  postMessage: (message: unknown) => void;
};

export type ControlSurfaceViewKind = "panel" | "sidebar";

export type ControlSurfaceDataSource = {
  subscribe: (listener: (payload: ControlSurfaceState) => void) => () => void;
};

const initialState: ControlSurfaceState = {
  status: "Disconnected",
  watches: [],
  controlSurfaceRoot: [],
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
  viewKind?: ControlSurfaceViewKind;
};

type PageOption = {
  id: string;
  label: string;
  page: Extract<ControlSurfaceNode, { type: "page" }>;
};

const buildPageOptions = (
  controlSurfaceRoot: ControlSurfaceNode[],
): PageOption[] => {
  const rootPage: Extract<ControlSurfaceNode, { type: "page" }> = {
    type: "page",
    label: "Root",
    controls: controlSurfaceRoot,
  };
  const pages: PageOption[] = [{ id: "root", label: "Root", page: rootPage }];

  const visit = (
    nodes: ControlSurfaceNode[],
    labelPath: string[],
    idPath: string[],
  ) => {
    nodes.forEach((node, index) => {
      if (node.type === "page") {
        const nextLabelPath = [...labelPath, node.label];
        const nextIdPath = [...idPath, `p${index}`];
        pages.push({
          id: nextIdPath.join("/"),
          label: nextLabelPath.join(" / "),
          page: node,
        });
        visit(node.controls, nextLabelPath, nextIdPath);
        return;
      }

      if (node.type === "group") {
        visit(node.controls, labelPath, [...idPath, `g${index}`]);
      }
    });
  };

  visit(controlSurfaceRoot, [], ["root"]);
  return pages;
};

export function ControlSurfaceApp({
  api,
  dataSource,
  initialState: initialStateOverride,
  viewKind,
}: ControlSurfaceAppProps): JSX.Element {
  const [state, setState] = React.useState<ControlSurfaceState>(
    initialStateOverride ?? initialState,
  );
  const [selectedPageId, setSelectedPageId] = React.useState("root");
  const resolvedApi = React.useMemo(() => api ?? getWindowApi(), [api]);
  const resolvedDataSource = React.useMemo(
    () => dataSource ?? createWindowMessageDataSource(),
    [dataSource],
  );

  const pages = React.useMemo(
    () => buildPageOptions(state.controlSurfaceRoot ?? []),
    [state.controlSurfaceRoot],
  );
  const activePage =
    pages.find((page) => page.id === selectedPageId)?.page ?? pages[0]?.page;

  React.useEffect(() => {
    if (!pages.find((page) => page.id === selectedPageId)) {
      setSelectedPageId("root");
    }
  }, [pages, selectedPageId]);

  React.useEffect(() => {
    const unsubscribe = resolvedDataSource.subscribe((payload) => {
      setState({
        ...payload,
        controlSurfaceRoot: payload.controlSurfaceRoot ?? [],
      });
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
      <h1 style={{ fontSize: 14, margin: "0 0 12px 0" }}>
        TIC-80 Control Surfaces
      </h1>
      {viewKind ? (
        <div
          style={{
            marginBottom: 8,
            color: "var(--vscode-descriptionForeground)",
            fontSize: 11,
          }}
        >
          View: {viewKind}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Page
          <select
            value={selectedPageId}
            onChange={(event) => setSelectedPageId(event.target.value)}
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.label}
              </option>
            ))}
          </select>
        </label>
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

      {activePage ? (
        <ControlSurfacePage page={activePage} api={resolvedApi} />
      ) : (
        <div
          style={{
            color: "var(--vscode-descriptionForeground)",
            fontStyle: "italic",
            marginBottom: 12,
          }}
        >
          No controls.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 12, margin: "0 0 6px 0" }}>Watches</h2>
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
    </div>
  );
}
