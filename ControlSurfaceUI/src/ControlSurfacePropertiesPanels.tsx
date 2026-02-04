import React from "react";
import { GlobalSymbolDropdown } from "./GlobalSymbolDropdown";
import {
    ControlSurfaceNode,
    ControlSurfaceKnobSpec,
    ControlSurfaceSliderSpec,
    ControlSurfaceXYSpec,
    ControlSurfaceScopeSpec,
    ControlSurfaceToggleSpec,
    ControlSurfaceNumberSpec,
    ControlSurfaceStringSpec,
    ControlSurfaceEnumButtonsSpec,
    ControlSurfaceLabelSpec,
    ControlSurfaceTriggerButtonSpec,
    ControlSurfaceGroupSpec,
    ControlSurfaceTabsSpec,
    ControlSurfacePageSpec,
} from "./defs";
import { DEFAULT_SCOPE_HEIGHT, DEFAULT_SCOPE_RATE_HZ, DEFAULT_SCOPE_RANGE, DEFAULT_SCOPE_WIDTH, MAX_SCOPE_SERIES } from "./scopeConstants";

const insertSymbol = (currentValue: string | undefined, symbol: string): string => {
    const base = currentValue ?? "";
    if (!base) {
        return symbol;
    }
    const needsSpace = /[\w\]]$/.test(base);
    return needsSpace ? `${base} ${symbol}` : `${base}${symbol}`;
};

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="control-surface-properties-field">
        <label className="control-surface-properties-label">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<{ value?: string; onChange: (value: string) => void; onBlur?: () => void }> = ({ value, onChange, onBlur }) => (
    <input
        className="control-surface-properties-input"
        type="text"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
    />
);

const NumberInput: React.FC<{ value?: number; onChange: (value: number | undefined) => void }> = ({ value, onChange }) => (
    <input
        className="control-surface-properties-input"
        type="number"
        value={value ?? ""}
        onChange={(event) => {
            const next = event.target.value.trim();
            if (!next) {
                onChange(undefined);
                return;
            }
            const parsed = Number(next);
            if (!Number.isNaN(parsed)) {
                onChange(parsed);
            }
        }}
    />
);

const TextArea: React.FC<{ value?: string; onChange: (value: string) => void; onBlur?: () => void }> = ({ value, onChange, onBlur }) => (
    <textarea
        className="control-surface-properties-input control-surface-properties-textarea"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
    />
);

export const KnobPropertiesPanel: React.FC<{ node: ControlSurfaceKnobSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Symbol">
            <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
            />
        </FieldRow>
        <FieldRow label="Min">
            <NumberInput value={node.min} onChange={(min) => onChange({ ...node, min })} />
        </FieldRow>
        <FieldRow label="Max">
            <NumberInput value={node.max} onChange={(max) => onChange({ ...node, max })} />
        </FieldRow>
        <FieldRow label="Step">
            <NumberInput value={node.step} onChange={(step) => onChange({ ...node, step })} />
        </FieldRow>
        <FieldRow label="Size">
            <select
                className="control-surface-properties-input"
                value={node.size ?? "medium"}
                onChange={(event) => onChange({ ...node, size: event.target.value as ControlSurfaceKnobSpec["size"] })}
            >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
            </select>
        </FieldRow>
    </div>
);

export const SliderPropertiesPanel: React.FC<{ node: ControlSurfaceSliderSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Symbol">
            <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
            />
        </FieldRow>
        <FieldRow label="Min">
            <NumberInput value={node.min} onChange={(min) => onChange({ ...node, min })} />
        </FieldRow>
        <FieldRow label="Max">
            <NumberInput value={node.max} onChange={(max) => onChange({ ...node, max })} />
        </FieldRow>
        <FieldRow label="Step">
            <NumberInput value={node.step} onChange={(step) => onChange({ ...node, step })} />
        </FieldRow>
    </div>
);

