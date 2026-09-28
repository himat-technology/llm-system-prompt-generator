"use client";

import { useMemo } from "react";
import type { PromptWorkspace } from "@/hooks/use-prompt-workspace";
import { humanizeVariableName } from "@/lib/variable-parser";
import { HighlightedPrompt } from "@/components/highlighted-prompt";
import { CopyButton } from "@/components/copy-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { STYLE_OPTIONS } from "@/components/prompt-output";
import { BracesIcon } from "@/components/ui/icons";

interface VariableSimulatorProps {
  workspace: PromptWorkspace;
  onGoToBuilder: () => void;
}

/** Enter test values for each detected `{{variable}}` and preview the fully resolved prompt. */
export function VariableSimulator({ workspace, onGoToBuilder }: VariableSimulatorProps) {
  const {
    config,
    detectedVariables,
    simValues,
    setSimValue,
    useSampleFallback,
    setUseSampleFallback,
    fillSimWithSamples,
    clearSimValues,
    resolutionValues,
    resolvedText,
    activeText,
    style,
    setStyle,
  } = workspace;

  const definitions = useMemo(() => new Map(config.variables.map((v) => [v.name.trim(), v])), [config.variables]);
  const definedNames = useMemo(() => new Set(definitions.keys()), [definitions]);
  const unresolved = detectedVariables.filter((name) => !resolutionValues[name]);
  const hasSamples = detectedVariables.some((name) => definitions.get(name)?.sampleValue);
  const hasTyped = Object.values(simValues).some(Boolean);

  if (detectedVariables.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <BracesIcon />
        </span>
        <h2 className="mt-3 text-base font-semibold text-slate-900">No variables in your prompt yet</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add placeholders such as <code className="font-mono">{"{{user_name}}"}</code> or{" "}
          <code className="font-mono">{"{{project_name}}"}</code> to any Builder section, then test them here with real
          values.
        </p>
        <button type="button" className="btn btn-primary mt-5" onClick={onGoToBuilder}>
          Go to Builder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="sim-inputs-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="sim-inputs-heading" className="text-base font-semibold text-slate-900">
              Test values
            </h2>
            <p className="text-xs text-slate-500">
              {detectedVariables.length} variable{detectedVariables.length === 1 ? "" : "s"} detected in the prompt.
              Values are kept in memory only and are never saved.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="mr-1 inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={useSampleFallback}
                onChange={(e) => setUseSampleFallback(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-indigo-600"
              />
              Use sample values for empty fields
            </label>
            <button type="button" className="btn btn-secondary px-2.5 py-1.5 text-xs" onClick={fillSimWithSamples} disabled={!hasSamples}>
              Fill with samples
            </button>
            <button type="button" className="btn btn-ghost px-2.5 py-1.5 text-xs" onClick={clearSimValues} disabled={!hasTyped}>
              Clear
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detectedVariables.map((name) => {
            const def = definitions.get(name);
            const inputId = `sim-${name}`;
            const helpId = `${inputId}-help`;
            return (
              <div key={name} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor={inputId} className="text-sm font-medium text-slate-900">
                    {humanizeVariableName(name)}
                  </label>
                  <code className={`font-mono text-[11px] ${def ? "text-indigo-600" : "text-amber-700"}`}>{`{{${name}}}`}</code>
                </div>
                <input
                  id={inputId}
                  value={simValues[name] ?? ""}
                  onChange={(e) => setSimValue(name, e.target.value)}
                  placeholder={def?.sampleValue || `Value for ${name}`}
                  aria-describedby={helpId}
                  className="field"
                />
                <p id={helpId} className="mt-1 text-xs text-slate-500">
                  {def ? def.description || "No description." : "Not defined in the Builder — using the raw placeholder."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="sim-preview-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="sim-preview-heading" className="text-base font-semibold text-slate-900">
              Preview
            </h2>
            <p className="text-xs" aria-live="polite">
              {unresolved.length === 0 ? (
                <span className="text-emerald-700">All variables resolved.</span>
              ) : (
                <span className="text-amber-700">
                  Unresolved: {unresolved.map((n) => `{{${n}}}`).join(", ")}
                </span>
              )}
            </p>
          </div>
          <SegmentedControl label="Preview format" value={style} options={STYLE_OPTIONS} onChange={setStyle} size="sm" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Original Template</h3>
            <HighlightedPrompt
              label="Original template"
              text={activeText}
              style={style}
              definedNames={definedNames}
              className="max-h-[60vh] min-h-64"
            />
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Resolved Prompt</h3>
            </div>
            <HighlightedPrompt
              label="Resolved prompt"
              text={resolvedText}
              style={style}
              definedNames={definedNames}
              className="max-h-[60vh] min-h-64"
            />
            <div className="mt-3 flex justify-end">
              <CopyButton text={resolvedText} label="Copy Resolved Prompt" variant="secondary" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
