import { describe, expect, it } from "vitest";
import type { PromptConfig, ValidationCode } from "@/types/prompt";
import { validatePrompt, SECTION_LENGTH_WARNING } from "@/lib/prompt-validator";
import { getDefaultConfig, getEmptyConfig, PRESETS } from "@/lib/presets";

function codes(config: PromptConfig): ValidationCode[] {
  return validatePrompt(config).issues.map((i) => i.code);
}

function withDefault(mutate: (c: PromptConfig) => void): PromptConfig {
  const c = getDefaultConfig();
  mutate(c);
  return c;
}

describe("validatePrompt", () => {
  it("reports no issues for the default configuration and presets", () => {
    expect(validatePrompt(getDefaultConfig()).issues).toEqual([]);
    for (const preset of PRESETS) expect(validatePrompt(preset.config).issues, preset.id).toEqual([]);
  });

  it("warns about empty role, task and output format without blocking", () => {
    const result = validatePrompt(
      withDefault((c) => {
        c.sections.role = "";
        c.sections.task = "   ";
        c.sections.outputFormat = "";
      }),
    );
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["empty-role", "empty-task", "missing-output-format"]),
    );
    expect(result.isValid).toBe(true);
    expect(result.warningCount).toBeGreaterThanOrEqual(3);
  });

  it("reports a single empty-prompt warning when everything is empty", () => {
    expect(codes(getEmptyConfig())).toEqual(["empty-prompt"]);
  });

  it("detects variables referenced but not defined", () => {
    const result = validatePrompt(withDefault((c) => (c.sections.task = "Work on {{project_name}}.")));
    const issue = result.issues.find((i) => i.code === "undefined-variable");
    expect(issue?.message).toBe("{{project_name}} is used in the prompt but has no variable definition.");
  });

  it("detects variables referenced in the guardrail directive only when guardrails are enabled", () => {
    const on = withDefault((c) => (c.safety.refusalDirective = "Escalate to {{support_email}}."));
    expect(codes(on)).toContain("undefined-variable");
    const off = withDefault((c) => {
      c.safety.refusalDirective = "Escalate to {{support_email}}.";
      c.safety.enabled = false;
    });
    expect(codes(off)).not.toContain("undefined-variable");
  });

  it("detects defined variables that are never used", () => {
    const result = validatePrompt(withDefault((c) => (c.sections.context = "")));
    const issue = result.issues.find((i) => i.code === "unused-variable");
    expect(issue?.severity).toBe("info");
    expect(issue?.message).toContain("user_context");
  });

  it("detects duplicate variables as errors", () => {
    const result = validatePrompt(
      withDefault((c) => c.variables.push({ id: "dup", name: "user_context", description: "", sampleValue: "" })),
    );
    expect(result.issues.filter((i) => i.code === "duplicate-variable")).toHaveLength(1);
    expect(result.isValid).toBe(false);
  });

  it("detects invalid variable names and invalid placeholders", () => {
    const result = validatePrompt(
      withDefault((c) => {
        c.variables.push({ id: "bad", name: "user name", description: "", sampleValue: "" });
        c.variables.push({ id: "blank", name: "", description: "", sampleValue: "" });
        c.sections.task = "Hello {{user name}}";
      }),
    );
    expect(result.issues.filter((i) => i.code === "invalid-variable-name")).toHaveLength(2);
    expect(result.issues.map((i) => i.code)).toContain("invalid-variable-reference");
  });

  it("warns about unbalanced tags in section content but not balanced ones or code", () => {
    expect(codes(withDefault((c) => (c.sections.outputFormat = "Wrap the answer in <answer>")))).toContain(
      "unbalanced-tags",
    );
    expect(codes(withDefault((c) => (c.sections.outputFormat = "Use <answer>...</answer> and <br/>")))).not.toContain(
      "unbalanced-tags",
    );
    expect(codes(withDefault((c) => (c.sections.examples = "```\n<div>\n```")))).not.toContain("unbalanced-tags");
  });

  it("warns about extremely long sections", () => {
    const result = validatePrompt(withDefault((c) => (c.sections.rules = "x".repeat(SECTION_LENGTH_WARNING + 1))));
    expect(result.issues.find((i) => i.code === "section-too-long")?.field).toBe("rules");
  });

  it("warns when the prompt appears to contain a credential", () => {
    expect(codes(withDefault((c) => (c.sections.context = "key: sk-abcdefghijklmnopqrstuvwxyz123456")))).toContain(
      "possible-secret",
    );
  });

  it("checks the refusal directive for credentials even while guardrails are off", () => {
    const config = withDefault((c) => {
      c.safety.enabled = false;
      c.safety.refusalDirective = "token ghp_abcdefghijklmnopqrstuvwxyz0123456789";
    });
    expect(codes(config)).toContain("possible-secret");
  });

  it("does not treat generic types as unbalanced tags", () => {
    expect(codes(withDefault((c) => (c.sections.outputFormat = "Return a Promise<Result<User>> object")))).not.toContain(
      "unbalanced-tags",
    );
  });

  it("never throws on malformed content", () => {
    const nasty = "<<<>>> {{ {{}} }} ]]> &&& \u0000 <![CDATA[ <!-- ";
    expect(() =>
      validatePrompt(
        withDefault((c) => {
          for (const key of Object.keys(c.sections) as Array<keyof typeof c.sections>) c.sections[key] = nasty;
          c.safety.refusalDirective = nasty;
        }),
      ),
    ).not.toThrow();
  });
});
