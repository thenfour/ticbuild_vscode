import React from "react";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import {
  ControlSurfaceApi,
  ControlSurfacePageSpec
} from "./defs";
import { AddControlControl } from "./AddControlControl";

interface ControlSurfacePageProps {
  page: ControlSurfacePageSpec;
  api: ControlSurfaceApi;
  symbolValues: Record<string, any>;
  pollIntervalMs: number;
  pageId?: string;
}

export const ControlSurfacePage: React.FC<ControlSurfacePageProps> = ({
  page,
  api,
  symbolValues,
  pollIntervalMs,
  pageId = "root",
}) => {
  return (
    <div className="controlSurfaceControl controlSurfaceControl-page">
      {page.controls && page.controls.length > 0 ? (
        page.controls.map((node, index) =>
          renderControlSurfaceControl(node, index, api, symbolValues, pollIntervalMs),
        )
      ) : (
        <div className="controlSurfaceControl controlSurfaceControl-page--empty" style={{ marginBottom: "8px" }}>
          No controls on this page.
        </div>
      )}
      <AddControlControl api={api} parentPath={[pageId]} />
    </div>
  );
};
