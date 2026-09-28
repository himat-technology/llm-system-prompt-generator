import type { OutputStyle, PromptOutput } from "@/types/prompt";

export type ExportFormat = "md" | "xml" | "txt";

export interface ExportFile {
  filename: string;
  mimeType: string;
  content: string;
}

export const EXPORT_FORMATS: ReadonlyArray<{
  format: ExportFormat;
  label: string;
  style: OutputStyle;
  mimeType: string;
  description: string;
}> = [
  { format: "md", label: ".md", style: "markdown", mimeType: "text/markdown;charset=utf-8", description: "Markdown with headings" },
  { format: "xml", label: ".xml", style: "xml", mimeType: "application/xml;charset=utf-8", description: "Well-formed XML document" },
  { format: "txt", label: ".txt", style: "plain", mimeType: "text/plain;charset=utf-8", description: "Plain text" },
];

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function buildExportFilename(format: ExportFormat, date: Date = new Date(), baseName = "system-prompt"): string {
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}`;
  const safeBase = baseName.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "system-prompt";
  return `${safeBase}-${stamp}.${format}`;
}

/**
 * Builds the file for a given export format from the generated output. Each format uses the
 * matching rendering (Markdown, XML document, plain text) rather than renaming one output.
 */
export function buildExportFile(output: PromptOutput, format: ExportFormat, date: Date = new Date()): ExportFile {
  const def = EXPORT_FORMATS.find((f) => f.format === format);
  if (!def) throw new Error(`Unsupported export format: ${String(format)}`);
  let content = output[def.style];
  if (format === "xml" && content) content = `${XML_DECLARATION}\n${content}`;
  return { filename: buildExportFilename(format, date), mimeType: def.mimeType, content };
}

export class ExportUnavailableError extends Error {}

/** Triggers a browser download of the given file using a Blob object URL. */
export function downloadFile(file: ExportFile): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new ExportUnavailableError("Downloads are only available in the browser.");
  }
  if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new ExportUnavailableError("This browser does not support file downloads.");
  }
  const blob = new Blob([file.content], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    // Revoke after the click has been processed so the download can start.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
