import React from "react";

export interface ControlSurfaceSelectableProps {
    path: string[];
    designMode: boolean;
    isSelected: boolean;
    onSelect?: (path: string[]) => void;
    onDelete?: (path: string[]) => void;
    className?: string;
    children: React.ReactNode;
}

export const ControlSurfaceSelectable: React.FC<ControlSurfaceSelectableProps> = ({
    path,
    designMode,
    isSelected,
    onSelect,
    onDelete,
    className,
    children,
}) => {
    const handleSelect = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!designMode) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(path);
    };

    const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!designMode) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        onDelete?.(path);
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
        >
            {designMode ? (
                <div className="control-surface-selectable__overlay">
                    <button
                        type="button"
                        className="control-surface-selectable__action control-surface-selectable__action--select"
                        onClick={handleSelect}
                    >
                        Select
                    </button>
                    <button
                        type="button"
                        className="control-surface-selectable__action control-surface-selectable__action--delete"
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </div>
            ) : null}
            <div className="control-surface-selectable__content">{children}</div>
        </div>
    );
};
