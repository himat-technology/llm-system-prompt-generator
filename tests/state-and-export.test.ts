import { describe, expect, it } from "vitest";
import { initWorkspaceState, promptReducer, workspaceReducer } from "@/lib/prompt-reducer";
import { configsEqual, MAX_FIELD_LENGTH, sanitizeConfig } from "@/lib/config-utils";
import { DEFAULT_REFUSAL_DIRECTIVE, getDefaultConfig, getPresetById, PRESETS } from "@/lib/presets";
import { buildExportFile, buildExportFilename, XML_DECLARATION } from "@/lib/export-utils";
import { generatePrompt } from "@/lib/prompt-generator";
import { checkXmlWellFormed } from "@/lib/xml-utils";
import { detectSecrets } from "@/lib/secret-detector";

describe("default configuration & reset", () => {
  it("default config contains the documented example content", () => {
    const c = getDefaultConfig();
    expect(c.sections.role).toBe(
      "You are a Principal Software Engineer specializing in modern full-stack web applications, TypeScript, Next.js, and clean code principles.",
    );
    expect(c.sections.task).toMatch(/^Review the provided code or requirements/);
    expect(c.sections.rules).toMatch(/Never hardcode credentials or secrets\.$/);
    expect(c.sections.outputFormat).toMatch(/^Markdown with TypeScript code blocks/);
    expect(c.safety.refusalDirective).toBe(DEFAULT_REFUSAL_DIRECTIVE);
    expect(c.variables).toEqual([
      expect.objectContaining({ name: "user_context", description: "Context about the current user" }),
    ]);
  });

  it("returns a fresh copy each time so mutations never leak into defaults", () => {
    const a = getDefaultConfig();
    a.sections.role = "mutated";
    a.variables[0].name = "mutated";
    expect(getDefaultConfig().sections.role).not.toBe("mutated");
    expect(getDefaultConfig().variables[0].name).toBe("user_context");
  });

  it("reset restores the default after arbitrary edits", () => {
    let state = getDefaultConfig();
    state = promptReducer(state, { type: "setSection", key: "role", value: "Pirate" });
    state = promptReducer(state, { type: "setStyle", style: "xml" });
    state = promptReducer(state, { type: "setSafety", patch: { enabled: false } });
    state = promptReducer(state, { type: "addVariable" });
    expect(configsEqual(state, getDefaultConfig())).toBe(false);
    state = promptReducer(state, { type: "reset" });
    expect(configsEqual(state, getDefaultConfig())).toBe(true);
  });

  it("loading a preset replaces every field and stays editable", () => {
    const preset = getPresetById("support-bot");
    expect(preset).toBeDefined();
    let state = promptReducer(getDefaultConfig(), { type: "load", config: preset!.config });
    expect(configsEqual(state, preset!.config)).toBe(true);
    state = promptReducer(state, { type: "setSection", key: "task", value: "Edited" });
    expect(state.sections.task).toBe("Edited");
    expect(preset!.config.sections.task).not.toBe("Edited");
  });

  it("ships the four required presets with complete content", () => {
    expect(PRESETS.map((p) => p.name)).toEqual([
      "AI Coding & Refactoring Assistant",
      "Structured Data Extraction Agent",
      "Customer Support & Triage Bot",
      "Technical Documentation Specialist",
    ]);
    for (const p of PRESETS) {
      expect(p.description.length).toBeGreaterThan(20);
      for (const key of ["role", "task", "rules", "outputFormat"] as const) {
        expect(p.config.sections[key].trim().length, `${p.id}.${key}`).toBeGreaterThan(20);
      }
    }
  });
});

describe("workspaceReducer", () => {
  it("tracks the selected preset alongside the config", () => {
    let ws = initWorkspaceState();
    expect(ws.presetId).toBe("coding-assistant");
    const preset = PRESETS[1];
    ws = workspaceReducer(ws, { type: "loadPreset", presetId: preset.id, config: preset.config });
    expect(ws.presetId).toBe(preset.id);
    ws = workspaceReducer(ws, { type: "setSection", key: "role", value: "x" });
    expect(ws.presetId).toBe(preset.id);
    ws = workspaceReducer(ws, { type: "restore", config: getDefaultConfig() });
    expect(ws.presetId).toBeNull();
    ws = workspaceReducer(ws, { type: "reset" });
    expect(ws).toEqual(expect.objectContaining({ presetId: "coding-assistant" }));
    expect(configsEqual(ws.config, getDefaultConfig())).toBe(true);
  });
});

