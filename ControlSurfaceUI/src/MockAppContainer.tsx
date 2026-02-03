import React from "react";

import {
  ControlSurfaceApp,
} from "./ControlSurfaceApp";
import { ControlSurfaceDiscoveredInstance, ControlSurfaceGroupSpec, ControlSurfaceNode } from "./defs";
import { VsCodeApiProvider } from "./hooks/VsCodeApiContext";
import { ControlSurfaceStateProvider } from "./hooks/ControlSurfaceState";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMockControlSurfaceDataSource } from "./hooks/useMockControlSurfaceDataSource";
import { resolveControlByPath, resolveControlsByPath } from "./controlPathUtils";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { Button } from "./Buttons/PushButton";
import { Divider } from "./basic/Divider";

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

// create 5 mock instances for testing
const mockInstances: ControlSurfaceDiscoveredInstance[] = [
  {
    host: "localhost",
    port: 9000,
    label: "Mock TIC-80 Instance",
  },
  {
    host: "localhost",
    port: 9001,
    label: "Mock TIC-80 Instance 2",
  },
  {
    host: "localhost",
    port: 9002,
    label: "Mock TIC-80 Instance 3",
  },
  {
    host: "localhost",
    port: 9003,
    label: "Mock TIC-80 Instance 4",
  },
  {
    host: "localhost",
    port: 9004,
    label: "Mock TIC-80 Instance 5",
  },
];

