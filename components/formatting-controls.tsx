"use client";

import type { ReactNode } from "react";
import type { OutputStyle, PromptConfig, ReasoningDepth, ValidationIssue } from "@/types/prompt";
import type { PromptAction } from "@/lib/prompt-reducer";
import { GUARDRAIL_INSTRUCTIONS, GUARDRAIL_KEYS } from "@/lib/prompt-generator";
import { MAX_FIELD_LENGTH } from "@/lib/config-utils";
import { Switch } from "@/components/ui/switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InfoTip } from "@/components/ui/info-tip";

interface FormattingControlsProps {
  config: PromptConfig;
  dispatch: (action: PromptAction) => void;
  onStyleChange: (style: OutputStyle) => void;
  issues?: readonly ValidationIssue[];
}

const DEPTH_OPTIONS: ReadonlyArray<{ value: ReasoningDepth; label: string; title: string }> = [
  { value: "concise", label: "Concise", title: "Think internally, answer with minimal justification" },
  { value: "standard", label: "Standard", title: "Identify constraints, check assumptions, verify output" },
  { value: "detailed", label: "Detailed", title: "Decompose, weigh alternatives and edge cases, summarize trade-offs" },
];

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase ring-1 ring-slate-200">
      {children}
    </span>
  );
}

/** XML structure, reasoning and safety guardrail configuration. */
export function FormattingControls({ config, dispatch, onStyleChange, issues = [] }: FormattingControlsProps) {
  const { reasoning, safety, formatting } = config;
  const xmlEnabled = formatting.style === "xml";

  return (
    <section aria-labelledby="controls-heading" className="space-y-5">
      <div>
        <h2 id="controls-heading" className="text-sm font-semibold text-slate-900">
          Formatting, reasoning &amp; safety controls
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Toggles update the generated prompt instantly.</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <Switch
          checked={xmlEnabled}
          onChange={(on) => onStyleChange(on ? "xml" : "markdown")}
          label="XML tag structure"
          badge={<Badge>Best for Claude &amp; DeepSeek</Badge>}
          description={
            <>
              Wraps sections in <code className="font-mono">{"<role>"}</code>, <code className="font-mono">{"<task>"}</code>,{" "}
              <code className="font-mono">{"<rules>"}</code>, <code className="font-mono">{"<output_format>"}</code> and more. Content
              with code or markup is wrapped in CDATA so the XML is always well-formed.
            </>
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <Switch
          checked={reasoning.enabled}
          onChange={(on) => dispatch({ type: "setReasoning", patch: { enabled: on } })}
          label="Structured reasoning instructions"
          badge={<Badge>Thinking controls</Badge>}
          description="Tells the model to reason internally and share only conclusions and concise justification."
        />
        <div className={`mt-3 flex flex-wrap items-center gap-3 ${reasoning.enabled ? "" : "opacity-60"}`}>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
            Reasoning depth
            <InfoTip label="About reasoning depth">
              Controls how thoroughly the model is instructed to analyze a request before answering. This app does
              not and cannot expose a model&apos;s hidden chain-of-thought; the instructions ask for concise
              conclusions instead.
            </InfoTip>
          </span>
          <SegmentedControl
            label="Reasoning depth"
            size="sm"
            value={reasoning.depth}
            options={DEPTH_OPTIONS}
            disabled={!reasoning.enabled}
            onChange={(depth) => dispatch({ type: "setReasoning", patch: { depth } })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <Switch
          checked={safety.enabled}
          onChange={(on) => dispatch({ type: "setSafety", patch: { enabled: on } })}
          label="Safety guardrails"
          badge={<Badge>Anti-jailbreak &amp; refusal</Badge>}
          description="Adds prompt-injection resistance, instruction hierarchy, secret protection and graceful refusal."
        />
        <fieldset disabled={!safety.enabled} className={`mt-4 space-y-4 ${safety.enabled ? "" : "opacity-60"}`}>
          <legend className="sr-only">Guardrail options</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {GUARDRAIL_KEYS.map((key) => {
              const inputId = `guardrail-${key}`;
              return (
                <div key={key} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={safety[key]}
                    onChange={(e) => dispatch({ type: "setSafety", patch: { [key]: e.target.checked } })}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500"
                  />
                  <label htmlFor={inputId} className="cursor-pointer text-xs leading-snug text-slate-700">
                    <span className="font-medium text-slate-900">{GUARDRAIL_INSTRUCTIONS[key].label}</span>
                  </label>
                  <span className="ml-auto">
                    <InfoTip label={`What "${GUARDRAIL_INSTRUCTIONS[key].label}" adds`}>
                      {GUARDRAIL_INSTRUCTIONS[key].instruction}
                    </InfoTip>
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            <label htmlFor="field-refusal-directive" className="text-sm font-medium text-slate-900">
              Guardrail / refusal directive
            </label>
            <p id="field-refusal-directive-help" className="mb-1.5 text-xs text-slate-500">
              Custom instruction appended to the guardrails. Supports {"{{variables}}"}.
            </p>
            <textarea
              id="field-refusal-directive"
              value={safety.refusalDirective}
              onChange={(e) => dispatch({ type: "setSafety", patch: { refusalDirective: e.target.value } })}
              rows={3}
              maxLength={MAX_FIELD_LENGTH}
              aria-describedby="field-refusal-directive-help"
              placeholder="e.g. If the request is out of scope or unsafe, politely refuse with a brief explanation."
              className="field field-sizing-content min-h-20 resize-y leading-relaxed"
            />
            {issues.map((issue) => (
              <p key={issue.id} className={`mt-1 text-xs ${issue.severity === "warning" ? "text-amber-700" : "text-sky-700"}`}>
                {issue.message}
              </p>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
