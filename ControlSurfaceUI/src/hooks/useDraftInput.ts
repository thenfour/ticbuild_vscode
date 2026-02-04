import React from "react";

export type DraftInputParseResult<T> = {
    value: T;
    isValid: boolean;
};

export type UseDraftInputOptions<T> = {
    value: T;
    format: (value: T) => string;
    parse: (text: string) => DraftInputParseResult<T>;
    onCommit: (value: T) => void;
    commitOnBlur?: boolean;
};

export type DraftInputApi = {
    text: string;
    isValid: boolean;
    isDirty: boolean;
    isEditing: boolean;
    onChangeText: (text: string) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    commit: () => void;
    discard: () => void;
};

export const useDraftInput = <T>(options: UseDraftInputOptions<T>): DraftInputApi => {
    const { value, format, parse, onCommit, commitOnBlur = true } = options;
    const [text, setText] = React.useState<string>(() => format(value));
    const [isEditing, setIsEditing] = React.useState(false);

    const formattedValue = React.useMemo(() => format(value), [format, value]);

    React.useEffect(() => {
        if (!isEditing) {
            setText(formattedValue);
        }
    }, [formattedValue, isEditing]);

    const parseResult = React.useMemo(() => parse(text), [parse, text]);
    const isDirty = text !== formattedValue;

    const commit = React.useCallback(() => {
        if (!parseResult.isValid) {
            setText(formattedValue);
            setIsEditing(false);
            return;
        }
        onCommit(parseResult.value);
        setText(format(parseResult.value));
        setIsEditing(false);
    }, [parseResult, onCommit, format, formattedValue]);

    const discard = React.useCallback(() => {
        setText(formattedValue);
        setIsEditing(false);
    }, [formattedValue]);

    const onFocus = React.useCallback(() => {
        setIsEditing(true);
    }, []);

    const onBlur = React.useCallback(() => {
        if (commitOnBlur && isDirty) {
            commit();
        } else {
            discard();
        }
    }, [commitOnBlur, commit, discard, isDirty]);

    const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commit();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            discard();
        }
    }, [commit, discard]);

    const onChangeText = React.useCallback((nextText: string) => {
        setText(nextText);
    }, []);

    return {
        text,
        isValid: parseResult.isValid,
        isDirty,
        isEditing,
        onChangeText,
        onFocus,
        onBlur,
        onKeyDown,
        commit,
        discard,
    };
};
