import React from "react";

import { ControlSurfaceApi, ControlSurfaceNode } from "./ControlSurfaceApp";

const getOrientation = (
  node: Extract<ControlSurfaceNode, { type: "group" }>,
) => (node.orientation === "horizontal" ? "row" : "column");

const ControlSurfaceRange: React.FC<{
  label: string;
  min?: number;
  max?: number;
  step?: number;
  size?: "small" | "medium" | "large";
  onValueChange?: (value: number) => void;
}> = ({ label, min = 0, max = 1, step = 1, size, onValueChange }) => {
  const [value, setValue] = React.useState(min);
  const fontSize = size === "large" ? 14 : size === "small" ? 10 : 12;
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize,
      }}
    >
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          setValue(nextValue);
          onValueChange?.(nextValue);
        }}
      />
      <span style={{ color: "var(--vscode-descriptionForeground)" }}>
        {value}
      </span>
    </label>
  );
};

const renderControl = (
  node: ControlSurfaceNode,
  index: number,
  api?: ControlSurfaceApi,
): JSX.Element => {
  switch (node.type) {
    case "knob":
      return (
        <ControlSurfaceRange
          key={`knob-${index}`}
          label={node.label}
          min={node.min}
          max={node.max}
          step={node.step}
          size={node.size}
          onValueChange={(value) =>
            api?.postMessage({
              type: "setSymbol",
              symbol: node.symbol,
              value,
            })
          }
        />
      );
    case "slider":
      return (
        <ControlSurfaceRange
          key={`slider-${index}`}
          label={node.label}
          min={node.min}
          max={node.max}
          step={node.step}
          onValueChange={(value) =>
            api?.postMessage({
              type: "setSymbol",
              symbol: node.symbol,
              value,
            })
          }
        />
      );
    case "toggle":
      return (
        <label
          key={`toggle-${index}`}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <input
            type="checkbox"
            onChange={(event) =>
              api?.postMessage({
                type: "setSymbol",
                symbol: node.symbol,
                value: event.target.checked,
              })
            }
          />
          {node.label}
        </label>
      );
    case "button":
      return (
        <button
          key={`button-${index}`}
          onClick={() =>
            api?.postMessage({ type: "eval", expression: node.eval })
          }
        >
          {node.label}
        </button>
      );
    case "group":
      return (
        <div
          key={`group-${index}`}
          style={{
            display: "flex",
            flexDirection: getOrientation(node),
            gap: 8,
            border: "1px solid var(--vscode-panel-border)",
            borderRadius: 4,
            padding: 8,
          }}
        >
          <strong style={{ fontSize: 12 }}>{node.label}</strong>
          <div
            style={{
              display: "flex",
              flexDirection: getOrientation(node),
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {node.controls.map((child, childIndex) =>
              renderControl(child, childIndex, api),
            )}
          </div>
        </div>
      );
    case "page":
      return (
        <div key={`page-${index}`}>
          <h3 style={{ fontSize: 13, margin: "4px 0 8px 0" }}>{node.label}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {node.controls.map((child, childIndex) =>
              renderControl(child, childIndex, api),
            )}
          </div>
        </div>
      );
    default:
      return <div key={`unknown-${index}`}>Unknown control.</div>;
  }
};

export function ControlSurfacePage({
  page,
  api,
}: {
  page: Extract<ControlSurfaceNode, { type: "page" }>;
  api?: ControlSurfaceApi;
}): JSX.Element {
  if (!page.controls || page.controls.length === 0) {
    return (
      <div
        style={{
          color: "var(--vscode-descriptionForeground)",
          fontStyle: "italic",
          marginBottom: 12,
        }}
      >
        No controls on this page.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {page.controls.map((node, index) => renderControl(node, index, api))}
    </div>
  );
}
