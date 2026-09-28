import type {
  PromptConfig,
  PromptOutput,
  PromptSectionKey,
  PromptValidationResult,
  ValidationIssue,
} from "@/types/prompt";
import { generatePrompt, getTemplateTexts } from "@/lib/prompt-generator";
import {
  findDuplicateVariableNames,
  findInvalidReferences,
  getVariableNameError,
  countVariableOccurrences,
  extractVariableNames,
} from "@/lib/variable-parser";
import { checkXmlWellFormed, findUnbalancedTags } from "@/lib/xml-utils";
import { detectSecrets } from "@/lib/secret-detector";

/** A section longer than this triggers a (non-blocking) warning. */
export const SECTION_LENGTH_WARNING = 4000;
/** A full prompt longer than this triggers an informational notice (~8k approx. tokens). */
export const PROMPT_LENGTH_NOTICE = 32000;

export const SECTION_LABELS: Record<PromptSectionKey, string> = {
  role: "Role & Identity",
  context: "Context & Background",
  task: "Primary Objective & Task",
  rules: "Rules, Boundaries & Constraints",
  examples: "Examples",
  outputFormat: "Output Format & Schema",
};

/** Validates a configuration (and its generated output) without ever throwing. */
export function validatePrompt(
  config: PromptConfig,
  output: PromptOutput = generatePrompt(config),
): PromptValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (issue: Omit<ValidationIssue, "id">, key: string) =>
    issues.push({ ...issue, id: `${issue.code}:${key}` });

  const { sections } = config;
  const allEmpty = Object.values(sections).every((s) => !s?.trim());

  if (allEmpty) {
    add(
      {
        severity: "warning",
        code: "empty-prompt",
        message: "All sections are empty. Pick a starter preset or fill in the Role and Task to begin.",
        field: "role",
      },
      "all",
    );
  } else {
    if (!sections.role.trim()) {
      add(
        {
          severity: "warning",
          code: "empty-role",
          message: "Role & Identity is empty. Models perform better with an explicit persona.",
          field: "role",
        },
        "role",
      );
    }
    if (!sections.task.trim()) {
      add(
        {
          severity: "warning",
          code: "empty-task",
          message: "Primary Objective & Task is empty. Describe what the assistant should do.",
          field: "task",
        },
        "task",
      );
    }
    if (!sections.outputFormat.trim()) {
      add(
        {
          severity: "warning",
          code: "missing-output-format",
          message: "No output format specified. Define the expected structure (e.g. JSON schema, Markdown).",
          field: "outputFormat",
        },
        "outputFormat",
      );
    }
  }

  // Variable definitions
  config.variables.forEach((v, index) => {
    const error = getVariableNameError(v.name);
    if (error) {
      add(
        {
          severity: "error",
          code: "invalid-variable-name",
          message: v.name.trim()
            ? `Variable "${v.name}" has an invalid name: ${error}`
            : `Variable #${index + 1} has no name.`,
          field: "variables",
        },
        v.id,
      );
    }
  });

  for (const name of findDuplicateVariableNames(config.variables)) {
    add(
      {
        severity: "error",
        code: "duplicate-variable",
        message: `Variable "${name}" is defined more than once. Variable names must be unique.`,
        field: "variables",
      },
      name,
    );
  }

  // Variable usage
  const texts = getTemplateTexts(config);
  const referenced = extractVariableNames(...texts);
  const occurrences = countVariableOccurrences(...texts);
  const definedNames = new Set(config.variables.map((v) => v.name.trim()));

  for (const name of referenced) {
    if (!definedNames.has(name)) {
      add(
        {
          severity: "warning",
          code: "undefined-variable",
          message: `{{${name}}} is used in the prompt but has no variable definition.`,
          field: "variables",
        },
        name,
      );
    }
  }

  for (const raw of findInvalidReferences(...texts)) {
    add(
      {
        severity: "warning",
        code: "invalid-variable-reference",
        message: `${raw} is not a valid variable placeholder. Use letters, digits and underscores, e.g. {{user_name}}.`,
        field: "variables",
      },
      raw,
    );
  }

  const seenUnused = new Set<string>();
  for (const v of config.variables) {
    const name = v.name.trim();
    if (!name || getVariableNameError(name) || seenUnused.has(name)) continue;
    if (!occurrences.has(name)) {
      seenUnused.add(name);
      add(
        {
          severity: "info",
          code: "unused-variable",
          message: `Variable "${name}" is defined but never used. Insert {{${name}}} into a section or remove it.`,
          field: "variables",
        },
        name,
      );
    }
  }

  // Section content
  (Object.keys(SECTION_LABELS) as PromptSectionKey[]).forEach((key) => {
    const value = sections[key] ?? "";
    if (value.length > SECTION_LENGTH_WARNING) {
      add(
        {
          severity: "warning",
          code: "section-too-long",
          message: `${SECTION_LABELS[key]} is very long (${value.length.toLocaleString("en-US")} characters). Consider tightening it or moving reference material into context.`,
          field: key,
        },
        key,
      );
    }
    const unbalanced = findUnbalancedTags(value);
    if (unbalanced.length > 0) {
      add(
        {
          severity: "warning",
          code: "unbalanced-tags",
          message: `${SECTION_LABELS[key]} contains unbalanced tags: ${unbalanced
            .map((t) => `<${t}>`)
            .join(", ")}. The XML output stays valid (content is wrapped in CDATA), but the model may misread the structure.`,
          field: key,
        },
        key,
      );
    }
  });

  if (config.safety.enabled) {
    const directive = config.safety.refusalDirective ?? "";
    if (!directive.trim()) {
      add(
        {
          severity: "info",
          code: "empty-guardrail-directive",
          message: "Safety guardrails are on but the refusal directive is empty. Built-in guardrails still apply.",
          field: "safety",
        },
        "directive",
      );
    }
    const unbalanced = findUnbalancedTags(directive);
    if (unbalanced.length > 0) {
      add(
        {
          severity: "warning",
          code: "unbalanced-tags",
          message: `The guardrail directive contains unbalanced tags: ${unbalanced.map((t) => `<${t}>`).join(", ")}.`,
          field: "safety",
        },
        "directive",
      );
    }
  }

  const secrets = detectSecrets(
    ...texts,
    config.safety.refusalDirective,
    ...config.variables.flatMap((v) => [v.sampleValue, v.description]),
  );
  if (secrets.length > 0) {
    add(
      {
        severity: "warning",
        code: "possible-secret",
        message: `Possible credential detected (${secrets.join(", ")}). Never embed real secrets in a system prompt; drafts containing them are not saved to this browser.`,
        field: "output",
      },
      "secrets",
    );
  }

  // Generated output
  if (output.xml) {
    const xmlCheck = checkXmlWellFormed(output.xml);
    if (!xmlCheck.valid) {
      add(
        {
          severity: "error",
          code: "malformed-xml",
          message: `Generated XML is not well-formed: ${xmlCheck.error ?? "unknown error"}`,
          field: "output",
        },
        "xml",
      );
    }
  }

  const longest = Math.max(output.plain.length, output.markdown.length, output.xml.length);
  if (longest > PROMPT_LENGTH_NOTICE) {
    add(
      {
        severity: "info",
        code: "prompt-too-long",
        message: `The generated prompt is long (~${Math.ceil(longest / 4).toLocaleString("en-US")} approx. tokens). Long system prompts increase cost and latency on every request.`,
        field: "output",
      },
      "length",
    );
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;
  return { issues, errorCount, warningCount, infoCount, isValid: errorCount === 0 };
}