export const XYPropertiesPanel: React.FC<{ node: ControlSurfaceXYSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <fieldset>
            <legend>X Axis</legend>
            <FieldRow label="Symbol">
                <TextInput value={node.x.symbol} onChange={(symbol) => onChange({ ...node, x: { ...node.x, symbol } })} />
            </FieldRow>
            <FieldRow label="Insert global symbol">
                <GlobalSymbolDropdown
                    placeholderLabel="Insert global symbol"
                    onSelect={(symbol) => onChange({ ...node, x: { ...node.x, symbol: insertSymbol(node.x.symbol, symbol) } })}
                />
            </FieldRow>
            <FieldRow label="Min">
                <NumberInput value={node.x.min} onChange={(min) => onChange({ ...node, x: { ...node.x, min } })} />
            </FieldRow>
            <FieldRow label="Max">
                <NumberInput value={node.x.max} onChange={(max) => onChange({ ...node, x: { ...node.x, max } })} />
            </FieldRow>
            <FieldRow label="Step">
                <NumberInput value={node.x.step} onChange={(step) => onChange({ ...node, x: { ...node.x, step } })} />
            </FieldRow>
            <FieldRow label="Center">
                <NumberInput value={node.x.center} onChange={(center) => onChange({ ...node, x: { ...node.x, center } })} />
            </FieldRow>
            <FieldRow label="Width">
                <NumberInput value={node.x.size} onChange={(size) => onChange({ ...node, x: { ...node.x, size } })} />
            </FieldRow>
        </fieldset>
        <fieldset>
            <legend>Y Axis</legend>
            <FieldRow label="Symbol">
                <TextInput value={node.y.symbol} onChange={(symbol) => onChange({ ...node, y: { ...node.y, symbol } })} />
            </FieldRow>
            <FieldRow label="Insert global symbol">
                <GlobalSymbolDropdown
                    placeholderLabel="Insert global symbol"
                    onSelect={(symbol) => onChange({ ...node, y: { ...node.y, symbol: insertSymbol(node.y.symbol, symbol) } })}
                />
            </FieldRow>
            <FieldRow label="Min">
                <NumberInput value={node.y.min} onChange={(min) => onChange({ ...node, y: { ...node.y, min } })} />
            </FieldRow>
            <FieldRow label="Max">
                <NumberInput value={node.y.max} onChange={(max) => onChange({ ...node, y: { ...node.y, max } })} />
            </FieldRow>
            <FieldRow label="Step">
                <NumberInput value={node.y.step} onChange={(step) => onChange({ ...node, y: { ...node.y, step } })} />
            </FieldRow>
            <FieldRow label="Center">
                <NumberInput value={node.y.center} onChange={(center) => onChange({ ...node, y: { ...node.y, center } })} />
            </FieldRow>
            <FieldRow label="Height">
                <NumberInput value={node.y.size} onChange={(size) => onChange({ ...node, y: { ...node.y, size } })} />
            </FieldRow>
        </fieldset>
    </div>
);

const ScopeSeriesRow: React.FC<{
    index: number;
    series: ControlSurfaceScopeSpec["series"][number];
    onChange: (next: ControlSurfaceScopeSpec["series"][number]) => void;
}> = ({ index, series, onChange }) => (
    <div className="control-surface-properties-field">
        <label className="control-surface-properties-label">Series {index + 1}</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 6 }}>
            <TextInput value={series.expression} onChange={(expression) => onChange({ ...series, expression })} />
            <NumberInput value={series.min} onChange={(min) => onChange({ ...series, min })} />
            <NumberInput value={series.max} onChange={(max) => onChange({ ...series, max })} />
        </div>
    </div>
);

export const ScopePropertiesPanel: React.FC<{ node: ControlSurfaceScopeSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => {
    const series = node.series ?? [];
    const seriesCount = Math.min(Math.max(series.length, 1), MAX_SCOPE_SERIES);

    const updateSeriesCount = (count: number) => {
        const nextCount = Math.max(1, Math.min(MAX_SCOPE_SERIES, count));
        const nextSeries = [...series];
        while (nextSeries.length < nextCount) {
            nextSeries.push({ expression: "" });
        }
        while (nextSeries.length > nextCount) {
            nextSeries.pop();
        }
        onChange({ ...node, series: nextSeries });
    };

    return (
        <div>
            <FieldRow label="Label">
                <TextInput value={node.label ?? ""} onChange={(label) => onChange({ ...node, label })} />
            </FieldRow>
            <FieldRow label="Rate (Hz)">
                <NumberInput value={node.rateHz ?? DEFAULT_SCOPE_RATE_HZ} onChange={(rateHz) => onChange({ ...node, rateHz })} />
            </FieldRow>
            <FieldRow label="Range">
                <select
                    className="control-surface-properties-input"
                    value={node.range ?? DEFAULT_SCOPE_RANGE}
                    onChange={(event) => onChange({ ...node, range: event.target.value as ControlSurfaceScopeSpec["range"] })}
                >
                    <option value="autoUnified">Auto (Unified)</option>
                    <option value="autoPerSeries">Auto (Per Series)</option>
                </select>
            </FieldRow>
            <FieldRow label="Width">
                <NumberInput value={node.width ?? DEFAULT_SCOPE_WIDTH} onChange={(width) => onChange({ ...node, width })} />
            </FieldRow>
            <FieldRow label="Height">
                <NumberInput value={node.height ?? DEFAULT_SCOPE_HEIGHT} onChange={(height) => onChange({ ...node, height })} />
            </FieldRow>
            <FieldRow label="Series Count">
                <select
                    className="control-surface-properties-input"
                    value={seriesCount}
                    onChange={(event) => updateSeriesCount(Number(event.target.value))}
                >
                    {Array.from({ length: MAX_SCOPE_SERIES }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count}</option>
                    ))}
                </select>
            </FieldRow>
            <div className="control-surface-properties-hint">
                Series rows: Expression, Min, Max.
            </div>
            {Array.from({ length: seriesCount }, (_, index) => (
                <ScopeSeriesRow
                    key={index}
                    index={index}
                    series={series[index] ?? { expression: "" }}
                    onChange={(nextSeries) => {
                        const next = [...series];
                        next[index] = nextSeries;
                        onChange({ ...node, series: next });
                    }}
                />
            ))}
        </div>
    );
};

