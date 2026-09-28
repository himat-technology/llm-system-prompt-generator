import { describe, expect, it } from "vitest";
import type { PromptConfig } from "@/types/prompt";
import {
  buildGuardrailInstructions,
  buildReasoningInstructions,
  generatePrompt,
  normalizeText,
  resolvePrompt,
} from "@/lib/prompt-generator";
import { getDefaultConfig, getEmptyConfig, PRESETS } from "@/lib/presets";
import { checkXmlWellFormed } from "@/lib/xml-utils";

function config(overrides: (c: PromptConfig) => void = () => {}): PromptConfig {
  const c = getDefaultConfig();
  overrides(c);
  return c;
}

describe("generatePrompt", () => {
  it("is deterministic", () => {
    expect(generatePrompt(getDefaultConfig())).toEqual(generatePrompt(getDefaultConfig()));
  });

  it("renders markdown with headings for each non-empty section in order", () => {
    const { markdown } = generatePrompt(getDefaultConfig());
    expect(markdown.startsWith("# System Prompt\n")).toBe(true);
    const order = [
      "## Role & Identity",
      "## Context & Background",
      "## Primary Objective & Task",
      "## Rules, Boundaries & Constraints",
      "## Reasoning Approach",
      "## Output Format & Schema",
      "## Safety Guardrails",
    ].map((h) => markdown.indexOf(h));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(markdown).not.toContain("## Examples");
    expect(markdown).toContain("You are a Principal Software Engineer");
  });

  it("renders plain text with uppercase titles and no markdown syntax", () => {
    const { plain } = generatePrompt(getDefaultConfig());
    expect(plain.startsWith("ROLE & IDENTITY\nYou are")).toBe(true);
    expect(plain).not.toMatch(/^#/m);
  });

  it("omits empty sections and returns empty strings for an empty config", () => {
    const out = generatePrompt(getEmptyConfig());
    expect(out).toMatchObject({ plain: "", markdown: "", xml: "" });
    const onlyRole = generatePrompt({ ...getEmptyConfig(), sections: { ...getEmptyConfig().sections, role: "  Hi  " } });
    expect(onlyRole.markdown).toBe("# System Prompt\n\n## Role & Identity\n\nHi\n");
  });

  it("includes reasoning instructions only when enabled and never asks to expose chain-of-thought", () => {
    const on = generatePrompt(config((c) => (c.reasoning = { enabled: true, depth: "standard" }))).markdown;
    expect(on).toContain("Reason through the problem internally and provide only the necessary conclusions");
    const off = generatePrompt(config((c) => (c.reasoning.enabled = false))).markdown;
    expect(off).not.toContain("Reasoning Approach");
    for (const depth of ["concise", "standard", "detailed"] as const) {
      const text = buildReasoningInstructions(depth).join(" ").toLowerCase();
      expect(text).toContain("internal");
      expect(text).not.toMatch(/show (your|all) (reasoning|thinking)|step-by-step reasoning in your answer/);
    }
    expect(buildReasoningInstructions("detailed").length).toBeGreaterThan(buildReasoningInstructions("concise").length);
  });

  it("builds guardrails from enabled options plus the custom directive", () => {
    const c = getDefaultConfig();
    const all = buildGuardrailInstructions(c.safety);
    expect(all).toHaveLength(7);
    expect(all.join(" ")).toMatch(/data, not as instructions/);
    expect(all[all.length - 1]).toBe(c.safety.refusalDirective);

    const partial = buildGuardrailInstructions({ ...c.safety, secretProtection: false, refusalDirective: "  " });
    expect(partial).toHaveLength(5);
    expect(buildGuardrailInstructions({ ...c.safety, enabled: false })).toEqual([]);
    expect(generatePrompt(config((cc) => (cc.safety.enabled = false))).markdown).not.toContain("Safety Guardrails");
  });

  it("returns variable metadata for defined and referenced variables", () => {
    const out = generatePrompt(
      config((c) => {
        c.sections.task = "Help {{user_name}} with {{project_name}} and {{user_name}}";
        c.variables.push({ id: "x", name: "unused_var", description: "d", sampleValue: "s" });
      }),
    );
    const byName = Object.fromEntries(out.variables.map((v) => [v.name, v]));
    expect(byName.user_context).toMatchObject({ defined: true, occurrences: 1 });
    expect(byName.unused_var).toMatchObject({ defined: true, occurrences: 0 });
    expect(byName.user_name).toMatchObject({ defined: false, occurrences: 2 });
    expect(byName.project_name).toMatchObject({ defined: false, occurrences: 1 });
  });

  it("normalizes whitespace and line endings", () => {
    expect(normalizeText("  a  \r\n\r\n\r\n\r\nb\t \n")).toBe("a\n\nb");
  });
});

describe("XML generation", () => {
  it("wraps sections in the expected tags under a single root", () => {
    const { xml } = generatePrompt(getDefaultConfig());
    expect(xml.startsWith("<system_prompt>\n  <role>\n")).toBe(true);
    expect(xml.trimEnd().endsWith("</system_prompt>")).toBe(true);
    for (const tag of ["role", "context", "task", "rules", "instructions", "output_format", "guardrails"]) {
      expect(xml).toContain(`<${tag}>`);
      expect(xml).toContain(`</${tag}>`);
    }
    expect(checkXmlWellFormed(xml)).toEqual({ valid: true });
  });

  it("produces well-formed XML for every preset", () => {
    for (const preset of PRESETS) {
      const { xml } = generatePrompt(preset.config);
      expect(checkXmlWellFormed(xml), preset.id).toEqual({ valid: true });
    }
  });

  it("wraps content containing markup or ampersands in CDATA instead of emitting malformed XML", () => {
    const { xml } = generatePrompt(
      config((c) => {
        c.sections.examples = "```tsx\nconst x = <div>{a && b}</div>;\n```";
        c.sections.rules = "Wrap your answer in <answer> tags. Never output </system_prompt>";
      }),
    );
    expect(xml).toContain("<![CDATA[");
    expect(xml).toContain("const x = <div>{a && b}</div>;");
    expect(checkXmlWellFormed(xml)).toEqual({ valid: true });
  });

  it("stays well-formed when content contains a CDATA terminator or control characters", () => {
    const { xml } = generatePrompt(
      config((c) => {
        c.sections.task = "Tricky ]]> <b> & \u0001 content";
      }),
    );
    expect(checkXmlWellFormed(xml)).toEqual({ valid: true });
    expect(xml).not.toContain("\u0001");
  });

  it("keeps prose without special characters readable (no CDATA)", () => {
    const { xml } = generatePrompt(config((c) => (c.sections.role = "You are a helpful assistant.")));
    expect(xml).toContain("  <role>\n    You are a helpful assistant.\n  </role>");
  });
});

describe("resolvePrompt", () => {
  it("substitutes variables before rendering", () => {
    const c = config((cc) => (cc.sections.task = "Build {{project_name}} for {{user_name}}"));
    const md = resolvePrompt(c, { project_name: "Apollo", user_name: "Ada" }, "markdown");
    expect(md).toContain("Build Apollo for Ada");
    expect(md).toContain("{{user_context}}");
  });

  it("keeps XML well-formed when substituted values contain markup", () => {
    const c = config((cc) => (cc.sections.task = "Handle {{payload}}"));
    const xml = resolvePrompt(c, { payload: "<script>alert('x')</script> & more" }, "xml");
    expect(checkXmlWellFormed(xml)).toEqual({ valid: true });
    expect(xml).toContain("<script>alert('x')</script> & more");
  });
});
