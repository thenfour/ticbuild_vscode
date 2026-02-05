/*

The prop control shell provides the layout framework for all value-based individual controls.
Layout controls won't be based on the prop control shell because they're too customized.

These should be generally useable, not only in the control surface system -- so for
example do not use controlSurfaceApi or controlSurfaceState. Prop controls shall be usable
in our own property editing UIs (like in edit mode).

For use with the control surface system (api & state), wrapper/adaptor components will be used
(similar to those  in /ControlSurfaceControls/)

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
import { mdiCog, mdiDelete, mdiMenuDown, mdiMenuUp, mdiDrag, mdiContentCopy, mdiFolderStar, mdiBookArrowRight } from "@mdi/js";
import React from "react";
import { ButtonGroup } from "../Buttons/ButtonGroup";
import { IconButton } from "../Buttons/IconButton";
import { classes, IsNullOrWhitespace } from "../utils";
import "./PropControls.css";
import { createPropControlClasses } from "../utils/designTools";

export type PropControlSeverity = "info" | "warning" | "error" | "success";


const emptyStringToNull = (value: React.ReactNode): React.ReactNode => {
    if (typeof value === "string" && IsNullOrWhitespace(value)) {
        return null;
    }
    return value;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
interface PropControlDesignToolButtonProps {
    tool: "moveUp" | "moveDown" | "delete" | "settings" | "drag" | "setMoveDestination" | "moveToDestination";
    onClick?: () => void;
}
export const PropControlDesignToolButton: React.FC<PropControlDesignToolButtonProps> = ({ tool, onClick }) => {
    let labelPath: string | null = null;
    switch (tool) {
        case "moveUp":
            labelPath = mdiMenuUp;
            break;
        case "moveDown":
            labelPath = mdiMenuDown;
            break;
        case "drag":
            labelPath = mdiDrag;
            break;
        case "delete":
            labelPath = mdiDelete;
            break;
        case "settings":
            labelPath = mdiCog;
            break;
        case "setMoveDestination":
            labelPath = mdiFolderStar; // You might want to use a different icon here
            break;
        case "moveToDestination":
            labelPath = mdiBookArrowRight; // You might want to use a different icon here
            break;
    }

    return (
        <IconButton
            className={`cs-pp-design-tool-button cs-prop-control-design-tool-button-${tool}${tool === "drag" ? " cs-dnd-handle" : ""}`}
            onClick={onClick}
            iconPath={labelPath}
        />
    );
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
interface PropControlCopyButtonProps {
    onClick?: () => void;
}

export const PropControlCopyButton: React.FC<PropControlCopyButtonProps> = ({ onClick }) => (
    <IconButton
        className="cs-pp-design-tool-button cs-prop-control-copy-tool-button"
        onClick={onClick}
        iconPath={mdiContentCopy}
    />
);

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
    copyTools?: React.ReactNode; // only show when not in design mode, on hover.

    isConnected: boolean; // if not connected, don't show errors.
    isMoveDestination: boolean;
}
const PropControlShell: React.FC<PropControlShellProps> = (props) => {

    // treat empty string as null so we can Boolean check them.
    const validationStatus = props.isConnected ? emptyStringToNull(props.validationStatus) : null;
    const bindingStatus = props.isConnected ? emptyStringToNull(props.bindingStatus) : null;
    const value = emptyStringToNull(props.value);
    const label = emptyStringToNull(props.label);

    const validationSeverity = props.validationSeverity || "error";
    const bindingStatusSeverity = props.bindingStatusSeverity || "error";

    return (
        <div
            className={
                createPropControlClasses({
                    designMode: props.designMode,
                    selected: props.selected,
                    disabled: props.disabled,
                    isMoveDestination: props.isMoveDestination,
                    additionalClasses: classes(`cs-pp-control-shell`,
                        !!validationStatus && `cs-pp-control-shell-validation-${validationSeverity}`,
                        !!bindingStatus && `cs-pp-control-shell-binding-status-${bindingStatusSeverity}`,
                    )
                })
            }
        >
            {/* separate outer from inner, so we can use the outer background as
            a border.  */}
            <div className="cs-pp-control-shell-inner">
                <div className="cs-pp-control-shell-labelvaluerow">
                    <div className="cs-pp-control-shell-label">{label}</div>
                    {value && <div className="cs-pp-control-shell-value">{value}</div>}
                </div>
                {/* don't show validation errors during design time */}
                {!props.designMode && validationStatus && <div className="cs-pp-control-shell-validation-status">
                    {validationStatus}
                </div>}
                {/* don't show validation errors during design time */}
                {!props.designMode && bindingStatus && <div className="cs-pp-control-shell-binding-status">
                    {bindingStatus}
                </div>}
            </div>
            {props.designMode && props.designTools && (
                <ButtonGroup className="cs-pp-design-tools">
                    {props.designTools}
                </ButtonGroup>
            )}
            {!props.designMode && props.copyTools && (
                <ButtonGroup className="cs-pp-copy-tools">
                    {props.copyTools}
                </ButtonGroup>
            )}
        </div>
    );
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
// layout controls.
// tab, column, row, group


