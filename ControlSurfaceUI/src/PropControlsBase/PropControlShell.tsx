// multiple of these are contained in
//   - vertical groups
//   - columns
//   - page (acts like column)
// horizontal layout options are still available:
//   - row
//   - horizontal group

// property panel individual control shell
// individual controls render as this shell, providing the layout and certain styling/behaviors specific
// to control surface.
// - selected state border
// - design mode border
// - tool buttons when in design mode
// - drag-reordering (use smooth react dnd?)
/*

<PropControl.Shell>
    <PropControl.Label>
        Example Label
    </PropControl.Label>
    <PropControl.Value>
        <input type="text" value="Example Value" readOnly />
    </PropControl.Value>
    <PropControl.Status severity="error">
        Error message here.
    </PropControl.Status>
    <PropControl.DesignToolsContainer>
        <PropControl.DesignToolButton tool="move" onClick={...} />
        <PropControl.DesignToolButton tool="delete" onClick={...} />
    </PropControl.DesignToolsContainer>
</PropControl.Shell>
*/

import React from "react";
import "./PropControls.css";
import { useControlSurfaceApi } from "../hooks/VsCodeApiContext";
import { useControlSurfaceState } from "../hooks/ControlSurfaceState";
import Icon from "@mdi/react";
import { mdiCog, mdiDelete, mdiMenuDown, mdiMenuLeft, mdiMenuUp } from "@mdi/js";
import { classes, IsNullOrWhitespace } from "../utils";

export type PropControlSeverity = "info" | "warning" | "error" | "success";


const emptyStringToNull = (value: React.ReactNode): React.ReactNode => {
    if (typeof value === "string" && IsNullOrWhitespace(value)) {
        return null;
    }
    return value;
}

// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// interface PropControlLabelProps {
//     children: React.ReactNode;
// }

// const PropControlLabel: React.FC<PropControlLabelProps> = ({ children }) => {
//     return (
//         <div className="cs-prop-control-label">
//             {children}
//         </div>
//     );
// };


// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// interface PropControlValueProps {
//     children: React.ReactNode;
// }

// const PropControlValue: React.FC<PropControlValueProps> = ({ children }) => {
//     return (
//         <div className="cs-prop-control-value">
//             {children}
//         </div>
//     );
// };

// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// interface PropControlStatusProps {
//     children: React.ReactNode;
//     severity: PropControlSeverity;
// }

// const PropControlStatus: React.FC<PropControlStatusProps> = ({ severity, children }) => {
//     return (
//         <div className={`cs-prop-control-status cs-prop-control-status-${severity}`}>
//             {children}
//         </div>
//     );
// };

// ////////////////////////////////////////////////////////////////////////////////////////////////////////
// interface PropControlDesignToolsContainerProps {
//     children: React.ReactNode;
// }
// const PropControlDesignToolsContainer: React.FC<PropControlDesignToolsContainerProps> = ({ children }) => {
//     return (
//         <div className="cs-prop-control-design-tools-container">
//             {children}
//         </div>
//     );
// };