describe("variable actions", () => {
  it("adds variables with unique names and prevents duplicates when defining detected ones", () => {
    let state = getDefaultConfig();
    state = promptReducer(state, { type: "addVariable" });
    state = promptReducer(state, { type: "addVariable" });
    expect(state.variables.map((v) => v.name)).toEqual(["user_context", "variable", "variable_2"]);
    state = promptReducer(state, { type: "addVariables", names: ["user_context", "project", "project"] });
    expect(state.variables.map((v) => v.name)).toEqual(["user_context", "variable", "variable_2", "project"]);
  });

  it("updates and removes variables by id", () => {
    let state = getDefaultConfig();
    const id = state.variables[0].id;
    state = promptReducer(state, { type: "updateVariable", id, patch: { sampleValue: "Ada" } });
    expect(state.variables[0].sampleValue).toBe("Ada");
    state = promptReducer(state, { type: "removeVariable", id });
    expect(state.variables).toEqual([]);
  });

  it("clamps oversized input", () => {
    const state = promptReducer(getDefaultConfig(), { type: "setSection", key: "rules", value: "x".repeat(MAX_FIELD_LENGTH + 500) });
    expect(state.sections.rules.length).toBe(MAX_FIELD_LENGTH);
  });
});

describe("sanitizeConfig", () => {
  it("recovers a valid config from malformed data", () => {
    const c = sanitizeConfig({ sections: { role: 42, task: "Do it" }, formatting: { style: "yaml" }, variables: [null, { name: "x" }] });
    expect(c.sections.task).toBe("Do it");
    expect(c.sections.role).toBe(getDefaultConfig().sections.role);
    expect(c.formatting.style).toBe("markdown");
    expect(c.variables).toHaveLength(1);
    expect(c.variables[0]).toMatchObject({ name: "x", description: "", sampleValue: "" });
    expect(() => sanitizeConfig("garbage")).not.toThrow();
    expect(() => sanitizeConfig(null)).not.toThrow();
  });

  it("gives duplicate variable ids fresh unique ids", () => {
    const c = sanitizeConfig({
      variables: [
        { id: "same", name: "a" },
        { id: "same", name: "b" },
        { id: "same", name: "c" },
      ],
    });
    expect(c.variables.map((v) => v.name)).toEqual(["a", "b", "c"]);
    expect(c.variables[0].id).toBe("same");
    expect(new Set(c.variables.map((v) => v.id)).size).toBe(3);
  });
});

describe("export", () => {
  const output = generatePrompt(getDefaultConfig());
  const date = new Date(2026, 8, 28, 15, 7);

  it("builds timestamped filenames", () => {
    expect(buildExportFilename("md", date)).toBe("system-prompt-20260928-1507.md");
  });

  it("exports each format from its matching rendering", () => {
    const md = buildExportFile(output, "md", date);
    const xml = buildExportFile(output, "xml", date);
    const txt = buildExportFile(output, "txt", date);

    expect(md.content).toBe(output.markdown);
    expect(md.mimeType).toMatch(/^text\/markdown/);
    expect(txt.content).toBe(output.plain);
    expect(txt.mimeType).toMatch(/^text\/plain/);
    expect(xml.content).toBe(`${XML_DECLARATION}\n${output.xml}`);
    expect(xml.mimeType).toMatch(/^application\/xml/);
    expect(checkXmlWellFormed(xml.content)).toEqual({ valid: true });
    expect(new Set([md.content, xml.content, txt.content]).size).toBe(3);
  });
});

describe("secret detection", () => {
  it("detects common credential formats and ignores normal prose", () => {
    expect(detectSecrets("AKIAABCDEFGHIJKLMNOP")).toEqual(["AWS access key"]);
    expect(detectSecrets("-----BEGIN RSA PRIVATE KEY-----")).toEqual(["private key"]);
    expect(detectSecrets("Never hardcode credentials or secrets.")).toEqual([]);
  });
});
