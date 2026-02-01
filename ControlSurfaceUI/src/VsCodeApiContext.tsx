import React from "react";

import { vscodeApi } from "./vscodeApi";

export type VsCodeApi = typeof vscodeApi;

const VsCodeApiContext = React.createContext<VsCodeApi | undefined>(vscodeApi);

export const VsCodeApiProvider = ({ children }: { children: React.ReactNode }) => (
  <VsCodeApiContext.Provider value={vscodeApi}>
    {children}
  </VsCodeApiContext.Provider>
);

export const useVsCodeApi = (): VsCodeApi | undefined =>
  React.useContext(VsCodeApiContext);
