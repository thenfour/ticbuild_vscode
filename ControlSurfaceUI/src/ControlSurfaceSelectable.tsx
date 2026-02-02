import React from "react";

export interface ControlSurfaceSelectableProps {
    path: string[];
    designMode: boolean;
    isSelected: boolean;
    onSelect?: (path: string[]) => void;
    className?: string;
    children: React.ReactNode;
}

export const ControlSurfaceSelectable: React.FC<ControlSurfaceSelectableProps> = ({
    path,
    designMode,
    isSelected,
    onSelect,
    className,
    children,
}) => {
    const handleSelect = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!designMode) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(path);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!designMode) {
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(path);
        }
    };

    return (
        <div
            className={[
                "control-surface-selectable",
                designMode ? "control-surface-selectable--design" : "",
                isSelected ? "control-surface-selectable--selected" : "",
                className ?? "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            role={designMode ? "button" : undefined}
            tabIndex={designMode ? 0 : -1}
            aria-pressed={designMode ? isSelected : undefined}
        >
            <div className="control-surface-selectable__content">{children}</div>
        </div>
    );
};
