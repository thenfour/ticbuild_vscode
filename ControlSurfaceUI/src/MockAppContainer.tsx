import React from "react";

import {
  ControlSurfaceApp,
} from "./ControlSurfaceApp";
import { ControlSurfaceNode } from "./defs";
import { VsCodeApiProvider } from "./hooks/VsCodeApiContext";
import { ControlSurfaceStateProvider } from "./hooks/ControlSurfaceState";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMockControlSurfaceDataSource } from "./hooks/useMockControlSurfaceDataSource";

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
  const [expressionResults, setExpressionResults] = React.useState<Record<string, { value?: string; error?: string }>>({});
  const expressionSubscriptionsRef = React.useRef(new Map<string, number>());
  const [controlSurfaceRoot, setControlSurfaceRoot] = useLocalStorage<ControlSurfaceNode[]>(
    'tic80-mock-controlSurfaceRoot',
    []
  );
  const [nextId, setNextId] = React.useState(1);
  const [addKind, setAddKind] = React.useState<MockValueKind>("auto");
  const [clipboardNotice, setClipboardNotice] = React.useState<string>("");


  React.useEffect(() => {
    const globalAny = window as typeof window & {
      acquireVsCodeApi?: () => {
        postMessage: (message: unknown) => void;
        setState?: (state: any) => void;
        getState?: () => any;
      };
    };
    if (!globalAny.acquireVsCodeApi) {
      globalAny.acquireVsCodeApi = () => ({
        postMessage: (message: unknown) => {
          console.log("[mock] postMessage", message);

          if ((message as any).type === 'subscribeExpression') {
            const payload = message as { type: string; expression: string };
            const nextCount = (expressionSubscriptionsRef.current.get(payload.expression) ?? 0) + 1;
            expressionSubscriptionsRef.current.set(payload.expression, nextCount);
            setExpressionResults((prev) => ({
              ...prev,
              [payload.expression]: { value: `mock result for: ${payload.expression}` },
            }));
            return;
          }

          if ((message as any).type === 'unsubscribeExpression') {
            const payload = message as { type: string; expression: string };
            const current = expressionSubscriptionsRef.current.get(payload.expression) ?? 0;
            if (current <= 1) {
              expressionSubscriptionsRef.current.delete(payload.expression);
              setExpressionResults((prev) => {
                const next = { ...prev };
                delete next[payload.expression];
                return next;
              });
            } else {
              expressionSubscriptionsRef.current.set(payload.expression, current - 1);
            }
            return;
          }

          // Handle evalExpression requests
          if ((message as any).type === 'evalExpression') {
            const payload = message as { type: string; requestId: string; expression: string };
            // Simulate async evaluation
            setTimeout(() => {
              const mockResult = `mock result for: ${payload.expression}`;
              window.postMessage({
                type: 'evalResult',
                requestId: payload.requestId,
                result: mockResult,
              }, '*');
            }, 100);
          }

          // Handle showWarningMessage requests
          if ((message as any).type === 'showWarningMessage') {
            const payload = message as { type: string; requestId: string; message: string; items?: string[] };
            // Simulate user interaction with a confirm dialog
            setTimeout(() => {
              const result = window.confirm(payload.message)
                ? payload.items?.[0]
                : payload.items?.[1];
              window.postMessage({
                type: 'showWarningMessageResult',
                requestId: payload.requestId,
                result,
              }, '*');
            }, 100);
          }
        },
        setState: (state: any) => {
          console.log("[mock] setState", state);
        },
        getState: () => {
          console.log("[mock] getState");
          return undefined;
        },
      });
    }
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      if (expressionSubscriptionsRef.current.size === 0) {
        return;
      }
      setExpressionResults((prev) => {
        const next: Record<string, { value?: string; error?: string }> = { ...prev };
        for (const expression of expressionSubscriptionsRef.current.keys()) {
          const current = next[expression]?.value ?? "";
          next[expression] = {
            value: current ? `${current}.` : `mock result for: ${expression}`,
          };
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
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

  const dataSource = useMockControlSurfaceDataSource({
    connected,
    watches,
    controlSurfaceRoot,
    expressionResults,
  });

  // const api = React.useMemo<{ postMessage: (message: unknown) => void }>(
  //   () => ({
  //     postMessage: (message: unknown) => {
  //       console.log("[mock] postMessage (via api object)", message);
  //     },
  //   }),
  //   [],
  // );

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
    <VsCodeApiProvider>
      <ControlSurfaceStateProvider>
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
            dataSource={dataSource}
            //initialState={payload}
            viewKind="panel"
          />
        </div>
      </ControlSurfaceStateProvider>
    </VsCodeApiProvider>
  );
}
