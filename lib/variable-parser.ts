import type { PromptVariable } from "@/types/prompt";

/** Allowed variable names: start with a letter or underscore, then letters, digits, underscores. */
export const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const MAX_VARIABLE_NAME_LENGTH = 64;

/**
 * Matches `{{ anything }}` that does not itself contain braces. The captured group is the
 * raw (untrimmed) name so that invalid references such as `{{user name}}` can be reported.
 */
const PLACEHOLDER_PATTERN = /\{\{([^{}]*)\}\}/g;

export interface VariableReference {
  /** Trimmed name as written between the braces. */
  name: string;
  /** Full placeholder text, e.g. `{{ user_name }}`. */
  raw: string;
  index: number;
  valid: boolean;
}

export type TemplateSegment =
  | { type: "text"; value: string }
  | { type: "variable"; value: string; name: string; valid: boolean };

export function isValidVariableName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MAX_VARIABLE_NAME_LENGTH &&
    VARIABLE_NAME_PATTERN.test(name)
  );
}

/** Returns a human-readable reason a variable name is invalid, or `null` when it is valid. */
export function getVariableNameError(name: string): string | null {
  if (name.trim().length === 0) return "Variable name is required.";
  if (name.length > MAX_VARIABLE_NAME_LENGTH)
    return `Variable name must be at most ${MAX_VARIABLE_NAME_LENGTH} characters.`;
  if (/\s/.test(name)) return "Variable name cannot contain spaces. Use underscores instead.";
  if (/^[0-9]/.test(name)) return "Variable name cannot start with a digit.";
  if (!VARIABLE_NAME_PATTERN.test(name))
    return "Use only letters, digits, and underscores (e.g. user_context).";
  return null;
}

/** Finds every `{{...}}` placeholder in a text, in order of appearance. */
export function findVariableReferences(text: string): VariableReference[] {
  const refs: VariableReference[] = [];
  if (!text) return refs;
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1].trim();
    refs.push({
      name,
      raw: match[0],
      index: match.index ?? 0,
      valid: isValidVariableName(name),
    });
  }
  return refs;
}

/** Unique, valid variable names referenced across the given texts, in first-seen order. */
export function extractVariableNames(...texts: string[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const text of texts) {
    for (const ref of findVariableReferences(text)) {
      if (ref.valid && !seen.has(ref.name)) {
        seen.add(ref.name);
        names.push(ref.name);
      }
    }
  }
  return names;
}

/** Counts occurrences of each valid variable name across the given texts. */
export function countVariableOccurrences(...texts: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const ref of findVariableReferences(text)) {
      if (ref.valid) counts.set(ref.name, (counts.get(ref.name) ?? 0) + 1);
    }
  }
  return counts;
}

/** Placeholders whose contents are not a valid variable name, e.g. `{{user name}}`. */
export function findInvalidReferences(...texts: string[]): string[] {
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const text of texts) {
    for (const ref of findVariableReferences(text)) {
      if (!ref.valid && !seen.has(ref.raw)) {
        seen.add(ref.raw);
        invalid.push(ref.raw);
      }
    }
  }
  return invalid;
}

/**
 * Replaces `{{name}}` placeholders with values. Placeholders without a (non-empty) value
 * are left untouched so unresolved variables remain visible.
 */
export function substituteVariables(
  text: string,
  values: Readonly<Record<string, string | undefined>>,
): string {
  if (!text) return text;
  return text.replace(PLACEHOLDER_PATTERN, (raw, inner: string) => {
    const name = inner.trim();
    if (!isValidVariableName(name)) return raw;
    const value = Object.prototype.hasOwnProperty.call(values, name) ? values[name] : undefined;
    return value !== undefined && value !== "" ? value : raw;
  });
}

/** Splits text into plain-text and placeholder segments (used for syntax highlighting). */
export function tokenizeTemplate(text: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  if (!text) return segments;
  let cursor = 0;
  for (const ref of findVariableReferences(text)) {
    if (ref.index > cursor) segments.push({ type: "text", value: text.slice(cursor, ref.index) });
    segments.push({ type: "variable", value: ref.raw, name: ref.name, valid: ref.valid });
    cursor = ref.index + ref.raw.length;
  }
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}

/** Names that are defined more than once (exact, case-sensitive match). */
export function findDuplicateVariableNames(variables: readonly PromptVariable[]): string[] {
  const counts = new Map<string, number>();
  for (const v of variables) {
    const name = v.name.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

/** Converts arbitrary text into a valid variable name suggestion, e.g. "User Name" -> "user_name". */
export function toVariableName(input: string): string {
  let name = input
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (/^[0-9]/.test(name)) name = `_${name}`;
  return name.slice(0, MAX_VARIABLE_NAME_LENGTH) || "variable";
}

/** Returns `base` or `base_2`, `base_3`, ... so it does not collide with existing names. */
export function uniqueVariableName(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const safeBase = isValidVariableName(base) ? base : toVariableName(base);
  if (!taken.has(safeBase)) return safeBase;
  let i = 2;
  while (taken.has(`${safeBase}_${i}`)) i += 1;
  return `${safeBase}_${i}`;
}

/** Converts `user_name` into a friendly label, e.g. "User Name". */
export function humanizeVariableName(name: string): string {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || name;
}
