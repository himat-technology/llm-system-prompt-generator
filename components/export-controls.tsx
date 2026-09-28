"use client";

import { useEffect, useRef, useState } from "react";
import type { PromptOutput } from "@/types/prompt";
import { buildExportFile, downloadFile, EXPORT_FORMATS, type ExportFormat } from "@/lib/export-utils";
import { CheckIcon, DownloadIcon } from "@/components/ui/icons";

interface ExportControlsProps {
  output: PromptOutput;
}

/** Download buttons for .md / .xml / .txt, each generated from its matching rendering. */
export function ExportControls({ output }: ExportControlsProps) {
  const [lastExported, setLastExported] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const empty = !output.markdown;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onExport = (format: ExportFormat) => {
    window.clearTimeout(timer.current);
    setError(null);
    try {
      downloadFile(buildExportFile(output, format));
      setLastExported(format);
      timer.current = window.setTimeout(() => setLastExported(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export generated prompt">
        <span className="mr-1 text-xs font-medium tracking-wide text-slate-500 uppercase">Export</span>
        {EXPORT_FORMATS.map((f) => (
          <button
            key={f.format}
            type="button"
            className="btn btn-secondary px-2.5 py-1.5 text-xs"
            onClick={() => onExport(f.format)}
            disabled={empty}
            title={`Download as ${f.label} (${f.description})`}
            aria-label={`Download prompt as ${f.label} file`}
          >
            {lastExported === f.format ? <CheckIcon width={14} height={14} /> : <DownloadIcon width={14} height={14} />}
            {lastExported === f.format ? "Saved" : f.label}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
