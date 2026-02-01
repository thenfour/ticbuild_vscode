import React from "react";
import { ButtonGroup } from "../Buttons/ButtonGroup";

import { IconButton } from "../Buttons/IconButton";
import "./NumericUpDown.css";
import { mdiMenuLeft, mdiMenuRight } from "@mdi/js";

interface IntegerUpDownProps {
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}

// allows typing intermediate invalid values (free text); highlights when invalid.
export const IntegerUpDown: React.FC<IntegerUpDownProps> = (props) => {
  const [inputValue, setInputValue] = React.useState<string>(
    props.value.toString(),
  );

  React.useEffect(() => {
    setInputValue(props.value.toString());
  }, [props.value]);

  const handleNewIntegerValue = (newValue: number) => {
    if (newValue < props.min || newValue > props.max) return;
    setInputValue(newValue.toString());
    props.onChange(newValue);
  };

  const isValidValue = (val: any): boolean => {
    // try parse it, if it's non-integral or out of range, return false
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) return false;
    return val >= props.min && val <= props.max;
  };

  const handleNewTextInput = (newText: string) => {
    setInputValue(newText);
    const parsed = parseInt(newText, 10);
    if (isValidValue(parsed)) {
      props.onChange(parsed);
    }
  };

  const applyStep = (delta: number) => {
    if (props.disabled) return;
    // apply step to current prop value (committed value), not input value
    handleNewIntegerValue(
      Math.min(props.max, Math.max(props.min, props.value + delta)),
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (props.disabled) return;

    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        applyStep(1);
        return;
      case "ArrowDown":
        e.preventDefault();
        applyStep(-1);
        return;
      case "PageUp":
        e.preventDefault();
        applyStep(10);
        return;
      case "PageDown":
        e.preventDefault();
        applyStep(-10);
        return;
      case "Home":
        e.preventDefault();
        handleNewIntegerValue(props.min);
        return;
      case "End":
        e.preventDefault();
        handleNewIntegerValue(props.max);
        return;
      default:
        return;
    }
  };

  const classes = ["integer-up-down"];
  if (!isValidValue(inputValue)) {
    classes.push("integer-up-down--invalid");
  }
  if (props.disabled) {
    classes.push("integer-up-down--disabled");
  }

  return (
    <div className={classes.join(" ")}>
      <ButtonGroup>
        <input
          type="text"
          className="integer-up-down__input"
          disabled={props.disabled}
          value={inputValue}
          onChange={(e) => handleNewTextInput(e.target.value)}
          onKeyDown={onKeyDown}
          inputMode="numeric"
        />
        <IconButton
          onClick={() => handleNewIntegerValue(props.value - 1)}
          disabled={props.value <= props.min || props.disabled}
          iconPath={mdiMenuLeft}
        ></IconButton>
        <IconButton
          onClick={() => handleNewIntegerValue(props.value + 1)}
          disabled={props.value >= props.max || props.disabled}
          iconPath={mdiMenuRight}
        ></IconButton>
      </ButtonGroup>
    </div>
  );
};

interface NumericUpDownProps {
  value: number;
  onChange: (newValue: number) => void;
  min: number;
  max: number;
  step?: number; // default 0.1
  largeStep?: number; // default 1.0, for page up/down
  decimals?: number; // decimal places to display, default 2
  disabled?: boolean;
}

// allows typing intermediate invalid values (free text); highlights when invalid.
// operates on float values with configurable step sizes
export const NumericUpDown: React.FC<NumericUpDownProps> = (props) => {
  const step = props.step ?? 0.1;
  const largeStep = props.largeStep ?? 1.0;
  const decimals = props.decimals ?? 2;

  const formatValue = (val: number): string => {
    return val.toFixed(decimals);
  };

  const [inputValue, setInputValue] = React.useState<string>(
    formatValue(props.value),
  );

  React.useEffect(() => {
    setInputValue(formatValue(props.value));
  }, [props.value, decimals]);

  const clampValue = (val: number): number => {
    return Math.min(props.max, Math.max(props.min, val));
  };

  const handleNewNumericValue = (newValue: number) => {
    const clamped = clampValue(newValue);
    setInputValue(formatValue(clamped));
    props.onChange(clamped);
  };

  const isValidValue = (val: any): boolean => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return false;
    return parsed >= props.min && parsed <= props.max;
  };

  const handleNewTextInput = (newText: string) => {
    setInputValue(newText);
    const parsed = parseFloat(newText);
    if (isValidValue(parsed)) {
      props.onChange(clampValue(parsed));
    }
  };

  const applyStep = (delta: number) => {
    if (props.disabled) return;
    // apply step to current prop value (committed value), not input value
    const newValue = props.value + delta;
    handleNewNumericValue(newValue);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (props.disabled) return;

    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        applyStep(step);
        return;
      case "ArrowDown":
        e.preventDefault();
        applyStep(-step);
        return;
      case "PageUp":
        e.preventDefault();
        applyStep(largeStep);
        return;
      case "PageDown":
        e.preventDefault();
        applyStep(-largeStep);
        return;
      case "Home":
        e.preventDefault();
        handleNewNumericValue(props.min);
        return;
      case "End":
        e.preventDefault();
        handleNewNumericValue(props.max);
        return;
      default:
        return;
    }
  };

  const classes = ["numeric-up-down"];
  if (!isValidValue(inputValue)) {
    classes.push("numeric-up-down--invalid");
  }
  if (props.disabled) {
    classes.push("numeric-up-down--disabled");
  }

  const canDecrement = props.value > props.min;
  const canIncrement = props.value < props.max;

  return (
    <div className={classes.join(" ")}>
      <ButtonGroup>
        <input
          type="text"
          className="numeric-up-down__input"
          disabled={props.disabled}
          value={inputValue}
          onChange={(e) => handleNewTextInput(e.target.value)}
          onKeyDown={onKeyDown}
          inputMode="decimal"
        />
        <IconButton
          onClick={() => applyStep(-step)}
          disabled={!canDecrement || props.disabled}
          iconPath={mdiMenuLeft}
        ></IconButton>
        <IconButton
          onClick={() => applyStep(step)}
          disabled={!canIncrement || props.disabled}
          iconPath={mdiMenuRight}
        ></IconButton>
      </ButtonGroup>
    </div>
  );
};
