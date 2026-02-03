// alias of button base until otherwise needed.

import React from "react";
import { ButtonBase, ButtonBaseProps } from "./ButtonBase";

export const Button = ButtonBase;

// export interface ButtonBaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
//     children?: React.ReactNode;
//     highlighted?: boolean; // use for highlighting / selecetd state.
//     className?: string;
// }

export interface TextButtonProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    highlighted?: boolean; // use for highlighting / selecetd state.
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
}

export const TextButton = React.forwardRef<HTMLDivElement, TextButtonProps>(
    ({ children, className, highlighted, ...props }, ref) => {
        const classes = [
            `somatic-text-button`,
            className,
            highlighted ? 'somatic-button-base--highlighted' : 'somatic-button-base--not-highlighted',
            props.disabled ? 'somatic-button-base--disabled' : 'somatic-button-base--enabled',
        ];

        return (
            <div
                ref={ref}
                className={classes.filter(Boolean).join(' ')}
                {...props}
            >
                {children}
            </div>
        );
    },
);
