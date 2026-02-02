/*


<ControlCell>
    <ControlCellLabel label="Example Label" />
    <ControlCellValue value="Example Value" />
    <ControlCellStatus status="active" />
</ControlCell>


*/


export interface ControlCellProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
};

export const ControlCell: React.FC<ControlCellProps> = ({ children, style, className }) => {
    return <div className={`control-surface-cell ${className}`} style={style}>{children}</div>;
};