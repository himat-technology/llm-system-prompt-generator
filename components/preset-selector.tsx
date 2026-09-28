"use client";

import { PRESETS } from "@/lib/presets";
import { BracesIcon, CodeIcon, EditIcon, ShieldIcon } from "@/components/ui/icons";

interface PresetSelectorProps {
  selectedId: string | null;
  modified: boolean;
  onSelect: (presetId: string) => void;
}

const PRESET_ICONS: Record<string, typeof CodeIcon> = {
  "coding-assistant": CodeIcon,
  "data-extraction": BracesIcon,
  "support-bot": ShieldIcon,
  "docs-specialist": EditIcon,
};

/**
 * Starter preset cards. Activating one replaces the workspace with a complete, editable
 * configuration (undoable), so each card is a plain toggle button rather than a radio.
 */
export function PresetSelector({ selectedId, modified, onSelect }: PresetSelectorProps) {
  return (
    <section aria-labelledby="presets-heading">
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h2 id="presets-heading" className="text-sm font-semibold text-slate-900">
          Select starter preset persona
        </h2>
        <p className="text-xs text-slate-500">Loads every field — you can edit everything afterwards.</p>
      </div>
      <div role="group" aria-labelledby="presets-heading" className="grid gap-2.5 sm:grid-cols-2">
        {PRESETS.map((preset) => {
          const selected = preset.id === selectedId;
          const Icon = PRESET_ICONS[preset.id] ?? CodeIcon;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(preset.id)}
              className={`focus-ring group flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                selected
                  ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                }`}
              >
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                  {preset.name}
                  {selected ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        modified ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {modified ? "Edited" : "Active"}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{preset.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
