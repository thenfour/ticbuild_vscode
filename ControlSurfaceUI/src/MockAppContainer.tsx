import React from "react";

import {
  ControlSurfaceApp,
} from "./ControlSurfaceApp";
import { ControlSurfaceApi, ControlSurfaceDataSource, ControlSurfaceNode, ControlSurfaceState, WatchItem } from "./defs";

type MockValueKind = "auto" | "string" | "number" | "boolean";

type MockWatch = {
  id: string;
  label: string;
  kind: MockValueKind;
  value: string;
  autoValue?: number;
};

const createMockWatch = (index: number, kind: MockValueKind): MockWatch => {
  const id = `w${index}`;
  const label = `watch${index}`;
  switch (kind) {
    case "auto":
      return {
        id,
        label,
        kind,
        autoValue: 1000,
        value: "1000",
      };
    case "string":
      return {
        id,
        label,
        kind,
        value: "mock-string",
      };
    case "number":
      return {
        id,
        label,
        kind,
        value: "42",
      };
    case "boolean":
      return {
        id,
        label,
        kind,
        value: "true",
      };
    default:
      return {
        id,
        label,
        kind,
        value: "",
      };
  }
};

export function MockAppContainer(): JSX.Element {
  const [connected, setConnected] = React.useState(false);
  const [watches, setWatches] = React.useState<MockWatch[]>([]);
  const [controlSurfaceRoot, setControlSurfaceRoot] = React.useState<
    ControlSurfaceNode[]
  >([]);
  const [nextId, setNextId] = React.useState(1);
  const [addKind, setAddKind] = React.useState<MockValueKind>("auto");
  const [clipboardNotice, setClipboardNotice] = React.useState<string>("");

  const subscribersRef = React.useRef(
    new Set<(payload: ControlSurfaceState) => void>(),
  );
  const latestPayloadRef = React.useRef<ControlSurfaceState>({
    status: "Disconnected (mock)",
    watches: [],
    controlSurfaceRoot: [],
  });

  React.useEffect(() => {
    const globalAny = window as typeof window & {
      acquireVsCodeApi?: () => { postMessage: (message: unknown) => void };
    };
    if (!globalAny.acquireVsCodeApi) {
      globalAny.acquireVsCodeApi = () => ({
        postMessage: (message: unknown) => {
          console.log("[mock] postMessage", message);
        },
      });
    }
  }, []);

  React.useEffect(() => {
    const existing = document.querySelector("link[data-vscode-mock='true']");
    if (!existing) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/public/vscode_mock.css";
      link.setAttribute("data-vscode-mock", "true");
      document.head.appendChild(link);
    }
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setWatches((current) =>
        current.map((watch) => {
          if (watch.kind !== "auto") {
            return watch;
          }
          const nextValue = (watch.autoValue ?? 0) + 1;
          return {
            ...watch,
            autoValue: nextValue,
            value: String(nextValue),
          };
        }),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

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
    };
  }, [connected, controlSurfaceRoot, watches]);

  React.useEffect(() => {
    latestPayloadRef.current = payload;
    subscribersRef.current.forEach((listener) => listener(payload));
  }, [payload]);

  const dataSource = React.useMemo<ControlSurfaceDataSource>(
    () => ({
      subscribe: (listener) => {
        subscribersRef.current.add(listener);
        listener(latestPayloadRef.current);
        return () => subscribersRef.current.delete(listener);
      },
    }),
    [],
  );

  const api = React.useMemo<ControlSurfaceApi>(
    () => ({
      postMessage: (message: unknown) => {
        console.log("[mock] postMessage", message);
      },
    }),
    [],
  );

  const handleAddWatch = () => {
    const id = nextId;
    setWatches((current) => [...current, createMockWatch(id, addKind)]);
    setNextId((current) => current + 1);
  };

  const handleRemoveWatch = () => {
    setWatches((current) => current.slice(0, -1));
  };

  const handleCopyControlSurfaceRoot = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.writeText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      await navigator.clipboard.writeText(
        JSON.stringify(controlSurfaceRoot, null, 2),
      );
      setClipboardNotice("controlSurfaceRoot copied.");
    } catch (error) {
      setClipboardNotice("Failed to copy controlSurfaceRoot.");
    }
  };

  const handlePasteControlSurfaceRoot = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setClipboardNotice("Clipboard data must be an array.");
        return;
      }
      setControlSurfaceRoot(parsed as ControlSurfaceNode[]);
      setClipboardNotice("controlSurfaceRoot pasted.");
    } catch (error) {
      setClipboardNotice("Failed to paste controlSurfaceRoot.");
    }
  };

  return (
    <div>
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid var(--vscode-panel-border)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--vscode-font-family)",
        }}
      >
        <strong style={{ marginRight: 4 }}>Mock Controls</strong>
        <button onClick={() => setConnected((value) => !value)}>
          {connected ? "Set Disconnected" : "Set Connected"}
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Add type
          <select
            value={addKind}
            onChange={(event) =>
              setAddKind(event.target.value as MockValueKind)
            }
          >
            <option value="auto">Auto-incrementing number</option>
            <option value="string">String</option>
            <option value="number">Static number</option>
            <option value="boolean">Boolean</option>
          </select>
        </label>
        <button onClick={handleAddWatch}>Add Watch</button>
        <button onClick={handleRemoveWatch} disabled={watches.length === 0}>
          Remove Watch
        </button>
        <button onClick={handleCopyControlSurfaceRoot}>
          Copy controlSurfaceRoot
        </button>
        <button onClick={handlePasteControlSurfaceRoot}>
          Paste controlSurfaceRoot
        </button>
        {clipboardNotice ? (
          <span style={{ color: "var(--vscode-descriptionForeground)" }}>
            {clipboardNotice}
          </span>
        ) : null}
      </div>
      <ControlSurfaceApp
        api={api}
        dataSource={dataSource}
        initialState={payload}
        viewKind="panel"
      />
    </div>
  );
}
