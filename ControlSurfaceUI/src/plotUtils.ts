export const makePlotSeriesKey = (expression: string, rateHz: number, sampleCount?: number) => {
    const count = Number.isFinite(sampleCount) && (sampleCount ?? 0) > 0 ? (sampleCount as number) : 0;
    return `${rateHz}:${count}:${expression}`;
};

export const SCOPE_SERIES_COLORS = [
    "var(--vscode-charts-blue, #41a6f6)",
    "var(--vscode-charts-green, #38b764)",
    "var(--vscode-charts-orange, #ef7d57)",
    "var(--vscode-charts-purple, #b13e53)",
    "var(--vscode-charts-yellow, #ffcd75)",
    "var(--vscode-charts-red, #b13e53)",
    "var(--vscode-charts-foreground, #f4f4f4)",
    "var(--vscode-focusBorder, #73eff7)",
];
