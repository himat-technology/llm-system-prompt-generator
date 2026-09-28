"use client";

import { useMemo } from "react";
import type { OutputStyle, ValidationIssue } from "@/types/prompt";
import type { PromptWorkspace } from "@/hooks/use-prompt-workspace";
import { HighlightedPrompt } from "@/components/highlighted-prompt";
import { CopyButton } from "@/components/copy-button";
import { ExportControls } from "@/components/export-controls";
import { TokenStats } from "@/components/token-stats";
import { ValidationPanel } from "@/components/validation-panel";
import { SegmentedControl } from "@/components/ui/segmented-control";

export const STYLE_OPTIONS: ReadonlyArray<{ value: OutputStyle; label: string; title: string }> = [
  { value: "markdown", label: "Markdown", title: "Structured Markdown with headings" },
  { value: "xml", label: "XML", title: "Well-formed XML tag structure" },
  { value: "plain", label: "Plain text", title: "Plain text with uppercase section titles" },
];

interface PromptOutputProps {
  workspace: PromptWorkspace;
  onJumpToField: (field: NonNullable<ValidationIssue["field"]>) => void;
}

/** Full generated prompt with format switcher, copy, export, stats and validation. */
export function PromptOutput({ workspace, onJumpToField }: PromptOutputProps) {
  const { output, style, setStyle, activeText, validation, config } = workspace;
  const definedNames = useMemo(() => new Set(config.variables.map((v) => v.name.trim())), [config.variables]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="output-heading" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="output-heading" className="text-base font-semibold text-slate-900">
              Generated system prompt
            </h2>
            <p className="text-xs text-slate-500">Updates live as you edit. Placeholders stay as {"{{variables}}"}.</p>
          </div>
          <SegmentedControl label="Output format" value={style} options={STYLE_OPTIONS} onChange={setStyle} size="sm" />
        </div>
        <HighlightedPrompt
          label={`Generated system prompt (${style})`}
          text={activeText}
          style={style}
          definedNames={definedNames}
          className="max-h-[70vh] min-h-72"
          emptyMessage="Your prompt is empty. Choose a starter preset or fill in the Builder to generate a system prompt."
        />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <ExportControls output={output} />
          <CopyButton text={activeText} />
        </div>
      </section>

      <aside className="space-y-6" aria-label="Prompt statistics and validation">
        <section aria-labelledby="stats-heading">
          <h3 id="stats-heading" className="mb-3 text-sm font-semibold text-slate-900">
            Size estimate
          </h3>
          <TokenStats text={activeText} />
        </section>
        <ValidationPanel validation={validation} onJumpToField={onJumpToField} />
      </aside>
    </div>
  );
}
