import React from "react";
import { QuickAddProps } from "../controlRegistry";

export const SymbolQuickAdd: React.FC<QuickAddProps & { label?: string }> = ({
  onSubmit,
  label = "Symbol",
}) => {
  const [symbol, setSymbol] = React.useState("");
  const [controlLabel, setControlLabel] = React.useState("");

  React.useEffect(() => {
    onSubmit({ symbol, label: controlLabel });
  }, [symbol, controlLabel, onSubmit]);

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
        <label style={{ display: "block", marginBottom: "4px" }}>
          Label
        </label>
        <input
          type="text"
          value={controlLabel}
          onChange={(e) => setControlLabel(e.target.value)}
          placeholder="Display label"
          style={{
            width: "100%",
            padding: "4px 8px",
            backgroundColor: "var(--vscode-input-background)",
            color: "var(--vscode-input-foreground)",
            border: "1px solid var(--vscode-input-border)",
          }}
        />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>
          {label}
        </label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol name (e.g., x, player.health)"
          style={{
            width: "100%",
            padding: "4px 8px",
            backgroundColor: "var(--vscode-input-background)",
            color: "var(--vscode-input-foreground)",
            border: "1px solid var(--vscode-input-border)",
          }}
        />
      </div>
    </div>
  );
};
