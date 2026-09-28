"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ValidationIssue } from "@/types/prompt";
import { usePromptWorkspace } from "@/hooks/use-prompt-workspace";
import { PromptBuilder } from "@/components/prompt-builder";
import { PromptOutput, STYLE_OPTIONS } from "@/components/prompt-output";
import { VariableSimulator } from "@/components/variable-simulator";
import { HighlightedPrompt } from "@/components/highlighted-prompt";
import { CopyButton } from "@/components/copy-button";
import { TokenStats } from "@/components/token-stats";
import { ValidationPanel } from "@/components/validation-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InfoTip } from "@/components/ui/info-tip";
import { LockIcon, ResetIcon } from "@/components/ui/icons";

type TabId = "builder" | "output" | "simulator";
type JumpField = NonNullable<ValidationIssue["field"]>;

const FIELD_TARGETS: Record<JumpField, string> = {
  role: "field-role",
  task: "field-task",
  rules: "field-rules",
  outputFormat: "field-outputFormat",
  context: "field-context",
  examples: "field-examples",
  variables: "variables-heading",
  safety: "field-refusal-directive",
  output: "output-heading",
};

export function PromptWorkspace() {
  const workspace = usePromptWorkspace();
  const {
    config,
    validation,
    style,
    setStyle,
    activeText,
    isDefault,
    resetToDefault,
    undoState,
    undo,
    dismissUndo,
    persistDrafts,
    storageAvailable,
    saveStatus,
    togglePersistDrafts,
    detectedVariables,
  } = workspace;

  const [activeTab, setActiveTab] = useState<TabId>("builder");
  const [confirmReset, setConfirmReset] = useState(false);
  const [, setFocusTick] = useState(0);
  const pendingFocus = useRef<string | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ builder: null, output: null, simulator: null });

  const issueCount = validation.errorCount + validation.warningCount;
  const tabs: ReadonlyArray<{ id: TabId; label: string; badge?: number; badgeTone?: string }> = [
    { id: "builder", label: "Builder" },
    {
      id: "output",
      label: "Prompt Output",
      badge: issueCount || undefined,
      badgeTone: validation.errorCount > 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800",
    },
    {
      id: "simulator",
      label: "Variable Simulator",
      badge: detectedVariables.length || undefined,
      badgeTone: "bg-indigo-100 text-indigo-700",
    },
  ];

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    // The ref is cleared inside the frame so a re-render that cancels this frame retries the focus.
    const frame = requestAnimationFrame(() => {
      pendingFocus.current = null;
      const el = document.getElementById(target);
      if (!el) return;
      const details = el.closest("details");
      if (details && !details.open) details.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) el.focus({ preventScroll: true });
      else {
        el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  const jumpToField = useCallback((field: JumpField) => {
    pendingFocus.current = FIELD_TARGETS[field];
    setActiveTab("builder");
    // Re-render so the focus effect runs even when the builder tab is already active.
    setFocusTick((t) => t + 1);
  }, []);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const id = tabs[next].id;
      setActiveTab(id);
      tabRefs.current[id]?.focus();
    }
  };

  const definedNames = useMemo(() => new Set(config.variables.map((v) => v.name.trim())), [config.variables]);

  const saveMessage = !storageAvailable
    ? "Browser storage is unavailable, so drafts cannot be saved."
    : !persistDrafts
      ? "Off: nothing is stored. Your work is lost when you close the tab."
      : saveStatus === "skipped-secret"
        ? "Not saved: a possible credential was detected in your prompt."
        : saveStatus === "unavailable"
          ? "Could not write to browser storage."
          : "On: drafts are saved to this browser's localStorage only.";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div
          role="tablist"
          aria-label="Workspace"
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:pb-0"
        >
          {tabs.map((tab, i) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={selected ? `panel-${tab.id}` : undefined}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm ${
                  selected ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.label}
                {tab.badge ? (
                  <span
                    className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${selected ? "bg-white/20 text-white" : tab.badgeTone}`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
            <input
              id="persist-drafts"
              type="checkbox"
              checked={persistDrafts}
              disabled={!storageAvailable}
              onChange={(e) => togglePersistDrafts(e.target.checked)}
              aria-describedby="persist-drafts-status"
              className="h-4 w-4 cursor-pointer accent-indigo-600 disabled:cursor-not-allowed"
            />
            <label htmlFor="persist-drafts" className="cursor-pointer text-xs font-medium text-slate-700">
              Save draft locally
            </label>
            {persistDrafts && saveStatus ? (
              <span
                aria-hidden
                className={`text-[11px] font-medium ${saveStatus === "saved" ? "text-emerald-700" : "text-amber-700"}`}
              >
                {saveStatus === "saved" ? "Saved" : "Not saved"}
              </span>
            ) : null}
            <span id="persist-drafts-status" className="sr-only">
              {saveMessage}
            </span>
            <InfoTip label="About local draft saving">
              {saveMessage} Drafts never leave your device, and turning this off deletes the stored draft. Simulator test
              values are never stored.
            </InfoTip>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmReset(true)}
            disabled={isDefault}
            title={isDefault ? "Already using the default configuration" : "Restore the default example configuration"}
          >
            <ResetIcon /> Reset Default
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="p-4 sm:p-6">
        {activeTab === "builder" ? (
          <div id="panel-builder" role="tabpanel" aria-labelledby="tab-builder" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
            <PromptBuilder workspace={workspace} />
            <aside aria-label="Live prompt preview" className="min-w-0">
              <div className="space-y-4 lg:sticky lg:top-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-lg">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Live preview
                    </h2>
                    <SegmentedControl label="Preview format" value={style} options={STYLE_OPTIONS} onChange={setStyle} size="sm" tone="dark" />
                  </div>
                  <HighlightedPrompt
                    label="Live preview of the generated system prompt"
                    text={activeText}
                    style={style}
                    definedNames={definedNames}
                    className="max-h-[50vh] min-h-48"
                    emptyMessage="Start typing in the Builder or pick a preset — your prompt appears here instantly."
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                    <button type="button" onClick={() => setActiveTab("output")} className="rounded text-xs font-medium text-slate-300 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-indigo-400">
                      Open full output &amp; export →
                    </button>
                    <CopyButton text={activeText} className="focus-visible:ring-offset-slate-900" />
                  </div>
                </div>
                <div className="card space-y-4 p-4">
                  <TokenStats text={activeText} compact />
                  <ValidationPanel validation={validation} onJumpToField={jumpToField} compact />
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "output" ? (
          <div id="panel-output" role="tabpanel" aria-labelledby="tab-output">
            <PromptOutput workspace={workspace} onJumpToField={jumpToField} />
          </div>
        ) : null}

        {activeTab === "simulator" ? (
          <div id="panel-simulator" role="tabpanel" aria-labelledby="tab-simulator">
            <VariableSimulator workspace={workspace} onGoToBuilder={() => setActiveTab("builder")} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:px-6 rounded-b-2xl">
        <LockIcon className="shrink-0 text-emerald-600" />
        <span>
          <strong className="font-semibold text-slate-800">100% client-side privacy:</strong> prompt generation,
          validation, variable substitution, copy and export all run in this tab. No prompts or variables leave browser
          memory.
        </span>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to the default example?"
        confirmLabel="Reset workspace"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetToDefault();
        }}
      >
        This replaces all sections, formatting options, guardrails and variables with the default AI Coding Assistant
        example. You can undo this right after resetting.
      </ConfirmDialog>

      <Toast
        id={undoState?.id}
        message={undoState?.message ?? null}
        actionLabel="Undo"
        onAction={undo}
        onDismiss={dismissUndo}
      />
    </div>
  );
}
