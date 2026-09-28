import type { TokenEstimate } from "@/types/prompt";

/**
 * Average characters per token for English text with common BPE tokenizers. This is a heuristic:
 * real counts vary by model, language, and content (code and non-Latin scripts differ).
 */
export const CHARS_PER_TOKEN = 4;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.replace(/\n$/, "").split("\n").length;
}

/** Approximate token count using ~1 token per 4 characters. Returns 0 for empty text. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateText(text: string): TokenEstimate {
  const safe = text ?? "";
  return {
    characters: safe.length,
    words: countWords(safe),
    lines: countLines(safe),
    approxTokens: estimateTokens(safe),
  };
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
