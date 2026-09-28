"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import type { OutputStyle } from "@/types/prompt";
import { tokenizeTemplate } from "@/lib/variable-parser";

interface HighlightedPromptProps {
  text: string;
  style: OutputStyle;
  /** Defined variable names; undefined placeholders are highlighted as warnings. */
  definedNames?: ReadonlySet<string>;
  emptyMessage?: ReactNode;
  className?: string;
  label: string;
  id?: string;
}

const XML_TOKEN = /(<\/?[A-Za-z_][\w.-]*>|<!\[CDATA\[|\]\]>)/g;
const MD_HEADING = /^(#{1,6} .*)$/gm;
const PLAIN_HEADING = /^([A-Z][A-Z0-9 &,/-]{3,})$/gm;

function highlightText(text: string, style: OutputStyle, keyPrefix: string): ReactNode[] {
  const pattern = style === "xml" ? XML_TOKEN : style === "markdown" ? MD_HEADING : PLAIN_HEADING;
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const cls =
        style === "xml"
          ? part.startsWith("<![") || part === "]]>"
            ? "text-slate-500"
            : "text-sky-300"
          : "font-semibold text-emerald-300";
      return (
        <span key={`${keyPrefix}-${i}`} className={cls}>
          {part}
        </span>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

/** Read-only, syntax-highlighted view of a generated prompt. Placeholders are color-coded. */
export function HighlightedPrompt({
  text,
  style,
  definedNames,
  emptyMessage = "Nothing to show yet.",
  className = "",
  label,
  id,
}: HighlightedPromptProps) {
  const content = useMemo(() => {
    return tokenizeTemplate(text).map((seg, i) => {
      if (seg.type === "text") return <Fragment key={i}>{highlightText(seg.value, style, String(i))}</Fragment>;
      const status = !seg.valid ? "invalid" : definedNames && !definedNames.has(seg.name) ? "undefined" : "ok";
      const cls =
        status === "invalid"
          ? "bg-rose-500/20 text-rose-300 ring-rose-400/40"
          : status === "undefined"
            ? "bg-amber-500/20 text-amber-200 ring-amber-400/40"
            : "bg-indigo-500/25 text-indigo-200 ring-indigo-400/40";
      const title =
        status === "invalid"
          ? "Invalid placeholder name"
          : status === "undefined"
            ? `{{${seg.name}}} has no variable definition`
            : `Variable: ${seg.name}`;
      return (
        <mark key={i} title={title} className={`rounded px-0.5 ring-1 ${cls}`}>
          {seg.value}
        </mark>
      );
    });
  }, [text, style, definedNames]);

  return (
    <div
      id={id}
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`prompt-scroll focus-ring overflow-auto rounded-xl bg-slate-950 text-slate-200 ${className}`}
    >
      {text ? (
        <pre className="min-w-0 p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap">{content}</pre>
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center p-6 text-center text-sm text-slate-400">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
