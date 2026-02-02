// message displayed under the control

import React from "react";

import "./ControlStatusMessage.css";

export interface ControlStatusMessageProps {
    message?: string;
    style: "error" | "info" | "warning" | "success";
}

export const ControlStatusMessage: React.FC<ControlStatusMessageProps> = ({ message, style }) => {
    if (!message) {
        return null;
    }
    return (
        <span
            className={`control-surface-status-message control-surface-status-message-${style}`}
            style={{ color: message ? 'var(--vscode-errorForeground)' : undefined }}
        >
            {message}
        </span>
    );
}