////////////////////////////////////////////////////////////////////////////////////////////////////////
// page is essentially a column with slightly different styling.
interface PropControlPageProps {
    designMode: boolean;
    selected: boolean; // in design mode

    label: React.ReactNode; // can be null; empty label
    designTools?: React.ReactNode; // only show in design mode, on hover, or when selected.
    copyTools?: React.ReactNode; // only show when not in design mode, on hover.

    children?: React.ReactNode;

    isMoveDestination: boolean;
}

const PropControlPage: React.FC<PropControlPageProps> = (props) => {
    return <div
        // className={classes(
        //     "cs-pp-control cs-pp-control-page cs-pp-control-column",
        //     props.designMode && "cs-pp-control-page-design-mode cs-pp-control-column-design-mode",
        //     props.selected && "cs-pp-control-page-selected cs-pp-control-column-selected",
        // )}
        className={createPropControlClasses({
            designMode: props.designMode,
            selected: props.selected,
            disabled: false,
            isMoveDestination: props.isMoveDestination,
            additionalClasses: "cs-pp-control-page cs-pp-control-column"
        })}
    >
        <div className="cs-pp-control-page-header cs-pp-control-column-header">
            <div className="cs-pp-control-page-label cs-pp-control-column-label">{props.label}</div>
            {props.designMode && props.designTools && <ButtonGroup className="cs-pp-design-tools">
                {props.designMode && props.designTools}
            </ButtonGroup>}
            {!props.designMode && props.copyTools && <ButtonGroup className="cs-pp-copy-tools">
                {props.copyTools}
            </ButtonGroup>}
        </div>
        <div className="cs-pp-control-page-content cs-pp-control-column-content">
            {props.children}
        </div>
    </div>;
};


// columns are for vertical stacking of controls. most controls are expected to go in columns.
interface PropControlColumnProps {
    designMode: boolean;
    selected: boolean; // in design mode

    label: React.ReactNode; // can be null; empty label
    designTools?: React.ReactNode; // only show in design mode, on hover, or when selected.
    copyTools?: React.ReactNode; // only show when not in design mode, on hover.

    children?: React.ReactNode;

    isMoveDestination: boolean;
}

const PropControlColumn: React.FC<PropControlColumnProps> = (props) => {
    return <div
        // className={classes(
        //     "cs-pp-control cs-pp-control-column",
        //     props.designMode && "cs-pp-control-column-design-mode",
        //     props.selected && "cs-pp-control-column-selected",
        // )}
        className={createPropControlClasses({
            designMode: props.designMode,
            selected: props.selected,
            disabled: false,
            isMoveDestination: props.isMoveDestination,
            additionalClasses: "cs-pp-control-column"
        })}
    >
        <div className="cs-pp-control-column-header">
            <div className="cs-pp-control-column-label">{props.label}</div>
            {props.designMode && props.designTools && <ButtonGroup className="cs-pp-design-tools">
                {props.designMode && props.designTools}
            </ButtonGroup>}
            {!props.designMode && props.copyTools && <ButtonGroup className="cs-pp-copy-tools">
                {props.copyTools}
            </ButtonGroup>}
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
    copyTools?: React.ReactNode; // only show when not in design mode, on hover.

    children?: React.ReactNode;

    isMoveDestination: boolean;
}

const PropControlRow: React.FC<PropControlRowProps> = (props) => {
    return <div
        // className={classes(
        //     "cs-pp-control cs-pp-control-row",
        //     props.designMode && "cs-pp-control-row-design-mode",
        //     props.selected && "cs-pp-control-row-selected",
        // )}
        className={createPropControlClasses({
            designMode: props.designMode,
            selected: props.selected,
            disabled: false,
            isMoveDestination: props.isMoveDestination,
            additionalClasses: "cs-pp-control-row"
        })}
    >
        <div className="cs-pp-control-row-header">
            <div className="cs-pp-control-row-label">{props.label}</div>
            {props.designMode && props.designTools && <ButtonGroup className="cs-pp-design-tools">
                {props.designMode && props.designTools}
            </ButtonGroup>}
            {!props.designMode && props.copyTools && <ButtonGroup className="cs-pp-copy-tools">
                {props.copyTools}
            </ButtonGroup>}
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
    Page: PropControlPage,
    Root: PropControlRoot,
    DesignToolButton: PropControlDesignToolButton,
    CopyButton: PropControlCopyButton,
};