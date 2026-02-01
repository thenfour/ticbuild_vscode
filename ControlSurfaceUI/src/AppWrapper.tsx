import React from "react";

import { MockAppContainer } from "./MockAppContainer";
import { ControlSurfaceDataSource, ControlSurfaceState, ControlSurfaceViewKind } from "./defs";
import { ControlSurfaceApp } from "./ControlSurfaceApp";

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

export function AppWrapper(): JSX.Element {
  const dataSource = React.useMemo(() => createWindowMessageDataSource(), []);
  const viewKind = React.useMemo(() => {
    const globalAny = window as typeof window & {
      __tic80ControlSurfaceViewKind?: ControlSurfaceViewKind;
      acquireVsCodeApi?: () => unknown;
    };
    return globalAny.__tic80ControlSurfaceViewKind;
  }, []);

  // Check if we're in a real VS Code webview or mock environment
  const globalAny = window as typeof window & {
    acquireVsCodeApi?: () => unknown;
  };

  if (!globalAny.acquireVsCodeApi) {
    return <MockAppContainer />;
  }

  return (
    <ControlSurfaceApp dataSource={dataSource} viewKind={viewKind} />
  );
}
