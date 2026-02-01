import React from "react";

import { MockAppContainer } from "./MockAppContainer";
import { ControlSurfaceDataSource, ControlSurfaceState, ControlSurfaceViewKind } from "./defs";
import { ControlSurfaceApp } from "./ControlSurfaceApp";
import { vscodeApi } from "./vscodeApi";

const createWindowMessageDataSource = (): ControlSurfaceDataSource => ({
  subscribe: (listener) => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as ControlSurfaceState | undefined;

      // Handle state persistence command from extension
      if (payload && (payload as any).type === '__setState') {
        if (vscodeApi?.setState) {
          const stateToSave = (payload as any).state;
          vscodeApi.setState(stateToSave);

          // Immediately check if state was saved
          const retrievedState = vscodeApi.getState?.();
        } else {
          console.error('[AppWrapper] ERROR: vscodeApi or setState not available');
        }
        return;
      }

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
    };
    return globalAny.__tic80ControlSurfaceViewKind;
  }, []);

  // Check if we're in a real VS Code webview or mock environment
  if (!vscodeApi) {
    return <MockAppContainer />;
  }

  return (
    <ControlSurfaceApp dataSource={dataSource} viewKind={viewKind} />
  );
}
