"use client";

import { useEffect } from "react";
import { XIcon } from "@/components/ui/icons";

interface ToastProps {
  /** Changing the id restarts the auto-dismiss timer, even when the message text is unchanged. */
  id?: number;
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

/** Bottom-anchored status toast with an optional action (e.g. Undo). Announced politely. */
export function Toast({ id, message, actionLabel, onAction, onDismiss, durationMs = 8000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const handle = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(handle);
  }, [id, message, durationMs, onDismiss]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {message ? (
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">          <span>{message}</span>
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="cursor-pointer rounded-md px-2 py-1 font-semibold text-indigo-300 outline-none hover:bg-slate-800 hover:text-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="cursor-pointer rounded-md p-1 text-slate-400 outline-none hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <XIcon width={14} height={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
