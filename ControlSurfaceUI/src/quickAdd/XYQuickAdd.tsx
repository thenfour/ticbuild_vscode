import React from "react";
import { QuickAddProps } from "../controlRegistry";

export const XYQuickAdd: React.FC<QuickAddProps> = ({ onSubmit }) => {
    const [label, setLabel] = React.useState("");
    const [xSymbol, setXSymbol] = React.useState("");
    const [ySymbol, setYSymbol] = React.useState("");

    React.useEffect(() => {
        onSubmit({ label, xSymbol, ySymbol });
    }, [label, xSymbol, ySymbol, onSubmit]);

    return (
        <div>
            <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", marginBottom: "4px" }}>Label</label>
                <input
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
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
            <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", marginBottom: "4px" }}>X Symbol</label>
                <input
                    type="text"
                    value={xSymbol}
                    onChange={(event) => setXSymbol(event.target.value)}
                    placeholder="X symbol (e.g., player.x)"
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
                <label style={{ display: "block", marginBottom: "4px" }}>Y Symbol</label>
                <input
                    type="text"
                    value={ySymbol}
                    onChange={(event) => setYSymbol(event.target.value)}
                    placeholder="Y symbol (e.g., player.y)"
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
