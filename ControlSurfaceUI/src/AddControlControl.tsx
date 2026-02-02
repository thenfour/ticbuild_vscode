import React from "react";
import { Button } from "./Buttons/PushButton";
import { ControlQuickAdd } from "./ControlQuickAdd";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

export interface AddControlControlProps {
  parentPath: string[]; // Path to the parent container (for targeting where to add)
  //disabled: boolean;
}

export const AddControlControl: React.FC<AddControlControlProps> = ({ parentPath }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const api = useControlSurfaceApi();

  if (!api) {
    return null;
  }

  React.useEffect(() => {
    if (isAdding) {
      setIsAdding(false);
    }
  }, [isAdding]);

  if (isAdding) {
    return (
      <ControlQuickAdd
        parentPath={parentPath}
        onComplete={() => setIsAdding(false)}
        onCancel={() => setIsAdding(false)}
      />
    );
  }

  return (
    <div style={{ padding: "8px" }}>
      <Button onClick={() => setIsAdding(true)} style={{ width: "100%" }}>
        + Add Control {parentPath}
      </Button>
    </div>
  );
};
