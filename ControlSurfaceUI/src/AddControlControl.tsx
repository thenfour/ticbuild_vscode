import React from "react";
import { Button, TextButton } from "./Buttons/PushButton";
import { ControlQuickAdd } from "./ControlQuickAdd";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";
import { useControlSurfaceState } from "./hooks/ControlSurfaceState";

export interface AddControlControlProps {
  parentPath: string[]; // Path to the parent container (for targeting where to add)
  //disabled: boolean;
}

export const AddControlControl: React.FC<AddControlControlProps> = ({ parentPath }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const api = useControlSurfaceApi();
  const stateApi = useControlSurfaceState();

  React.useEffect(() => {
    if (!stateApi.state.designMode && isAdding) {
      setIsAdding(false);
    }
  }, [isAdding, stateApi.state.designMode]);

  if (!api || !stateApi.state.designMode) {
    return null;
  }

  if (isAdding) {
    return (
      <div className="control-surface-interactive">
        <ControlQuickAdd
          parentPath={parentPath}
          onComplete={() => setIsAdding(false)}
          onCancel={() => setIsAdding(false)}
        />
      </div>
    );
  }

  return (
    <div className="control-surface-interactive" style={{ padding: "8px" }}>
      <TextButton onClick={() => setIsAdding(true)}>
        + Add Control {parentPath}
      </TextButton>
    </div>
  );
};
