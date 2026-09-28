"use client";

import { useId, type ReactNode } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

/** Accessible toggle switch (`role="switch"`) with an associated label and description. */
export function Switch({ checked, onChange, label, description, badge, disabled }: SwitchProps) {
  const id = useId();
  const buttonId = `${id}-switch`;
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <label
            id={labelId}
            htmlFor={buttonId}
            className={`text-sm font-medium text-slate-900 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            {label}
          </label>
          {badge}
        </div>
        {description ? (
          <p id={descId} className="mt-0.5 text-xs text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`focus-ring relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-indigo-600" : "bg-slate-300"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
