import { CONTROL_PATH_ROOT, parseControlPathSegment } from "./controlPathBase";
import { ControlSurfaceNode } from "./defs";

type ResolvedControlPath = {
  node: ControlSurfaceNode;
  parentControls: ControlSurfaceNode[];
  index: number;
};

export const resolveControlByPath = (
  controlSurfaceRoot: ControlSurfaceNode[],
  path: string[] | null | undefined,
): ResolvedControlPath | null => {
  if (!path || path.length === 0) {
    return null;
  }

  let current: any = { controls: controlSurfaceRoot };
  let parentControls: ControlSurfaceNode[] | null = null;
  let index: number | null = null;

  for (const segment of path) {
    const parsed = parseControlPathSegment(segment);
    if (!parsed) {
      return null;
    }
    if (parsed.kind === "root") {
      continue;
    }
    if (parsed.kind === "control") {
      if (!Array.isArray(current.controls) || parsed.index < 0 || parsed.index >= current.controls.length) {
        return null;
      }
      parentControls = current.controls;
      index = parsed.index;
      current = current.controls[parsed.index];
      continue;
    }
    if (parsed.kind === "tab") {
      if (!Array.isArray(current.tabs) || parsed.index < 0 || parsed.index >= current.tabs.length) {
        return null;
      }
      current = current.tabs[parsed.index];
    }
  }

  if (parentControls && index !== null) {
    return {
      node: current as ControlSurfaceNode,
      parentControls,
      index,
    };
  }

  return null;
};

export const findControlPathByNode = (
  controlSurfaceRoot: ControlSurfaceNode[],
  target: ControlSurfaceNode,
): string[] | null => {
  const visit = (nodes: ControlSurfaceNode[], path: string[]): string[] | null => {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const nextPath = [...path, `c${index}`];
      if (node === target) {
        return nextPath;
      }

      if (node.type === "tabs") {
        for (let tabIndex = 0; tabIndex < node.tabs.length; tabIndex += 1) {
          const tab = node.tabs[tabIndex];
          const tabPath = [...nextPath, `t${tabIndex}`];
          const foundInTab = visit(tab.controls, tabPath);
          if (foundInTab) {
            return foundInTab;
          }
        }
      }

      if ("controls" in node && Array.isArray(node.controls)) {
        const found = visit(node.controls, nextPath);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  return visit(controlSurfaceRoot, [CONTROL_PATH_ROOT]);
};
