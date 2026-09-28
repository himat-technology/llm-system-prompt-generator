"use client";

import { useRef, type ReactNode } from "react";
import type { ValidationIssue } from "@/types/prompt";
import { MAX_FIELD_LENGTH } from "@/lib/config-utils";
import { SECTION_LENGTH_WARNING } from "@/lib/prompt-validator";
import { formatCount } from "@/lib/token-estimator";
import { InfoTip } from "@/components/ui/info-tip";

interface PromptSectionProps {
  id: string;
  step?: number | string;
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  tip?: ReactNode;
  optional?: boolean;
  mono?: boolean;
  variableNames?: readonly string[];
  issues?: readonly ValidationIssue[];
}

/** A labelled builder field with step number, helper text, variable insertion and inline issues. */
export function PromptSection({
  id,
  step,
  label,
  helper,
  value,
  onChange,
  placeholder,
  rows = 3,
  tip,
  optional,
  mono,
  variableNames = [],
  issues = [],
}: PromptSectionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Until the user has placed a caret in the field, insertions go at the end rather than at
  // the browser's default selection (position 0).
  const hasCaret = useRef(false);
  const fieldId = `field-${id}`;
  const helperId = `${fieldId}-helper`;
  const issuesId = `${fieldId}-issues`;
  const nearLimit = value.length > SECTION_LENGTH_WARNING;
  const hasIssues = issues.length > 0;

  const insertVariable = (name: string) => {
    const el = textareaRef.current;
    let token = `{{${name}}}`;
    let start = value.length;
    let end = value.length;
    if (el && hasCaret.current) {
      start = el.selectionStart;
      end = el.selectionEnd;
    } else if (value && !/\s$/.test(value)) {
      token = ` ${token}`;
    }
    const next = value.slice(0, start) + token + value.slice(end);
    if (next.length > MAX_FIELD_LENGTH) return;
    onChange(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
      hasCaret.current = true;
    });
  };

  return (
    <div className="group">
      <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {step !== undefined ? (
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200"
            >
              {step}
            </span>
          ) : null}
          <label htmlFor={fieldId} className="text-sm font-semibold text-slate-900">
            {label}
          </label>
          <span id={helperId} className="text-xs text-slate-500">
            {helper}
            {optional ? " (optional)" : ""}
          </span>
          {tip ? <InfoTip label={`About ${label}`}>{tip}</InfoTip> : null}
        </div>
        {variableNames.length > 0 ? (
          <div>
            <label htmlFor={`${fieldId}-insert`} className="sr-only">
              Insert variable into {label}
            </label>
            <select
              id={`${fieldId}-insert`}
              value=""
              onChange={(e) => {
                if (e.target.value) insertVariable(e.target.value);
              }}
              className="focus-ring cursor-pointer rounded-md border border-slate-200 bg-white py-0.5 pr-6 pl-2 font-mono text-xs text-slate-600 hover:border-slate-300"
            >
              <option value="">{"+ {{variable}}"}</option>
              {variableNames.map((name) => (
                <option key={name} value={name}>
                  {`{{${name}}}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <textarea
        ref={textareaRef}
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={() => {
          hasCaret.current = true;
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={MAX_FIELD_LENGTH}
        spellCheck
        aria-describedby={`${helperId}${hasIssues ? ` ${issuesId}` : ""}`}
        aria-invalid={issues.some((i) => i.severity === "error") || undefined}
        className={`field field-sizing-content max-h-[28rem] min-h-20 resize-y leading-relaxed ${mono ? "field-mono" : ""}`}
      />
      <div className="mt-1 flex items-start justify-between gap-3">
        <div id={issuesId} className="min-w-0 space-y-0.5">
          {issues.map((issue) => (
            <p
              key={issue.id}
              className={`text-xs ${issue.severity === "error" ? "text-rose-600" : issue.severity === "warning" ? "text-amber-700" : "text-sky-700"}`}
            >
              {issue.message}
            </p>
          ))}
        </div>
        <span className={`shrink-0 font-mono text-[11px] tabular-nums ${nearLimit ? "text-amber-700" : "text-slate-400"}`}>
          {formatCount(value.length)}
          {value.length > MAX_FIELD_LENGTH * 0.9 ? ` / ${formatCount(MAX_FIELD_LENGTH)}` : ""}
        </span>
      </div>
    </div>
  );
}