export function MockAppContainer(): JSX.Element {
  const [connected, setConnected] = React.useState(false);
  const [watches, setWatches] = React.useState<MockWatch[]>([]);
  const [expressionResults, setExpressionResults] = React.useState<Record<string, { value?: string; error?: string }>>({});
  const expressionSubscriptionsRef = React.useRef(new Map<string, number>());
  const [controlSurfaceRoot, setControlSurfaceRoot] = useLocalStorage<ControlSurfaceNode[]>(
    'tic80-mock-controlSurfaceRoot',
    []
  );
  const [selectedPageId, setSelectedPageId] = React.useState("root");
  const [nextId, setNextId] = React.useState(1);
  const [addKind, setAddKind] = React.useState<MockValueKind>("auto");
  const [clipboardNotice, setClipboardNotice] = React.useState<string>("");
  const [discoveredInstances, setDiscoveredInstances] = React.useState<ControlSurfaceDiscoveredInstance[]>([]);

  // Symbol management state
  const [symbolValues, setSymbolValues] = useLocalStorage<Record<string, any>>(
    'tic80-mock-symbolValues',
    { mockSymbol: 123 }
  );
  const [newSymbolName, setNewSymbolName] = React.useState("");
  const [newSymbolValue, setNewSymbolValue] = React.useState("0");

  // Expression management state
  const [newExpressionText, setNewExpressionText] = React.useState("");
  const [newExpressionValue, setNewExpressionValue] = React.useState("");

  const mockApi = React.useMemo(() => ({
    postMessage: (message: unknown) => {
      console.log("[mock] postMessage", message);

      if ((message as any).type === 'setSelectedPage') {
        const payload = message as { type: string; pageId?: string };
        if (payload.pageId) {
          setSelectedPageId(payload.pageId);
        }
        return;
      }

      if ((message as any).type === 'addControl') {
        const payload = message as { type: string; parentPath?: string[]; control?: ControlSurfaceNode };
        if (!payload.parentPath || !payload.control) {
          return;
        }
        const parentPath = payload.parentPath;
        setControlSurfaceRoot((prev) => {
          const next = JSON.parse(JSON.stringify(prev)) as ControlSurfaceNode[];
          const container = resolveControlsByPath(next, parentPath);
          if (container) {
            container.push(payload.control as ControlSurfaceNode);
          }
          return next;
        });
        return;
      }

      if ((message as any).type === 'updateControl') {
        const payload = message as { type: string; path?: string[]; control?: ControlSurfaceNode };
        if (!payload.path || !payload.control) {
          return;
        }
        setControlSurfaceRoot((prev) => {
          const next = JSON.parse(JSON.stringify(prev)) as ControlSurfaceNode[];
          const resolved = resolveControlByPath(next, payload.path);
          if (resolved) {
            resolved.parentControls[resolved.index] = payload.control as ControlSurfaceNode;
          }
          return next;
        });
        return;
      }

      if ((message as any).type === 'deleteControl') {
        const payload = message as { type: string; path?: string[] };
        if (!payload.path) {
          return;
        }
        setControlSurfaceRoot((prev) => {
          const next = JSON.parse(JSON.stringify(prev)) as ControlSurfaceNode[];
          const resolved = resolveControlByPath(next, payload.path);
          if (resolved) {
            resolved.parentControls.splice(resolved.index, 1);
          }
          return next;
        });
        return;
      }

      if ((message as any).type === 'moveControl') {
        const payload = message as { type: string; path?: string[]; direction?: 'up' | 'down' };
        if (!payload.path || !payload.direction) {
          return;
        }
        setControlSurfaceRoot((prev) => {
          const next = JSON.parse(JSON.stringify(prev)) as ControlSurfaceNode[];
          const resolved = resolveControlByPath(next, payload.path);
          if (!resolved) {
            return next;
          }
          const { parentControls, index } = resolved;
          const targetIndex = payload.direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= parentControls.length) {
            return next;
          }
          const temp = parentControls[index];
          parentControls[index] = parentControls[targetIndex];
          parentControls[targetIndex] = temp;
          return next;
        });
        return;
      }

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

      // Handle eval (statement) requests
      if ((message as any).type === 'eval') {
        const payload = message as { type: string; expression?: string };
        console.log("[mock] eval", payload.expression);
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

      if ((message as any).type === 'listGlobals') {
        const payload = message as { type: string; requestId: string };
        setTimeout(() => {
          window.postMessage({
            type: 'listGlobalsResult',
            requestId: payload.requestId,
            result: [
              "_G",
              "btnp",
              "cls",
              "map",
              "music",
              "sfx",
              "spr",
              "t",
              "trace",
            ],
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
  }), []);


  React.useEffect(() => {
    const globalAny = window as typeof window & {
      acquireVsCodeApi?: () => {
        postMessage: (message: unknown) => void;
        setState?: (state: any) => void;
        getState?: () => any;
      };
    };
    if (!globalAny.acquireVsCodeApi) {
      globalAny.acquireVsCodeApi = () => mockApi;
    }
  }, [mockApi]);

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
    discoveredInstances,
    selectedPageId,
    symbolValues,
  });

  // const api = React.useMemo<{ postMessage: (message: unknown) => void }>(
  //   () => ({
  //     postMessage: (message: unknown) => {
  //       console.log("[mock] postMessage (via api object)", message);
  //     },
  //   }),
  //   [],
  // );

  // const handleAddWatch = () => {
  //   const id = nextId;
  //   setWatches((current) => [...current, createMockWatch(id, addKind)]);
  //   setNextId((current) => current + 1);
  // };

  // const handleRemoveWatch = () => {
  //   setWatches((current) => current.slice(0, -1));
  // };

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

  const handleAddSymbol = () => {
    if (!newSymbolName.trim()) return;
    try {
      const parsedValue = JSON.parse(newSymbolValue);
      setSymbolValues(prev => ({ ...prev, [newSymbolName]: parsedValue }));
      setNewSymbolName("");
      setNewSymbolValue("0");
    } catch {
      // If JSON parse fails, store as string
      setSymbolValues(prev => ({ ...prev, [newSymbolName]: newSymbolValue }));
      setNewSymbolName("");
      setNewSymbolValue("0");
    }
  };

  const handleRemoveSymbol = (symbolName: string) => {
    setSymbolValues(prev => {
      const next = { ...prev };
      delete next[symbolName];
      return next;
    });
  };

  const handleCopySymbols = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.writeText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify(symbolValues, null, 2));
      setClipboardNotice("Symbols copied.");
    } catch (error) {
      setClipboardNotice("Failed to copy symbols.");
    }
  };

  const handlePasteSymbols = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setClipboardNotice("Clipboard data must be an object.");
        return;
      }
      setSymbolValues(parsed);
      setClipboardNotice("Symbols pasted.");
    } catch (error) {
      setClipboardNotice("Failed to paste symbols.");
    }
  };

  const handleAddExpression = () => {
    if (!newExpressionText.trim()) return;
    setExpressionResults(prev => ({
      ...prev,
      [newExpressionText]: { value: newExpressionValue || `mock result for: ${newExpressionText}` }
    }));
    setNewExpressionText("");
    setNewExpressionValue("");
  };

  const handleRemoveExpression = (expression: string) => {
    setExpressionResults(prev => {
      const next = { ...prev };
      delete next[expression];
      return next;
    });
  };

  const handleCopyExpressions = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.writeText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify(expressionResults, null, 2));
      setClipboardNotice("Expressions copied.");
    } catch (error) {
      setClipboardNotice("Failed to copy expressions.");
    }
  };

  const handlePasteExpressions = async () => {
    setClipboardNotice("");
    try {
      if (!navigator.clipboard?.readText) {
        setClipboardNotice("Clipboard API unavailable.");
        return;
      }
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setClipboardNotice("Clipboard data must be an object.");
        return;
      }
      setExpressionResults(parsed);
      setClipboardNotice("Expressions pasted.");
    } catch (error) {
      setClipboardNotice("Failed to paste expressions.");
    }
  };

  return (
    <VsCodeApiProvider api={mockApi}>
      <ControlSurfaceStateProvider>
        <div>
          <ButtonGroup>
            <Button onClick={() => setConnected((value) => !value)}>
              {connected ? "Set Disconnected" : "Set Connected"}
            </Button>
            <Divider />
            <Button onClick={() => {
              setDiscoveredInstances([]);
            }}>
              no inst
            </Button>
            <Button onClick={() => {
              setDiscoveredInstances(mockInstances.slice(0, 1));
            }}>
              1 inst
            </Button>
            <Button onClick={() => {
              setDiscoveredInstances(mockInstances.slice(0, 2));
            }}>
              2 inst
            </Button>
            <Button onClick={() => {
              setDiscoveredInstances(mockInstances.slice(0, 5));
            }}>
              5 inst
            </Button>
            <Divider />
            <Button onClick={handleCopyControlSurfaceRoot}>
              Copy controlSurfaceRoot
            </Button>
            <Button onClick={handlePasteControlSurfaceRoot}>
              Paste controlSurfaceRoot
            </Button>
            {clipboardNotice ? (
              <span style={{ color: "var(--vscode-descriptionForeground)" }}>
                {clipboardNotice}
              </span>
            ) : null}
          </ButtonGroup>

          {/* Symbol Management */}
          <div style={{ padding: "8px", borderBottom: "1px solid var(--vscode-panel-border)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Mock Symbols</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Symbol name"
                value={newSymbolName}
                onChange={(e) => setNewSymbolName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  border: "1px solid var(--vscode-input-border)",
                  flex: "0 0 120px",
                }}
              />
              <input
                type="text"
                placeholder="Value (JSON)"
                value={newSymbolValue}
                onChange={(e) => setNewSymbolValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  border: "1px solid var(--vscode-input-border)",
                  flex: 1,
                }}
              />
              <Button onClick={handleAddSymbol}>Add</Button>
              <Divider />
              <Button onClick={handleCopySymbols}>Copy Symbols JSON</Button>
              <Button onClick={handlePasteSymbols}>Paste Symbols JSON</Button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {Object.entries(symbolValues).map(([name, value]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    backgroundColor: "var(--vscode-button-secondaryBackground)",
                    border: "1px solid var(--vscode-button-border)",
                    borderRadius: "3px",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{name}:</span>
                  <span>{JSON.stringify(value)}</span>
                  <button
                    onClick={() => handleRemoveSymbol(name)}
                    style={{
                      marginLeft: "4px",
                      padding: "0 4px",
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      color: "var(--vscode-errorForeground)",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expression Management */}
          <div style={{ padding: "8px", borderBottom: "1px solid var(--vscode-panel-border)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Mock Expressions</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Expression"
                value={newExpressionText}
                onChange={(e) => setNewExpressionText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddExpression()}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  border: "1px solid var(--vscode-input-border)",
                  flex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Result (optional)"
                value={newExpressionValue}
                onChange={(e) => setNewExpressionValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddExpression()}
                style={{
                  padding: "4px 8px",
                  backgroundColor: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                  border: "1px solid var(--vscode-input-border)",
                  flex: 1,
                }}
              />
              <Button onClick={handleAddExpression}>Add</Button>
              <Divider />
              <Button onClick={handleCopyExpressions}>Copy Expressions JSON</Button>
              <Button onClick={handlePasteExpressions}>Paste Expressions JSON</Button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {Object.entries(expressionResults).map(([expr, result]) => (
                <div
                  key={expr}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    backgroundColor: result.error ? "var(--vscode-inputValidation-errorBackground)" : "var(--vscode-button-secondaryBackground)",
                    border: "1px solid var(--vscode-button-border)",
                    borderRadius: "3px",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{expr}:</span>
                  <span>{result.error || result.value}</span>
                  <button
                    onClick={() => handleRemoveExpression(expr)}
                    style={{
                      marginLeft: "4px",
                      padding: "0 4px",
                      cursor: "pointer",
                      background: "transparent",
                      border: "none",
                      color: "var(--vscode-errorForeground)",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
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
