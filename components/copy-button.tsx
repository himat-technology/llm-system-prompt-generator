"use client";

import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { AlertIcon, CheckIcon, CopyIcon } from "@/components/ui/icons";

type CopyState = "idle" | "copying" | "copied" | "error";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?: "primary" | "secondary" | "dark";
  className?: string;
}

/** Copies text to the clipboard with visible copying / copied / error states. */
export function CopyButton({ text, label = "Copy System Prompt", variant = "primary", className = "" }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    window.clearTimeout(timer.current);
    setState("copying");
    setError(null);
    try {
      await copyToClipboard(text);
      setState("copied");
      timer.current = window.setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Copy failed.");
      timer.current = window.setTimeout(() => setState("idle"), 5000);
    }
  };

  const variantClass =
    variant === "primary"
      ? state === "copied"
        ? "bg-emerald-600 text-white hover:bg-emerald-600"
        : "btn-primary"
      : variant === "dark"
        ? "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-offset-slate-900"
        : "btn-secondary";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onCopy}
        disabled={!text || state === "copying"}
        className={`btn ${variantClass} ${className}`}
      >
        {state === "copied" ? (
          <CheckIcon />
        ) : state === "error" ? (
          <AlertIcon />
        ) : (
          <CopyIcon />
        )}
        <span>
          {state === "copying" ? "Copying…" : state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : label}
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Copied to clipboard." : ""}
      </span>
      {state === "error" && error ? (
        <span role="alert" className="max-w-xs text-right text-xs text-rose-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
