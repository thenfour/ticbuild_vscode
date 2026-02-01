import React from "react";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import {
  ControlSurfaceApi,
  ControlSurfacePageSpec
} from "./defs";

interface ControlSurfacePageProps {
  page: ControlSurfacePageSpec;
  api?: ControlSurfaceApi;
}

export const ControlSurfacePage: React.FC<ControlSurfacePageProps> = ({
  page,
  api,
}) => {
  if (!page.controls || page.controls.length === 0) {
    return (
      <div className="controlSurfaceControl controlSurfaceControl-page controlSurfaceControl-page--empty">
        No controls on this page.
      </div>
    );
  }

  return (
    <div className="controlSurfaceControl controlSurfaceControl-page">
      {page.controls.map((node, index) =>
        renderControlSurfaceControl(node, index, api),
      )}
    </div>
  );
};
