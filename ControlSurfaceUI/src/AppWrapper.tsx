import React from "react";

import { MockAppContainer } from "./MockAppContainer";
import { ControlSurfaceApi, ControlSurfaceDataSource, ControlSurfaceState, ControlSurfaceViewKind } from "./defs";
import { ControlSurfaceApp } from "./ControlSurfaceApp";

const getVsCodeApi = (): ControlSurfaceApi | undefined => {
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

export function AppWrapper(): JSX.Element {
  const api = React.useMemo(() => getVsCodeApi(), []);
  const dataSource = React.useMemo(() => createWindowMessageDataSource(), []);
  const viewKind = React.useMemo(() => {
    const globalAny = window as typeof window & {
      __tic80ControlSurfaceViewKind?: ControlSurfaceViewKind;
    };
    return globalAny.__tic80ControlSurfaceViewKind;
  }, []);

  if (!api) {
    return <MockAppContainer />;
  }

  return (
    <ControlSurfaceApp api={api} dataSource={dataSource} viewKind={viewKind} />
  );
}
