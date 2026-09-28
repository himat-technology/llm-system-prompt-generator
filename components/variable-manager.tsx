"use client";

import { useEffect, useRef } from "react";
import type { PromptConfig, VariableMetadata } from "@/types/prompt";
import type { PromptAction } from "@/lib/prompt-reducer";
import { MAX_VARIABLES } from "@/lib/config-utils";
import { findDuplicateVariableNames, getVariableNameError, toVariableName } from "@/lib/variable-parser";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { InfoTip } from "@/components/ui/info-tip";

interface VariableManagerProps {
  config: PromptConfig;
  metadata: readonly VariableMetadata[];
  dispatch: (action: PromptAction) => void;
}

/** Define, edit and delete `{{variables}}`; surfaces placeholders that are used but not defined. */
export function VariableManager({ config, metadata, dispatch }: VariableManagerProps) {
  const { variables } = config;
  const listRef = useRef<HTMLUListElement>(null);
  const focusNewRef = useRef(false);
  const prevCount = useRef(variables.length);

  useEffect(() => {
    if (focusNewRef.current && variables.length > prevCount.current) {
      const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input[data-variable-name]");
      const last = inputs?.[inputs.length - 1];
      last?.focus();
      last?.select();
    }
    focusNewRef.current = false;
    prevCount.current = variables.length;
  }, [variables.length]);

  const duplicates = new Set(findDuplicateVariableNames(variables));
  const undefinedNames = metadata.filter((m) => !m.defined).map((m) => m.name);
  const usage = new Map(metadata.map((m) => [m.name, m.occurrences]));
  const atLimit = variables.length >= MAX_VARIABLES;

  const addVariable = () => {
    focusNewRef.current = true;
    dispatch({ type: "addVariable" });
  };

  return (
    <section aria-labelledby="variables-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="variables-heading" className="flex items-center gap-1 text-sm font-semibold text-slate-900">
            Dynamic variable placeholders <code className="font-mono text-xs font-normal text-slate-500">{"{{name}}"}</code>
            <InfoTip label="How variables work">
              Type <code>{"{{variable_name}}"}</code> in any section to create a placeholder. Names may contain letters,
              digits and underscores and cannot start with a digit. Test substitution in the Variable Simulator tab.
            </InfoTip>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Reusable placeholders, detected automatically from your prompt.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={addVariable} disabled={atLimit}>
          <PlusIcon /> Add Variable
        </button>
      </div>

      {undefinedNames.length > 0 ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-amber-900">Detected in prompt but not defined:</p>
            {undefinedNames.length > 1 ? (
              <button
                type="button"
                onClick={() => dispatch({ type: "addVariables", names: undefinedNames })}
                className="rounded px-1.5 py-0.5 text-xs font-semibold text-amber-900 underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Define all
              </button>
            ) : null}
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {undefinedNames.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "addVariables", names: [name] })}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 font-mono text-xs text-amber-900 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label={`Define variable ${name}`}
                >
                  <PlusIcon width={12} height={12} />
                  {`{{${name}}}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {variables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">No variables defined</p>
          <p className="mt-1 text-xs text-slate-500">
            Click <span className="font-medium">Add Variable</span> or type{" "}
            <code className="font-mono">{"{{user_name}}"}</code> into any section.
          </p>
        </div>
      ) : (
        <ul ref={listRef} className="space-y-2.5">
          {variables.map((v, index) => {
            const name = v.name.trim();
            const nameError = getVariableNameError(v.name) ?? (duplicates.has(name) ? "Duplicate name: variable names must be unique." : null);
            const suggestion = nameError && name && !duplicates.has(name) ? toVariableName(name) : null;
            const count = usage.get(name) ?? 0;
            const base = `var-${v.id}`;
            return (
              <li key={v.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_auto]">
                  <div>
                    <label htmlFor={`${base}-name`} className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                      Variable name
                    </label>
                    <div className="relative">
                      <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-xs text-slate-400">
                        {"{{"}
                      </span>
                      <input
                        id={`${base}-name`}
                        data-variable-name
                        value={v.name}
                        onChange={(e) => dispatch({ type: "updateVariable", id: v.id, patch: { name: e.target.value } })}
                        spellCheck={false}
                        autoComplete="off"
                        maxLength={80}
                        aria-invalid={nameError ? true : undefined}
                        aria-describedby={nameError ? `${base}-name-error` : undefined}
                        className="field field-mono px-7"
                      />
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs text-slate-400">
                        {"}}"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${base}-desc`} className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                      Description
                    </label>
                    <input
                      id={`${base}-desc`}
                      value={v.description}
                      onChange={(e) => dispatch({ type: "updateVariable", id: v.id, patch: { description: e.target.value } })}
                      placeholder="What this variable represents"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${base}-sample`} className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                      Sample / default value
                    </label>
                    <input
                      id={`${base}-sample`}
                      value={v.sampleValue}
                      onChange={(e) => dispatch({ type: "updateVariable", id: v.id, patch: { sampleValue: e.target.value } })}
                      placeholder="Used in the simulator"
                      className="field"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 md:flex-col md:items-end md:justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                        count > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count > 0 ? `Used ${count}×` : "Unused"}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "removeVariable", id: v.id })}
                      className="btn btn-danger-ghost p-2"
                      aria-label={`Delete variable ${name || `#${index + 1}`}`}
                      title="Delete variable"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                {nameError ? (
                  <p id={`${base}-name-error`} className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-rose-600">
                    {nameError}
                    {suggestion && suggestion !== v.name ? (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "updateVariable", id: v.id, patch: { name: suggestion } })}
                        className="rounded border border-rose-200 bg-white px-1.5 py-0.5 font-mono text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        Use {suggestion}
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {atLimit ? <p className="mt-2 text-xs text-slate-500">Maximum of {MAX_VARIABLES} variables reached.</p> : null}
    </section>
  );
}
