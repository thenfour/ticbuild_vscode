import React from "react";
import { Button } from "./Buttons/PushButton";
import { ButtonGroup } from "./Buttons/ButtonGroup";
import { Dropdown } from "./basic/Dropdown";
import { ControlRegistry, CATEGORY_NAMES } from "./controlRegistry";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

export interface ControlQuickAddProps {
  parentPath: string[];
  onComplete: () => void;
  onCancel: () => void;
}

export const ControlQuickAdd: React.FC<ControlQuickAddProps> = ({
  parentPath,
  onComplete,
  onCancel,
}) => {
  const api = useControlSurfaceApi();
  const [selectedType, setSelectedType] = React.useState<string>("");
  const [quickAddData, setQuickAddData] = React.useState<Record<string, any>>({});

  const byCategory = ControlRegistry.getByCategory();
  const selectedEntry = selectedType ? ControlRegistry.getByType(selectedType) : undefined;

  // Build dropdown options grouped by category
  const dropdownOptions = React.useMemo(() => {
    const options: Array<{ label: string; value: string }> = [];

    // Add categories in order
    const categoryOrder: Array<"input" | "display" | "action" | "layout"> = [
      "input",
      "display",
      "action",
      "layout",
    ];

    categoryOrder.forEach((category) => {
      const entries = byCategory.get(category);
      if (entries && entries.length > 0) {
        // Add category header
        options.push({
          label: `─── ${CATEGORY_NAMES[category]} ───`,
          value: `__category_${category}`,
        });
        // Add entries
        entries.forEach((entry) => {
          options.push({
            label: `  ${entry.displayName}`,
            value: entry.type,
          });
        });
      }
    });

    return options;
  }, [byCategory]);

  const handleSubmit = () => {
    if (!selectedEntry) return;
    if (!api) return;

    const controlSpec = selectedEntry.createDefaultSpec(quickAddData);

    api.postMessage({
      type: "addControl",
      parentPath,
      control: controlSpec,
    });

    onComplete();
  };

  const QuickAddComponent = selectedEntry?.quickAddComponent;

  return (
    <div
      style={{
        padding: "12px",
        border: "1px solid var(--vscode-panel-border)",
        borderRadius: "4px",
        backgroundColor: "var(--vscode-editor-background)",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
          Control Type
        </label>
        <Dropdown
          value={selectedType}
          onChange={(value) => {
            // Ignore category headers
            if (!value.startsWith("__category_")) {
              setSelectedType(value);
              setQuickAddData({});
            }
          }}
          options={dropdownOptions}
        />
        {selectedEntry?.description && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "11px",
              color: "var(--vscode-descriptionForeground)",
            }}
          >
            {selectedEntry.description}
          </div>
        )}
      </div>

      {QuickAddComponent && (
        <div style={{ marginBottom: "12px" }}>
          <QuickAddComponent
            onSubmit={(data) => {
              setQuickAddData(data);
            }}
            onCancel={onCancel}
          />
        </div>
      )}

      <ButtonGroup>
        <Button onClick={handleSubmit} disabled={!selectedType || !selectedEntry}>
          Add Control
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </ButtonGroup>
    </div>
  );
};
