import React from "react";
import { useControlSurfaceApi } from "./hooks/VsCodeApiContext";

export interface GlobalSymbolDropdownProps {
    placeholderLabel?: string;
    onSelect: (symbol: string) => void;
    className?: string;
}

const PLACEHOLDER_VALUE = "__placeholder__";

export const GlobalSymbolDropdown: React.FC<GlobalSymbolDropdownProps> = ({
    placeholderLabel = "Insert global symbol",
    onSelect,
    className,
}) => {
    const api = useControlSurfaceApi();
    const [options, setOptions] = React.useState<string[]>([]);
    const [selected, setSelected] = React.useState<string>(PLACEHOLDER_VALUE);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!api) {
            setOptions([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        api.listGlobals()
            .then((globals) => {
                if (cancelled) {
                    return;
                }
                const unique = Array.from(new Set(globals)).filter(Boolean).sort();
                setOptions(unique);
            })
            .catch(() => {
                if (!cancelled) {
                    setOptions([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [api]);

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        if (value === PLACEHOLDER_VALUE) {
            return;
        }
        onSelect(value);
        setSelected(PLACEHOLDER_VALUE);
    };

    return (
        <select
            className={`control-surface-properties-input ${className ?? ""}`}
            value={selected}
            onChange={handleChange}
            disabled={loading || !api}
        >
            <option value={PLACEHOLDER_VALUE}>{placeholderLabel}</option>
            {options.map((symbol) => (
                <option key={symbol} value={symbol}>
                    {symbol}
                </option>
            ))}
        </select>
    );
};
