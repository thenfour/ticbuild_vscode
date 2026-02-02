import React from "react";
import { ControlSurfaceNode, ControlSurfaceApi } from "./defs";

export interface QuickAddProps {
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
}

export interface ControlRenderProps {
  node: ControlSurfaceNode;
  api: ControlSurfaceApi;
  symbolValues?: Record<string, any>;
  pollIntervalMs: number;
}

export interface ControlPropertiesProps {
  node: ControlSurfaceNode;
  onChange: (node: ControlSurfaceNode) => void;
}

export interface ControlTypeRegistryEntry {
  type: string;
  displayName: string;
  category: "input" | "display" | "layout" | "action";
  quickAddComponent: React.ComponentType<QuickAddProps>;
  renderComponent: React.ComponentType<any>;
  propertiesPanelComponent?: React.ComponentType<any>;
  createDefaultSpec: (quickAddData: Record<string, any>) => Partial<ControlSurfaceNode>;
  description?: string;
}

class ControlRegistryClass {
  private entries = new Map<string, ControlTypeRegistryEntry>();

  register(entry: ControlTypeRegistryEntry): void {
    this.entries.set(entry.type, entry);
  }

  getAll(): ControlTypeRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByType(type: string): ControlTypeRegistryEntry | undefined {
    return this.entries.get(type);
  }

  getByCategory(): Map<string, ControlTypeRegistryEntry[]> {
    const byCategory = new Map<string, ControlTypeRegistryEntry[]>();

    for (const entry of this.entries.values()) {
      const category = entry.category;
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(entry);
    }

    return byCategory;
  }
}

export const ControlRegistry = new ControlRegistryClass();

export const CATEGORY_NAMES: Record<string, string> = {
  input: "Input Controls",
  display: "Display Controls",
  layout: "Layout Containers",
  action: "Action Controls",
};
