import type {
  OutputStyle,
  PromptConfig,
  PromptSectionKey,
  PromptVariable,
  ReasoningDepth,
  SafetyConfig,
} from "@/types/prompt";
import { getDefaultConfig } from "@/lib/presets";
import { createId } from "@/lib/id";

/** Maximum length of any single free-text field, to keep the UI responsive. */
export const MAX_FIELD_LENGTH = 20000;
export const MAX_VARIABLES = 50;

export const SECTION_KEYS: readonly PromptSectionKey[] = ["role", "context", "task", "rules", "examples", "outputFormat"];
const STYLES: readonly OutputStyle[] = ["markdown", "xml", "plain"];
const DEPTHS: readonly ReasoningDepth[] = ["concise", "standard", "detailed"];
const SAFETY_FLAGS = [
  "enabled",
  "injectionResistance",
  "instructionHierarchy",
  "secretProtection",
  "unsafeActions",
  "scopeEnforcement",
  "gracefulRefusal",
] as const satisfies ReadonlyArray<keyof SafetyConfig>;

export function clampText(value: string): string {
  return value.length > MAX_FIELD_LENGTH ? value.slice(0, MAX_FIELD_LENGTH) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? clampText(value) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Converts untrusted data (e.g. a localStorage draft) into a valid `PromptConfig`, filling any
 * missing or malformed fields from the defaults. Never throws. Output has a canonical key order.
 */
export function sanitizeConfig(input: unknown, fallback: PromptConfig = getDefaultConfig()): PromptConfig {
  const src = isRecord(input) ? input : {};
  const sectionsSrc = isRecord(src.sections) ? src.sections : {};
  const formattingSrc = isRecord(src.formatting) ? src.formatting : {};
  const reasoningSrc = isRecord(src.reasoning) ? src.reasoning : {};
  const safetySrc = isRecord(src.safety) ? src.safety : {};

  const sections = {} as PromptConfig["sections"];
  for (const key of SECTION_KEYS) sections[key] = str(sectionsSrc[key], fallback.sections[key]);

  const style = STYLES.includes(formattingSrc.style as OutputStyle)
    ? (formattingSrc.style as OutputStyle)
    : fallback.formatting.style;
  const depth = DEPTHS.includes(reasoningSrc.depth as ReasoningDepth)
    ? (reasoningSrc.depth as ReasoningDepth)
    : fallback.reasoning.depth;

  const safety = {} as SafetyConfig;
  for (const flag of SAFETY_FLAGS) safety[flag] = bool(safetySrc[flag], fallback.safety[flag]);
  safety.refusalDirective = str(safetySrc.refusalDirective, fallback.safety.refusalDirective);

  // Ids are React keys and reducer targets, so they must be unique even in tampered drafts.
  const seenIds = new Set<string>();
  const variables: PromptVariable[] = Array.isArray(src.variables)
    ? src.variables
        .filter(isRecord)
        .slice(0, MAX_VARIABLES)
        .map((v) => {
          let id = typeof v.id === "string" && v.id ? v.id.slice(0, 100) : createId("var");
          while (seenIds.has(id)) id = createId("var");
          seenIds.add(id);
          return {
            id,
            name: str(v.name, "").slice(0, 200),
            description: str(v.description, ""),
            sampleValue: str(v.sampleValue, ""),
          };
        })
    : fallback.variables.map((v) => ({ ...v }));

  return {
    sections,
    formatting: { style },
    reasoning: { enabled: bool(reasoningSrc.enabled, fallback.reasoning.enabled), depth },
    safety,
    variables,
  };
}

/** Structural equality for configs (ignores variable ids and key order). */
export function configsEqual(a: PromptConfig, b: PromptConfig): boolean {
  const canonical = (c: PromptConfig) => {
    const s = sanitizeConfig(c, c);
    return JSON.stringify({
      ...s,
      variables: s.variables.map(({ name, description, sampleValue }) => ({ name, description, sampleValue })),
    });
  };
  return canonical(a) === canonical(b);
}
