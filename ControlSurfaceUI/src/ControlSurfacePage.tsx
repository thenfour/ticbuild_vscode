import React from "react";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import {
  ControlSurfacePageSpec
} from "./defs";
import { AddControlControl } from "./AddControlControl";
import { useControlSurfaceApi } from "./VsCodeApiContext";

interface ControlSurfacePageProps {
  page: ControlSurfacePageSpec;
  symbolValues: Record<string, any>;
  pollIntervalMs: number;
  pagePath: string[];
  designMode: boolean;
  selectedPath?: string[] | null;
  onSelectPath?: (path: string[], node: any) => void;
  onDeletePath?: (path: string[], node: any) => void;
}

export const ControlSurfacePage: React.FC<ControlSurfacePageProps> = ({
  page,
  symbolValues,
  pollIntervalMs,
  pagePath,
  designMode,
  selectedPath,
  onSelectPath,
  onDeletePath,
}) => {
  const api = useControlSurfaceApi();

  if (!api) {
    return null;
  }

  return (
    <div className="controlSurfaceControl controlSurfaceControl-page">
      {page.controls && page.controls.length > 0 ? (
        page.controls.map((node, index) =>
          renderControlSurfaceControl(node, index, api, symbolValues, pollIntervalMs, {
            parentPath: pagePath,
            designMode,
            selectedPath,
            onSelectPath,
            onDeletePath,
          }),
        )
      ) : (
        <div className="controlSurfaceControl controlSurfaceControl-page--empty" style={{ marginBottom: "8px" }}>
          No controls on this page.
        </div>
      )}
      <AddControlControl parentPath={pagePath} disabled={designMode} />
    </div>
  );
};
