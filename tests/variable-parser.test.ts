import { describe, expect, it } from "vitest";
import {
  extractVariableNames,
  findDuplicateVariableNames,
  findInvalidReferences,
  getVariableNameError,
  humanizeVariableName,
  isValidVariableName,
  substituteVariables,
  tokenizeTemplate,
  toVariableName,
  uniqueVariableName,
} from "@/lib/variable-parser";

describe("variable name validation", () => {
  it("accepts letters, digits and underscores not starting with a digit", () => {
    for (const name of ["user_name", "_private", "Task2", "a"]) expect(isValidVariableName(name)).toBe(true);
  });

  it("rejects empty, spaced, hyphenated, digit-first and overly long names", () => {
    for (const name of ["", "user name", "user-name", "2fast", "a".repeat(65), "{{x}}"]) {
      expect(isValidVariableName(name)).toBe(false);
    }
  });

  it("returns specific error messages", () => {
    expect(getVariableNameError("")).toMatch(/required/);
    expect(getVariableNameError("user name")).toMatch(/spaces/);
    expect(getVariableNameError("1abc")).toMatch(/digit/);
    expect(getVariableNameError("a-b")).toMatch(/letters, digits/);
    expect(getVariableNameError("ok_name")).toBeNull();
  });
});

describe("variable extraction", () => {
  it("extracts unique names in first-seen order across texts", () => {
    const names = extractVariableNames(
      "Hello {{user_name}}, welcome to {{project_name}}.",
      "Your task: {{task}}. Again: {{user_name}}",
    );
    expect(names).toEqual(["user_name", "project_name", "task"]);
  });

  it("trims whitespace inside braces", () => {
    expect(extractVariableNames("Hi {{ user_name }}")).toEqual(["user_name"]);
  });

  it("ignores invalid placeholders but reports them separately", () => {
    const text = "Bad {{user name}} and {{}} and good {{ok}}";
    expect(extractVariableNames(text)).toEqual(["ok"]);
    expect(findInvalidReferences(text)).toEqual(["{{user name}}", "{{}}"]);
  });

  it("handles empty input and text without placeholders", () => {
    expect(extractVariableNames("")).toEqual([]);
    expect(extractVariableNames("no vars { here }")).toEqual([]);
  });
});

describe("variable substitution", () => {
  it("replaces every occurrence of each variable", () => {
    const out = substituteVariables("{{a}} + {{ a }} = {{b}}", { a: "1", b: "2" });
    expect(out).toBe("1 + 1 = 2");
  });

  it("leaves unresolved and empty-valued placeholders intact", () => {
    expect(substituteVariables("{{a}} {{b}}", { a: "", c: "x" })).toBe("{{a}} {{b}}");
  });

  it("does not touch invalid placeholders", () => {
    expect(substituteVariables("{{user name}}", { "user name": "x" })).toBe("{{user name}}");
  });

  it("inserts values literally (no regex replacement patterns)", () => {
    expect(substituteVariables("{{v}}", { v: "$& $1 $$" })).toBe("$& $1 $$");
  });

  it("does not resolve inherited object properties", () => {
    expect(substituteVariables("{{constructor}}", {})).toBe("{{constructor}}");
  });
});

describe("duplicate detection & naming helpers", () => {
  it("finds duplicate variable names", () => {
    const dupes = findDuplicateVariableNames([
      { id: "1", name: "a", description: "", sampleValue: "" },
      { id: "2", name: "b", description: "", sampleValue: "" },
      { id: "3", name: " a ", description: "", sampleValue: "" },
      { id: "4", name: "", description: "", sampleValue: "" },
      { id: "5", name: "", description: "", sampleValue: "" },
    ]);
    expect(dupes).toEqual(["a"]);
  });

  it("generates unique, valid names", () => {
    expect(uniqueVariableName("variable", [])).toBe("variable");
    expect(uniqueVariableName("variable", ["variable", "variable_2"])).toBe("variable_3");
    expect(uniqueVariableName("User Name", [])).toBe("user_name");
  });

  it("converts arbitrary text to variable names and back to labels", () => {
    expect(toVariableName("  Project Name! ")).toBe("project_name");
    expect(toVariableName("123 go")).toBe("_123_go");
    expect(toVariableName("!!!")).toBe("variable");
    expect(humanizeVariableName("project_name")).toBe("Project Name");
  });

  it("tokenizes templates into text and variable segments", () => {
    expect(tokenizeTemplate("Hi {{name}}!")).toEqual([
      { type: "text", value: "Hi " },
      { type: "variable", value: "{{name}}", name: "name", valid: true },
      { type: "text", value: "!" },
    ]);
  });
});
