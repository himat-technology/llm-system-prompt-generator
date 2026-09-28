/**
 * Core domain types for the LLM System Prompt Generator.
 * These types are shared by the pure logic in `lib/` and the React UI in `components/`.
 */

/** Keys of the free-text sections a user can author in the Builder. */
export type PromptSectionKey =
  | "role"
  | "context"
  | "task"
  | "rules"
  | "examples"
  | "outputFormat";

export type PromptSections = Record<PromptSectionKey, string>;

/** Rendering style of the generated system prompt. */
export type OutputStyle = "markdown" | "xml" | "plain";

export type ReasoningDepth = "concise" | "standard" | "detailed";

export interface ReasoningConfig {
  enabled: boolean;
  depth: ReasoningDepth;
}

export interface SafetyConfig {
  enabled: boolean;
  /** Treat user content / documents / tool output as data, not instructions. */
  injectionResistance: boolean;
  /** System instructions override conflicting user instructions. */
  instructionHierarchy: boolean;
  /** Never reveal system prompt, credentials, or hidden configuration. */
  secretProtection: boolean;
  /** Refuse unsafe, illegal, or unauthorized actions. */
  unsafeActions: boolean;
  /** Redirect requests that fall outside the defined role. */
  scopeEnforcement: boolean;
  /** Refuse politely with a brief explanation and a safe alternative. */
  gracefulRefusal: boolean;
  /** Free-form, user-editable guardrail / refusal directive. */
  refusalDirective: string;
}

export interface FormattingConfig {
  /**
   * The primary output style. The "XML Tag Structure" toggle is `style === "xml"`.
   * All three styles are always generated; this selects the primary one used for
   * copy, the live preview and validation.
   */
  style: OutputStyle;
}

export interface PromptVariable {
  /** Stable client-side identity (used as React key). */
  id: string;
  name: string;
  description: string;
  sampleValue: string;
}

export interface PromptConfig {
  sections: PromptSections;
  formatting: FormattingConfig;
  reasoning: ReasoningConfig;
  safety: SafetyConfig;
  variables: PromptVariable[];
}

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  config: PromptConfig;
}

/** Derived information about a variable, combining definitions and template usage. */
export interface VariableMetadata {
  name: string;
  description: string;
  sampleValue: string;
  /** Has a definition in `PromptConfig.variables`. */
  defined: boolean;
  /** Number of `{{name}}` occurrences in the prompt template. */
  occurrences: number;
  /** Matches the allowed variable-name pattern. */
  validName: boolean;
}

export interface PromptOutput {
  plain: string;
  markdown: string;
  xml: string;
  variables: VariableMetadata[];
}

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCode =
  | "empty-role"
  | "empty-task"
  | "missing-output-format"
  | "empty-prompt"
  | "invalid-variable-name"
  | "invalid-variable-reference"
  | "duplicate-variable"
  | "undefined-variable"
  | "unused-variable"
  | "unbalanced-tags"
  | "malformed-xml"
  | "section-too-long"
  | "prompt-too-long"
  | "empty-guardrail-directive"
  | "possible-secret";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: ValidationCode;
  message: string;
  /** Builder field the issue relates to, when applicable. */
  field?: PromptSectionKey | "variables" | "safety" | "output";
}

export interface PromptValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** True when there are no `error`-severity issues. Warnings never block. */
  isValid: boolean;
}

export interface TokenEstimate {
  characters: number;
  words: number;
  lines: number;
  approxTokens: number;
}