export const TogglePropertiesPanel: React.FC<{ node: ControlSurfaceToggleSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Symbol">
            <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
            />
        </FieldRow>
    </div>
);

export const NumberPropertiesPanel: React.FC<{ node: ControlSurfaceNumberSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Symbol">
            <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
            />
        </FieldRow>
        <FieldRow label="Min">
            <NumberInput value={node.min} onChange={(min) => onChange({ ...node, min })} />
        </FieldRow>
        <FieldRow label="Max">
            <NumberInput value={node.max} onChange={(max) => onChange({ ...node, max })} />
        </FieldRow>
        <FieldRow label="Step">
            <NumberInput value={node.step} onChange={(step) => onChange({ ...node, step })} />
        </FieldRow>
    </div>
);

export const StringPropertiesPanel: React.FC<{ node: ControlSurfaceStringSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Symbol">
            <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
            />
        </FieldRow>
    </div>
);

export const EnumButtonsPropertiesPanel: React.FC<{ node: ControlSurfaceEnumButtonsSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => {
    const [optionsText, setOptionsText] = React.useState(() => JSON.stringify(node.options ?? [], null, 2));
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setOptionsText(JSON.stringify(node.options ?? [], null, 2));
    }, [node.options]);

    const handleOptionsBlur = () => {
        try {
            const parsed = JSON.parse(optionsText);
            if (!Array.isArray(parsed)) {
                setError("Options must be an array.");
                return;
            }
            setError(null);
            onChange({ ...node, options: parsed });
        } catch (err) {
            setError("Invalid JSON.");
        }
    };

    return (
        <div>
            <FieldRow label="Label">
                <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
            </FieldRow>
            <FieldRow label="Symbol">
                <TextInput value={node.symbol} onChange={(symbol) => onChange({ ...node, symbol })} />
            </FieldRow>
            <FieldRow label="Insert global symbol">
                <GlobalSymbolDropdown
                    placeholderLabel="Insert global symbol"
                    onSelect={(symbol) => onChange({ ...node, symbol: insertSymbol(node.symbol, symbol) })}
                />
            </FieldRow>
            <FieldRow label="Options (JSON)">
                <TextArea value={optionsText} onChange={setOptionsText} onBlur={handleOptionsBlur} />
            </FieldRow>
            <div className="control-surface-properties-hint">
                {error ? error : "Update options JSON and leave field to apply."}
            </div>
        </div>
    );
};

export const LabelPropertiesPanel: React.FC<{ node: ControlSurfaceLabelSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label ?? ""} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Expression">
            <TextInput value={node.expression} onChange={(expression) => onChange({ ...node, expression })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, expression: insertSymbol(node.expression, symbol) })}
            />
        </FieldRow>
    </div>
);

export const TriggerButtonPropertiesPanel: React.FC<{ node: ControlSurfaceTriggerButtonSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Eval">
            <TextInput value={node.eval} onChange={(evalExpr) => onChange({ ...node, eval: evalExpr })} />
        </FieldRow>
        <FieldRow label="Insert global symbol">
            <GlobalSymbolDropdown
                placeholderLabel="Insert global symbol"
                onSelect={(symbol) => onChange({ ...node, eval: insertSymbol(node.eval, symbol) })}
            />
        </FieldRow>
    </div>
);

export const GroupPropertiesPanel: React.FC<{ node: ControlSurfaceGroupSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
        <FieldRow label="Orientation">
            <select
                className="control-surface-properties-input"
                value={node.orientation ?? "horizontal"}
                onChange={(event) => onChange({ ...node, orientation: event.target.value as ControlSurfaceGroupSpec["orientation"] })}
            >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
            </select>
        </FieldRow>
    </div>
);

export const TabsPropertiesPanel: React.FC<{ node: ControlSurfaceTabsSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => {
    const [labelsText, setLabelsText] = React.useState(() => (node.tabs ?? []).map((tab) => tab.label).join(", "));

    React.useEffect(() => {
        setLabelsText((node.tabs ?? []).map((tab) => tab.label).join(", "));
    }, [node.tabs]);

    const handleBlur = () => {
        const labels = labelsText
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean);
        if (labels.length === 0) {
            return;
        }
        const nextTabs = labels.map((label, index) => ({
            label,
            controls: node.tabs?.[index]?.controls ?? [],
        }));
        onChange({ ...node, tabs: nextTabs });
    };

    return (
        <div>
            <FieldRow label="Tab Labels (comma-separated)">
                <TextInput value={labelsText} onChange={setLabelsText} onBlur={handleBlur} />
            </FieldRow>
            <div className="control-surface-properties-hint">
                Leave the field to apply label changes.
            </div>
        </div>
    );
};

export const DividerPropertiesPanel: React.FC = () => (
    <div className="control-surface-properties-hint">Divider has no editable properties.</div>
);

export const PagePropertiesPanel: React.FC<{ node: ControlSurfacePageSpec; onChange: (node: ControlSurfaceNode) => void }> = ({ node, onChange }) => (
    <div>
        <FieldRow label="Label">
            <TextInput value={node.label} onChange={(label) => onChange({ ...node, label })} />
        </FieldRow>
    </div>
);
