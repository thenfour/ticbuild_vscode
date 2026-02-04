import React from "react";
import { QuickAddProps } from "../controlRegistry";

export const ScopeQuickAdd: React.FC<QuickAddProps> = ({ onSubmit }) => {
    const [label, setLabel] = React.useState("");
    const [seriesText, setSeriesText] = React.useState("");

    React.useEffect(() => {
        onSubmit({ label, seriesText });
    }, [label, seriesText, onSubmit]);

    return (
        <div>
            <div style={{ marginBottom: "8px" }}>
                <label style={{ display: "block", marginBottom: "4px" }}>Label</label>
                <input
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Plot label"
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
                    Series (comma-separate multiple series expressions)
                </label>
                <input
                    type="text"
                    value={seriesText}
                    onChange={(event) => setSeriesText(event.target.value)}
                    placeholder="player1Health, player2Health"
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
