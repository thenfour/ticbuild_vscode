import React from "react";
import { renderControlSurfaceControl } from "./controlSurfaceControlDelegator";
import {
  ControlSurfacePageSpec
} from "./defs";
import { AddControlControl } from "./AddControlControl";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";
import { useControlSurfaceState } from "./hooks/ControlSurfaceState";

interface ControlSurfacePageProps {
  page: ControlSurfacePageSpec;
  //symbolValues: Record<string, any>;
  pagePath: string[];
  // designMode: boolean;
  // selectedPath?: string[] | null;
  onSelectPath?: (path: string[], node: any) => void;
  onDeletePath?: (path: string[], node: any) => void;
}

export const ControlSurfacePage: React.FC<ControlSurfacePageProps> = ({
  page,
  //symbolValues,
  pagePath,
  // designMode,
  // selectedPath,
  onSelectPath,
  onDeletePath,
}) => {
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  if (!api) {
    return null;
  }

  return (
    <div className="controlSurfaceControl controlSurfaceControl-page">
      {page.controls && page.controls.length > 0 ? (
        page.controls.map((node, index) =>
          renderControlSurfaceControl(node, index, api, stateApi, {
            parentPath: pagePath,
            //designMode,
            //selectedPath,
            onSelectPath,
            onDeletePath,
          }),
        )
      ) : (
        <div className="controlSurfaceControl controlSurfaceControl-page--empty" style={{ marginBottom: "8px" }}>
          No controls on this page.
        </div>
      )}
      <AddControlControl parentPath={pagePath} />
    </div>
  );
};
