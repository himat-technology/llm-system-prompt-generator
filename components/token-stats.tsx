"use client";

import { useMemo } from "react";
import { estimateText, formatCount } from "@/lib/token-estimator";
import { InfoTip } from "@/components/ui/info-tip";

interface TokenStatsProps {
  text: string;
  compact?: boolean;
}

/** Character, word and approximate token counts for the given text (computed locally). */
export function TokenStats({ text, compact = false }: TokenStatsProps) {
  const stats = useMemo(() => estimateText(text), [text]);
  const items = [
    { label: "Characters", value: stats.characters },
    { label: "Words", value: stats.words },
    ...(compact ? [] : [{ label: "Lines", value: stats.lines }]),
    { label: "Approx. tokens", value: stats.approxTokens, tip: true },
  ];
  return (
    <dl className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            {item.label}
            {item.tip ? (
              <InfoTip label="How tokens are estimated">
                Estimated locally at roughly 1 token per 4 characters, a common heuristic for English text. Actual
                counts vary by model tokenizer, language, and content such as code.
              </InfoTip>
            ) : null}
          </dt>
          <dd className="mt-0.5 font-mono text-base font-semibold text-slate-900 tabular-nums">
            {item.tip ? "~" : ""}
            {formatCount(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
