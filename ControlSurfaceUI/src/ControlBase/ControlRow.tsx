/*

this is really the top-level thing; you add control columns to this.

*/


export const ControlRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <div className="control-surface-row">{children}</div>;
}