"use client";

import { useMemo } from "react";
import type { PromptSectionKey, ValidationIssue } from "@/types/prompt";
import type { PromptWorkspace } from "@/hooks/use-prompt-workspace";
import { isValidVariableName } from "@/lib/variable-parser";
import { PresetSelector } from "@/components/preset-selector";
import { PromptSection } from "@/components/prompt-section";
import { FormattingControls } from "@/components/formatting-controls";
import { VariableManager } from "@/components/variable-manager";
import { ChevronDownIcon } from "@/components/ui/icons";

interface SectionDef {
  key: PromptSectionKey;
  label: string;
  helper: string;
  placeholder: string;
  rows: number;
  tip?: string;
  mono?: boolean;
}

const CORE_SECTIONS: SectionDef[] = [
  {
    key: "role",
    label: "Role & Identity",
    helper: "Who is the AI?",
    placeholder: "You are a Principal Software Engineer specializing in…",
    rows: 3,
    tip: "Define the persona, seniority, domain expertise and tone. A specific role anchors vocabulary and judgement.",
  },
  {
    key: "task",
    label: "Primary Objective & Task",
    helper: "What should it do?",
    placeholder: "Review the provided code or requirements and…",
    rows: 4,
    tip: "Describe the job to be done and what a successful response achieves.",
  },
  {
    key: "rules",
    label: "Rules, Boundaries & Constraints",
    helper: "What must it obey?",
    placeholder: "- Always…\n- Never…",
    rows: 4,
    tip: "Hard requirements and prohibitions. Bullet lists are easiest for models to follow.",
  },
  {
    key: "outputFormat",
    label: "Output Format & Schema",
    helper: "JSON, Markdown, XML?",
    placeholder: "Markdown with code blocks, or a JSON object matching this schema: {…}",
    rows: 3,
    tip: "Specify the exact structure, e.g. a JSON schema, Markdown headings, or XML tags the answer must use.",
    mono: false,
  },
];

const OPTIONAL_SECTIONS: SectionDef[] = [
  {
    key: "context",
    label: "Context & Background",
    helper: "Domain, audience, environment",
    placeholder: "User context: {{user_context}}. The product is…",
    rows: 3,
    tip: "Background the model needs: audience, product, environment, or reference facts. Rendered as <context>.",
  },
  {
    key: "examples",
    label: "Examples",
    helper: "Few-shot input → output pairs",
    placeholder: 'Input: "…"\nOutput: {…}',
    rows: 4,
    tip: "Concrete examples dramatically improve format adherence. Rendered as <examples> (CDATA-wrapped if it contains code or markup).",
    mono: true,
  },
];

export function PromptBuilder({ workspace }: { workspace: PromptWorkspace }) {
  const { config, dispatch, validation, output, selectedPresetId, presetModified, applyPreset, setStyle } = workspace;

  const issuesByField = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of validation.issues) {
      if (!issue.field) continue;
      const list = map.get(issue.field) ?? [];
      list.push(issue);
      map.set(issue.field, list);
    }
    return map;
  }, [validation.issues]);

  const variableNames = useMemo(
    () => [...new Set(config.variables.map((v) => v.name.trim()).filter(isValidVariableName))],
    [config.variables],
  );

  const renderSection = (def: SectionDef, step?: number) => (
    <PromptSection
      key={def.key}
      id={def.key}
      step={step}
      label={def.label}
      helper={def.helper}
      placeholder={def.placeholder}
      rows={def.rows}
      tip={def.tip}
      mono={def.mono}
      optional={step === undefined}
      value={config.sections[def.key]}
      onChange={(value) => dispatch({ type: "setSection", key: def.key, value })}
      variableNames={variableNames}
      issues={issuesByField.get(def.key)}
    />
  );

  return (
    <div className="space-y-8">
      <PresetSelector selectedId={selectedPresetId} modified={presetModified} onSelect={applyPreset} />

      <section aria-labelledby="sections-heading" className="space-y-5">
        <h2 id="sections-heading" className="sr-only">
          Prompt sections
        </h2>
        {CORE_SECTIONS.map((def, i) => renderSection(def, i + 1))}

        <details open className="group rounded-xl border border-slate-200 bg-slate-50/50 [&_summary::-webkit-details-marker]:hidden">
          <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800">
            <span>
              Optional sections{" "}
              <span className="font-normal text-slate-500">— context &amp; few-shot examples</span>
            </span>
            <ChevronDownIcon className="text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-5 px-4 pt-1 pb-4">{OPTIONAL_SECTIONS.map((def) => renderSection(def))}</div>
        </details>
      </section>

      <FormattingControls
        config={config}
        dispatch={dispatch}
        onStyleChange={setStyle}
        issues={issuesByField.get("safety")}
      />

      <VariableManager config={config} metadata={output.variables} dispatch={dispatch} />
    </div>
  );
}
