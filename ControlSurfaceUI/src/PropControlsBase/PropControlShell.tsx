/*

The prop control shell provides the layout framework for all value-based individual controls.
Layout controls won't be based on the prop control shell because they're too customized.

These should be generally useable, not only in the control surface system -- so for
example do not use controlSurfaceApi or controlSurfaceState. Prop controls shall be usable
in our own property editing UIs (like in edit mode).

# validation status
is intended for input validation errors (e.g. invalid number format)
subtle styling

# binding status
is intended for data binding status (errors not in the user's input; e.g. symbol not found)
slightly more prominent styling (e.g. border around the whole control indicating there's
an issue with the binding)

# enabled/disabled state

it's not supported yet, but the idea is that users can specify a boolean expression
(executed on the tic-80) that determines whether the control is enabled or disabled.
it's not related to design mode.

# design mode

- controls are not interactive in design mode
- styling changes to indicate design mode (border, grayscale filter over value area, etc)
- We display design tools (move up/down, delete, settings) in design mode as an overlay.

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
    disabled: boolean;

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
                    props.disabled && "cs-pp-control-shell-disabled",
                )}
        >
            {/* separate outer from inner, so we can use the outer background as
            a border.  */}
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
// tab, column, row, group

// columns are for vertical stacking of controls. most controls are expected to go in columns.
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
// groups are collapsible sections that can hold multiple controls.
// they have a header and can be expanded/collapsed.
// even though the group spec can specify horizontal or vertical layout,
// only support vertical layout for now.

////////////////////////////////////////////////////////////////////////////////////////////////////////
// tabs show multiple tab pages, only one visible at a time.

////////////////////////////////////////////////////////////////////////////////////////////////////////
// rows are for holding multiple columns side-by-side.
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
    DesignToolButton: PropControlDesignToolButton,
};