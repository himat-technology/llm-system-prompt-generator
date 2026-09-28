"use client";

import type { PromptValidationResult, ValidationIssue, ValidationSeverity } from "@/types/prompt";
import { AlertIcon, CheckIcon, ErrorIcon, InfoIcon } from "@/components/ui/icons";

interface ValidationPanelProps {
  validation: PromptValidationResult;
  onJumpToField?: (field: NonNullable<ValidationIssue["field"]>) => void;
  compact?: boolean;
}

const SEVERITY_ORDER: ValidationSeverity[] = ["error", "warning", "info"];

const SEVERITY_STYLE: Record<ValidationSeverity, { icon: typeof ErrorIcon; row: string; icon_cls: string; label: string }> = {
  error: { icon: ErrorIcon, row: "border-rose-200 bg-rose-50", icon_cls: "text-rose-600", label: "Error" },
  warning: { icon: AlertIcon, row: "border-amber-200 bg-amber-50", icon_cls: "text-amber-600", label: "Warning" },
  info: { icon: InfoIcon, row: "border-sky-200 bg-sky-50", icon_cls: "text-sky-600", label: "Note" },
};

export function ValidationSummary({ validation }: { validation: PromptValidationResult }) {
  const { errorCount, warningCount, infoCount } = validation;
  if (errorCount + warningCount + infoCount === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckIcon width={14} height={14} /> No issues found
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs font-medium">
      {errorCount > 0 ? <span className="text-rose-700">{errorCount} error{errorCount === 1 ? "" : "s"}</span> : null}
      {warningCount > 0 ? (
        <span className="text-amber-700">
          {warningCount} warning{warningCount === 1 ? "" : "s"}
        </span>
      ) : null}
      {infoCount > 0 ? <span className="text-sky-700">{infoCount} note{infoCount === 1 ? "" : "s"}</span> : null}
    </span>
  );
}

/** Lists validation issues by severity. Warnings and notes never block copying or exporting. */
export function ValidationPanel({ validation, onJumpToField, compact = false }: ValidationPanelProps) {
  const sorted = [...validation.issues].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const visible = compact ? sorted.slice(0, 4) : sorted;

  return (
    <section aria-labelledby="validation-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="validation-heading" className="text-sm font-semibold text-slate-900">
          Prompt validation
        </h3>
        <ValidationSummary validation={validation} />
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          Your prompt passes all checks: role, task, output format, variables and XML structure look good.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((issue) => {
            const s = SEVERITY_STYLE[issue.severity];
            const Icon = s.icon;
            const field = issue.field;
            return (
              <li key={issue.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${s.row}`}>
                <Icon className={`mt-0.5 shrink-0 ${s.icon_cls}`} aria-hidden />
                <span className="sr-only">{s.label}:</span>
                <span className="min-w-0 flex-1 break-words text-slate-800">{issue.message}</span>
                {onJumpToField && field && field !== "output" ? (
                  <button
                    type="button"
                    onClick={() => onJumpToField(field)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-indigo-700 outline-none hover:bg-white/70 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Fix
                  </button>
                ) : null}
              </li>
            );
          })}
          {compact && sorted.length > visible.length ? (
            <li className="text-xs text-slate-500">+{sorted.length - visible.length} more in the Prompt Output tab</li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
