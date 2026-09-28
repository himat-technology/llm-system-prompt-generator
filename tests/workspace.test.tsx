// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptWorkspace } from "@/components/prompt-workspace";

function preview() {
  return screen.getByRole("region", { name: /live preview/i });
}

describe("PromptWorkspace (integration)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the default prompt and updates live when the role changes", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    expect(preview().textContent).toContain("You are a Principal Software Engineer");

    const role = screen.getByLabelText("Role & Identity");
    await user.clear(role);
    await user.type(role, "You are a pirate");
    expect(preview().textContent).toContain("You are a pirate");
    expect(preview().textContent).not.toContain("Principal Software Engineer");
  });

  it("toggles XML structure", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    await user.click(screen.getByRole("switch", { name: /xml tag structure/i }));
    expect(preview().textContent).toContain("<system_prompt>");
    expect(preview().textContent).toContain("<role>");
    await user.click(screen.getByRole("switch", { name: /xml tag structure/i }));
    expect(preview().textContent).toContain("# System Prompt");
  });

  it("loads a preset and supports undo", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    const preset = screen.getByRole("button", { name: /Customer Support & Triage Bot/i });
    expect(preset.getAttribute("aria-pressed")).toBe("false");
    await user.click(preset);
    expect(preset.getAttribute("aria-pressed")).toBe("true");
    expect(preview().textContent).toContain("{{company_name}}");
    expect((screen.getByLabelText("Role & Identity") as HTMLTextAreaElement).value).toMatch(/customer support specialist/);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(preview().textContent).toContain("Principal Software Engineer");
  });

  it("withdraws the undo offer once the user edits after loading a preset", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    await user.click(screen.getByRole("button", { name: /Customer Support & Triage Bot/i }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Role & Identity"), { target: { value: "My important edit" } });
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    expect((screen.getByLabelText("Role & Identity") as HTMLTextAreaElement).value).toBe("My important edit");
  });

  it("inserts a variable at the end of a field the user has not focused", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    const task = screen.getByLabelText("Primary Objective & Task") as HTMLTextAreaElement;
    const before = task.value;
    await user.selectOptions(screen.getByLabelText("Insert variable into Primary Objective & Task"), "user_context");
    expect(task.value).toBe(`${before} {{user_context}}`);
  });

  it("inserts a variable at the caret once the user has placed one", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    const role = screen.getByLabelText("Role & Identity") as HTMLTextAreaElement;
    fireEvent.change(role, { target: { value: "Hello world" } });
    role.focus();
    role.setSelectionRange(5, 5);
    fireEvent.select(role);
    await user.selectOptions(screen.getByLabelText("Insert variable into Role & Identity"), "user_context");
    expect(role.value).toBe("Hello{{user_context}} world");
  });

  it("toggles a switch when its label text is clicked", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    const toggle = screen.getByRole("switch", { name: /structured reasoning/i });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByText("Structured reasoning instructions"));
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("copies the prompt to the clipboard and shows a success state", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<PromptWorkspace />);

    await user.click(screen.getByRole("button", { name: /copy system prompt/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("# System Prompt");
    expect(await screen.findByRole("button", { name: /copied!/i })).toBeTruthy();
  });

  it("shows an error state when the clipboard is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
    render(<PromptWorkspace />);

    await user.click(screen.getByRole("button", { name: /copy system prompt/i }));
    expect(await screen.findByRole("button", { name: /copy failed/i })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/copy it manually/i);
  });

  it("exports files with the generated content via a Blob download", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return "blob:mock";
    });
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    const clicks: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });

    render(<PromptWorkspace />);
    await user.click(screen.getByRole("tab", { name: /prompt output/i }));
    await user.click(screen.getByRole("button", { name: /download prompt as \.xml file/i }));
    await user.click(screen.getByRole("button", { name: /download prompt as \.md file/i }));

    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(clicks[0]).toMatch(/^system-prompt-\d{8}-\d{4}\.xml$/);
    expect(clicks[1]).toMatch(/\.md$/);
    const xmlText = await blobs[0].text();
    expect(xmlText.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<system_prompt>')).toBe(true);
    expect(await blobs[1].text()).toMatch(/^# System Prompt/);
  });

  it("simulates variable substitution", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    // user-event treats "{" as a key descriptor, so set the placeholder text directly.
    fireEvent.change(screen.getByLabelText("Primary Objective & Task"), {
      target: { value: "Review code. Project: {{project_name}}." },
    });
    await user.click(screen.getByRole("tab", { name: /variable simulator/i }));

    const input = screen.getByLabelText("Project Name");
    await user.type(input, "Apollo");
    const resolved = screen.getByRole("region", { name: "Resolved prompt" });
    const original = screen.getByRole("region", { name: "Original template" });
    expect(resolved.textContent).toContain("Project: Apollo.");
    expect(original.textContent).toContain("{{project_name}}");
    // Sample value fallback for the defined variable
    expect(resolved.textContent).toContain("Software developer working on a SaaS application");
    expect(screen.getByText(/All variables resolved/i)).toBeTruthy();
  });

  it("adds, validates and deletes variables", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    await user.click(screen.getByRole("button", { name: /add variable/i }));
    const nameInputs = screen.getAllByLabelText("Variable name") as HTMLInputElement[];
    expect(nameInputs.map((i) => i.value)).toEqual(["user_context", "variable"]);

    fireEvent.change(nameInputs[1], { target: { value: "user_context" } });
    expect(screen.getAllByText(/Duplicate name/i).length).toBeGreaterThan(0);

    fireEvent.change(nameInputs[1], { target: { value: "bad name" } });
    await user.click(screen.getByRole("button", { name: "Use bad_name" }));
    expect((screen.getAllByLabelText("Variable name")[1] as HTMLInputElement).value).toBe("bad_name");

    fireEvent.change(screen.getAllByLabelText("Variable name")[1], { target: { value: " padded_name " } });
    await user.click(screen.getByRole("button", { name: "Use padded_name" }));
    expect((screen.getAllByLabelText("Variable name")[1] as HTMLInputElement).value).toBe("padded_name");

    await user.click(screen.getByRole("button", { name: "Delete variable padded_name" }));
    expect(screen.getAllByLabelText("Variable name")).toHaveLength(1);
  });

  it("offers to define variables detected in the prompt", async () => {
    render(<PromptWorkspace />);
    fireEvent.change(screen.getByLabelText("Primary Objective & Task"), { target: { value: "Help {{customer}}" } });
    await userEvent.click(screen.getByRole("button", { name: "Define variable customer" }));
    const names = (screen.getAllByLabelText("Variable name") as HTMLInputElement[]).map((i) => i.value);
    expect(names).toContain("customer");
  });

  it("asks for confirmation before resetting and restores the default", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    const resetButton = screen.getByRole("button", { name: /reset default/i });
    expect((resetButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Role & Identity"), { target: { value: "Changed" } });
    expect((resetButton as HTMLButtonElement).disabled).toBe(false);
    await user.click(resetButton);

    const dialog = await screen.findByRole("dialog", { hidden: true });
    await user.click(within(dialog).getByRole("button", { name: "Cancel", hidden: true }));
    expect((screen.getByLabelText("Role & Identity") as HTMLTextAreaElement).value).toBe("Changed");

    await user.click(resetButton);
    await user.click(within(dialog).getByRole("button", { name: "Reset workspace", hidden: true }));
    await waitFor(() =>
      expect((screen.getByLabelText("Role & Identity") as HTMLTextAreaElement).value).toMatch(/^You are a Principal/),
    );
  });

  it("persists drafts to localStorage only when opted in", async () => {
    const user = userEvent.setup();
    render(<PromptWorkspace />);
    fireEvent.change(screen.getByLabelText("Role & Identity"), { target: { value: "Draft role" } });
    expect(window.localStorage.getItem("llm-spg:draft:v1")).toBeNull();

    await user.click(screen.getByLabelText("Save draft locally"));
    await waitFor(() => expect(window.localStorage.getItem("llm-spg:draft:v1")).toContain("Draft role"));

    await user.click(screen.getByLabelText("Save draft locally"));
    expect(window.localStorage.getItem("llm-spg:draft:v1")).toBeNull();
  });
});
