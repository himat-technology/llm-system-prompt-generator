"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { InfoIcon } from "@/components/ui/icons";

interface InfoTipProps {
  label: string;
  children: ReactNode;
}

const TIP_WIDTH = 256;
const VIEWPORT_MARGIN = 12;

/**
 * Small help tooltip. Opens on hover, keyboard focus and tap; closes on Escape or blur.
 * The bubble is positioned when it opens so it always stays inside the viewport.
 */
export function InfoTip({ label, children }: InfoTipProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<CSSProperties | null>(null);

  const show = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    const width = Math.min(TIP_WIDTH, viewport - VIEWPORT_MARGIN * 2);
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(centered, VIEWPORT_MARGIN), viewport - VIEWPORT_MARGIN - width);
    setPlacement({ width, left: left - rect.left });
  };
  const hide = () => setPlacement(null);
  const open = placement !== null;

  return (
    <span ref={wrapperRef} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(e) => {
          if (e.key === "Escape") hide();
        }}
        className="focus-ring inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
      >
        <InfoIcon width={14} height={14} />
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          style={placement}
          className="absolute top-full z-30 mt-1.5 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed font-normal tracking-normal text-slate-100 normal-case shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
