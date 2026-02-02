
/*
sitting under a <ControlRow>, this is a veritcal column of <ControlCell>.

*/

export const ControlColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="control-surface-column">{children}</div>;
}