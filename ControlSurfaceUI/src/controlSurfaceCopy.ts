import { ControlSurfaceNode, ControlSurfaceTabsSpec } from "./defs";

export type ExpressionResultsMap = Record<string, { value?: string; error?: string }>;

export type ControlSurfaceCopyResult = {
    text: string;
    errorCount: number;
    errors: string[];
};

const pushUnique = (list: string[], seen: Set<string>, symbol: string | undefined) => {
    if (!symbol) {
        return;
    }
    if (seen.has(symbol)) {
        return;
    }
    seen.add(symbol);
    list.push(symbol);
};

export const collectSymbolsForNode = (node: ControlSurfaceNode): string[] => {
    return collectSymbolsForNodes([node]);
};

export const collectSymbolsForNodes = (nodes: ControlSurfaceNode[]): string[] => {
    const list: string[] = [];
    const seen = new Set<string>();

    const visit = (current: ControlSurfaceNode) => {
        switch (current.type) {
            case "knob":
            case "slider":
            case "toggle":
            case "number":
            case "string":
            case "enumButtons":
                pushUnique(list, seen, current.symbol);
                return;
            case "xy":
                pushUnique(list, seen, current.x?.symbol);
                pushUnique(list, seen, current.y?.symbol);
                return;
            case "group":
            case "row":
            case "column":
            case "page":
                current.controls.forEach(visit);
                return;
            case "tabs":
                current.tabs.forEach((tab) => tab.controls.forEach(visit));
                return;
            default:
                return;
        }
    };

    nodes.forEach(visit);
    return list;
};

export const collectSymbolsForTabs = (tabs: ControlSurfaceTabsSpec["tabs"]): string[] => {
    const list: string[] = [];
    const seen = new Set<string>();

    tabs.forEach((tab) => {
        tab.controls.forEach((control) => {
            const symbols = collectSymbolsForNode(control);
            symbols.forEach((symbol) => pushUnique(list, seen, symbol));
        });
    });

    return list;
};

const isNumericLiteral = (value: string): boolean => /^-?\d+(\.\d+)?$/.test(value.trim());

const escapeLuaString = (value: string): string => {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/\"/g, "\\\"");
};

const formatLuaStringLiteral = (value: string): string => {
    return `"${escapeLuaString(value)}"`;
};

const formatLuaValue = (valueText: string): { value?: string; error?: string } => {
    const trimmed = valueText.trim();
    if (!trimmed.length) {
        return { error: "Empty value" };
    }

    if (trimmed === "nil") {
        return { value: "nil" };
    }

    if (trimmed === "true" || trimmed === "false") {
        return { value: trimmed };
    }

    if (isNumericLiteral(trimmed)) {
        return { value: trimmed };
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (parsed === null) {
            return { value: "nil" };
        }
        if (typeof parsed === "number" || typeof parsed === "boolean") {
            return { value: String(parsed) };
        }
        if (typeof parsed === "string") {
            return { value: formatLuaStringLiteral(parsed) };
        }
        return { error: "Non-primitive value" };
    } catch {
        return { value: formatLuaStringLiteral(trimmed) };
    }
};

export const buildLuaAssignmentsForSymbols = (
    symbols: string[],
    expressionResults: ExpressionResultsMap,
): ControlSurfaceCopyResult => {
    const lines: string[] = [];
    const errors: string[] = [];

    symbols.forEach((symbol) => {
        const result = expressionResults?.[symbol];
        if (!result) {
            const message = `${symbol}: No value available`;
            lines.push(`-- ERROR ${message}`);
            errors.push(message);
            return;
        }
        if (result.error) {
            const message = `${symbol}: ${result.error}`;
            lines.push(`-- ERROR ${message}`);
            errors.push(message);
            return;
        }
        if (result.value === undefined) {
            const message = `${symbol}: No value available`;
            lines.push(`-- ERROR ${message}`);
            errors.push(message);
            return;
        }
        const formatted = formatLuaValue(result.value);
        if (formatted.error || !formatted.value) {
            const message = `${symbol}: ${formatted.error ?? "Unsupported value"}`;
            lines.push(`-- ERROR ${message}`);
            errors.push(message);
            return;
        }
        lines.push(`${symbol} = ${formatted.value}`);
    });

    return {
        text: lines.join("\n"),
        errorCount: errors.length,
        errors,
    };
};

export const copyLuaAssignmentsToClipboard = async (
    symbols: string[],
    expressionResults: ExpressionResultsMap,
    showWarning?: (message: string, ...items: string[]) => Promise<string | undefined>,
): Promise<ControlSurfaceCopyResult | null> => {
    if (!symbols.length) {
        if (showWarning) {
            void showWarning("No control values found to copy.");
        }
        return null;
    }

    const result = buildLuaAssignmentsForSymbols(symbols, expressionResults);
    if (!navigator.clipboard?.writeText) {
        if (showWarning) {
            void showWarning("Clipboard API unavailable.");
        }
        return result;
    }

    try {
        await navigator.clipboard.writeText(result.text);
        if (result.errorCount > 0 && showWarning) {
            void showWarning(
                `Copied with ${result.errorCount} errors. Comments were added in the clipboard output.`,
            );
        }
        return result;
    } catch (error) {
        if (showWarning) {
            const message = error instanceof Error ? error.message : String(error);
            void showWarning(`Failed to copy values: ${message}`);
        }
        return result;
    }
};
