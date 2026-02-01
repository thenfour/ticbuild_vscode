import React from "react";
import { createRoot } from "react-dom/client";
import { AppWrapper } from "./AppWrapper";
import { registerBuiltInControls } from "./quickAdd/registerBuiltInControls";

import "./ControlSurfaceRoot.css";

registerBuiltInControls();

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<AppWrapper />);
}
