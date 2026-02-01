import React from "react";
import { createRoot } from "react-dom/client";
import { ControlSurfaceApp } from "./ControlSurfaceApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<ControlSurfaceApp />);
}
