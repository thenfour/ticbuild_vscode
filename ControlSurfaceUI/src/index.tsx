import React from "react";
import { createRoot } from "react-dom/client";
import { AppWrapper } from "./AppWrapper";

import "./ControlSurfaceRoot.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<AppWrapper />);
}
