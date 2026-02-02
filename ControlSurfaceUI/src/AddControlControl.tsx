import React from "react";
import { Button } from "./Buttons/PushButton";
import { ControlQuickAdd } from "./ControlQuickAdd";
import { ControlSurfaceApi } from "./defs";

export interface AddControlControlProps {
  api: ControlSurfaceApi;
  parentPath?: string[]; // Path to the parent container (for targeting where to add)
  disabled?: boolean;
}

export const AddControlControl: React.FC<AddControlControlProps> = ({ api, parentPath = [], disabled = false }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  React.useEffect(() => {
    if (disabled && isAdding) {
      setIsAdding(false);
    }
  }, [disabled, isAdding]);

  if (isAdding) {
    return (
      <ControlQuickAdd
        api={api}
        parentPath={parentPath}
        onComplete={() => setIsAdding(false)}
        onCancel={() => setIsAdding(false)}
      />
    );
  }

  return (
    <div style={{ padding: "8px" }}>
      <Button onClick={() => setIsAdding(true)} style={{ width: "100%" }} disabled={disabled}>
        + Add Control
      </Button>
    </div>
  );
};