////////////////////////////////////////////////////////////////////////////////////////////////////////
interface PropControlDesignToolButtonProps {
    tool: "moveUp" | "moveDown" | "delete" | "settings";
    onClick: () => void;
}
export const PropControlDesignToolButton: React.FC<PropControlDesignToolButtonProps> = ({ tool, onClick }) => {
    let label: React.ReactNode = null;
    switch (tool) {
        case "moveUp":
            label = <Icon path={mdiMenuUp} />;
            break;
        case "moveDown":
            label = <Icon path={mdiMenuDown} />;
            break;
        case "delete":
            label = <Icon path={mdiDelete} />;
            break;
        case "settings":
            label = <Icon path={mdiCog} />;
            break;
    }

    return (
        <button className={`cs-pp-design-tool-button cs-prop-control-design-tool-button-${tool}`} onClick={onClick}>
            {label}
        </button>
    );
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
interface PropControlShellProps {
    designMode: boolean;
    selected: boolean; // in design mode

    validationStatus: React.ReactNode; // falsy if no error.
    validationSeverity?: PropControlSeverity; // ignored if no validation error.
    bindingStatus: React.ReactNode; // falsy if none.
    bindingStatusSeverity?: PropControlSeverity; // ignored if no binding status.

    label: React.ReactNode; // can be null; empty label
    value: React.ReactNode; // can be null and the value is not shown.
    designTools?: React.ReactNode; // only show in design mode, on hover, or when selected.
}

const PropControlShell: React.FC<PropControlShellProps> = (props) => {

    // treat empty string as null so we can Boolean check them.
    const validationStatus = emptyStringToNull(props.validationStatus);
    const bindingStatus = emptyStringToNull(props.bindingStatus);
    const value = emptyStringToNull(props.value);
    const label = emptyStringToNull(props.label);

    const validationSeverity = props.validationSeverity || "error";
    const bindingStatusSeverity = props.bindingStatusSeverity || "error";

    return (
        <div
            className={
                classes(`cs-pp-control-shell`,
                    props.designMode && "cs-pp-control-shell-design-mode",
                    props.selected && "cs-pp-control-shell-selected",
                    !!validationStatus && `cs-pp-control-shell-validation-${validationSeverity}`,
                    !!bindingStatus && `cs-pp-control-shell-binding-status-${bindingStatusSeverity}`,
                )}
        >
            <div className="cs-pp-control-shell-inner">
                <div className="cs-pp-control-shell-labelvaluerow">
                    <div className="cs-pp-control-shell-label">{label}</div>
                    {value && <div className="cs-pp-control-shell-value">{value}</div>}
                </div>
                {validationStatus && <div className="cs-pp-control-shell-validation-status">
                    {validationStatus}
                </div>}
                {bindingStatus && <div className="cs-pp-control-shell-binding-status">
                    {bindingStatus}
                </div>}
            </div>
            {props.designMode && props.designTools && <div className="cs-pp-control-shell-design-tools">
                {props.designTools}
            </div>}
        </div>
    );
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
// layout controls.
// tab, column, row
interface PropControlColumnProps {
    designMode: boolean;
    selected: boolean; // in design mode

    label: React.ReactNode; // can be null; empty label
    designTools?: React.ReactNode; // only show in design mode, on hover, or when selected.

    children?: React.ReactNode;
}

const PropControlColumn: React.FC<PropControlColumnProps> = (props) => {
    return <div
        className={classes(
            "cs-pp-control-column",
            props.designMode && "cs-pp-control-column-design-mode",
            props.selected && "cs-pp-control-column-selected",
        )}
    >
        <div className="cs-pp-control-column-header">
            <div className="cs-pp-control-column-label">{props.label}</div>
            <div className="cs-pp-control-column-design-tools">
                {props.designMode && props.designTools}
            </div>
        </div>
        <div className="cs-pp-control-column-content">
            {props.children}
        </div>
    </div>;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
interface PropControlRowProps {
    designMode: boolean;
    selected: boolean; // in design mode

    label: React.ReactNode; // can be null; empty label
    designTools?: React.ReactNode; // only show in design mode, on hover, or when selected.

    children?: React.ReactNode;
}

const PropControlRow: React.FC<PropControlRowProps> = (props) => {
    return <div
        className={classes(
            "cs-pp-control-row",
            props.designMode && "cs-pp-control-row-design-mode",
            props.selected && "cs-pp-control-row-selected",
        )}
    >
        <div className="cs-pp-control-row-header">
            <div className="cs-pp-control-row-label">{props.label}</div>
            <div className="cs-pp-control-row-design-tools">
                {props.designMode && props.designTools}
            </div>
        </div>
        <div className="cs-pp-control-row-content">
            {props.children}
        </div>
    </div>;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
// root level wrapper
const PropControlRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="control-surface-controls-root pp-root">
        {children}
    </div>;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
export const PropControl = {
    Shell: PropControlShell,
    Column: PropControlColumn,
    Row: PropControlRow,
    Root: PropControlRoot,
    //Label: PropControlLabel,
    //Value: PropControlValue,
    //Status: PropControlStatus,
    // DesignToolsContainer: PropControlDesignToolsContainer,
    DesignToolButton: PropControlDesignToolButton,
};