"use client";

import { useRef, type KeyboardEvent } from "react";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  tone?: "light" | "dark";
  disabled?: boolean;
}

/** Radio-group style segmented control with arrow-key navigation. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  tone = "light",
  disabled,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = options.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
      refs.current[next]?.focus();
    }
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const container = tone === "dark" ? "bg-slate-800 ring-slate-700" : "bg-slate-100 ring-slate-200";
  const ringOffset = tone === "dark" ? "focus-visible:ring-offset-slate-800" : "";

  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg p-0.5 ring-1 ${container}`}>
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const colors =
          tone === "dark"
            ? selected
              ? "bg-slate-600 text-white shadow"
              : "text-slate-300 hover:text-white"
            : selected
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900";
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={opt.title}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`focus-ring cursor-pointer rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${colors} ${ringOffset}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
