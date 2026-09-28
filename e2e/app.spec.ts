import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const SCREENSHOT_DIR = "test-results/screenshots";

/** Records every request that is not served by the local app server. */
function trackExternalRequests(page: Page, baseURL: string): string[] {
  const external: string[] = [];
  const origin = new URL(baseURL).origin;
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (!url.startsWith(origin)) external.push(url);
  });
  return external;
}

const livePreview = (page: Page) => page.getByRole("region", { name: /live preview/i });
const field = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });

test.describe("LLM System Prompt Generator", () => {
  test("loads with default prompt and makes no external requests", async ({ page, baseURL }) => {
    const external = trackExternalRequests(page, baseURL!);
    await page.goto("/");
    await expect(page).toHaveTitle("LLM System Prompt Generator & Optimizer");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("LLM System Prompt Generator & Optimizer");
    await expect(page.getByText("Your prompts and variables never leave your browser")).toBeVisible();
    await expect(livePreview(page)).toContainText("You are a Principal Software Engineer");

    // Exercise the app a bit, then assert nothing left localhost.
    await page.getByRole("button", { name: /Structured Data Extraction Agent/ }).click();
    await page.getByRole("tab", { name: /Prompt Output/ }).click();
    await page.getByRole("tab", { name: /Variable Simulator/ }).click();
    await page.waitForLoadState("networkidle");
    expect(external).toEqual([]);
  });

  test("presets populate every builder field and remain editable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Technical Documentation Specialist/ }).click();
    await expect(page.getByRole("button", { name: /Technical Documentation Specialist/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(field(page, "Role & Identity")).toHaveValue(/senior technical writer/);
    await expect(field(page, "Output Format & Schema")).toHaveValue(/GitHub-flavored Markdown/);
    await expect(livePreview(page)).toContainText("{{project_name}}");

    await field(page, "Role & Identity").fill("You are a concise API writer.");
    await expect(livePreview(page)).toContainText("You are a concise API writer.");
    await expect(page.getByRole("button", { name: /Technical Documentation Specialist/ })).toContainText("Edited");
  });

  test("XML toggle, reasoning and guardrail controls update the prompt live", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("switch", { name: /XML tag structure/i }).click();
    await expect(livePreview(page)).toContainText("<system_prompt>");
    await expect(livePreview(page)).toContainText("<guardrails>");

    await page.getByRole("radio", { name: "Detailed" }).click();
    await expect(livePreview(page)).toContainText("Break complex requests into smaller sub-problems");

    await page.getByRole("switch", { name: /Safety guardrails/i }).click();
    await expect(livePreview(page)).not.toContainText("<guardrails>");
    await page.getByRole("switch", { name: /Safety guardrails/i }).click();
    await field(page, "Guardrail / refusal directive").fill("Refuse anything about competitors.");
    await expect(livePreview(page)).toContainText("Refuse anything about competitors.");
  });

  test("copy button writes the prompt to the clipboard", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
    await page.goto("/");
    await page.getByRole("button", { name: "Copy System Prompt" }).first().click();
    await expect(page.getByRole("button", { name: "Copied!" }).first()).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.startsWith("# System Prompt")).toBe(true);
    expect(clip).toContain("You are a Principal Software Engineer");
    await expect(page.getByRole("button", { name: "Copy System Prompt" }).first()).toBeVisible({ timeout: 5000 });
  });

  test("exports .md, .xml and .txt files with the generated content", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /Prompt Output/ }).click();
    const contents: Record<string, string> = {};
    for (const ext of ["md", "xml", "txt"]) {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: `Download prompt as .${ext} file` }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`^system-prompt-\\d{8}-\\d{4}\\.${ext}$`));
      const path = await download.path();
      contents[ext] = await readFile(path!, "utf8");
    }
    expect(contents.md.startsWith("# System Prompt")).toBe(true);
    expect(contents.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<system_prompt>')).toBe(true);
    expect(contents.txt.startsWith("ROLE & IDENTITY")).toBe(true);

    // The XML export parses as a well-formed XML document in the browser.
    const parseError = await page.evaluate(
      (xml) => new DOMParser().parseFromString(xml, "application/xml").getElementsByTagName("parsererror").length,
      contents.xml,
    );
    expect(parseError).toBe(0);
  });

  test("variable simulator substitutes values", async ({ page }) => {
    await page.goto("/");
    const task = field(page, "Primary Objective & Task");
    await task.fill("Help {{user_name}} ship {{project_name}}. Task: {{task}}");
    await page.getByRole("tab", { name: /Variable Simulator/ }).click();

    await page.getByLabel("User Name").fill("Ada");
    await page.getByLabel("Project Name").fill("Apollo");
    await page.getByLabel("Task", { exact: true }).fill("add auth");

    const resolved = page.getByRole("region", { name: "Resolved prompt" });
    await expect(resolved).toContainText("Help Ada ship Apollo. Task: add auth");
    await expect(page.getByRole("region", { name: "Original template" })).toContainText("{{project_name}}");
    await expect(page.getByText("All variables resolved.")).toBeVisible();
  });

  test("validation flags undefined variables and variables can be defined", async ({ page }) => {
    await page.goto("/");
    await field(page, "Primary Objective & Task").fill("Work on {{project_name}}");
    await expect(page.getByText("{{project_name}} is used in the prompt but has no variable definition.").first()).toBeVisible();
    await page.getByRole("button", { name: "Define variable project_name" }).click();
    await expect(page.getByLabel("Variable name").nth(1)).toHaveValue("project_name");
    await page.getByRole("button", { name: "Add Variable" }).click();
    await expect(page.getByLabel("Variable name")).toHaveCount(3);
    await page.getByRole("button", { name: "Delete variable variable" }).click();
    await expect(page.getByLabel("Variable name")).toHaveCount(2);
  });

  test("reset asks for confirmation and restores defaults, with undo", async ({ page }) => {
    await page.goto("/");
    await field(page, "Role & Identity").fill("Temporary role");
    await page.getByRole("button", { name: "Reset Default" }).click();
    const dialog = page.getByRole("dialog", { name: "Reset to the default example?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Reset workspace" }).click();
    await expect(field(page, "Role & Identity")).toHaveValue(/^You are a Principal Software Engineer/);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(field(page, "Role & Identity")).toHaveValue("Temporary role");
  });

  test("draft persistence is opt-in and survives reload", async ({ page }) => {
    await page.goto("/");
    await field(page, "Role & Identity").fill("Persisted role");
    await page.reload();
    await expect(field(page, "Role & Identity")).toHaveValue(/^You are a Principal/);

    await page.getByLabel("Save draft locally").check();
    await field(page, "Role & Identity").fill("Persisted role");
    await page.waitForTimeout(700);
    await page.reload();
    await expect(field(page, "Role & Identity")).toHaveValue("Persisted role");
    await page.getByLabel("Save draft locally").uncheck();
    expect(await page.evaluate(() => localStorage.getItem("llm-spg:draft:v1"))).toBeNull();
  });

  test("validation Fix button jumps to and focuses the offending field", async ({ page }) => {
    await page.goto("/");
    await field(page, "Role & Identity").fill("");
    await page.getByRole("tab", { name: /Prompt Output/ }).click();
    await page.getByRole("button", { name: "Fix" }).first().click();
    await expect(page.getByRole("tab", { name: /Builder/ })).toHaveAttribute("aria-selected", "true");
    await expect(field(page, "Role & Identity")).toBeFocused();
  });

  test("help tooltips stay inside the viewport on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    const tips = page.getByRole("button", { name: /^(About|How|What)/ });
    const count = await tips.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i += 1) {
      const tip = tips.nth(i);
      if (await tip.isDisabled()) continue;
      await tip.scrollIntoViewIfNeeded();
      await tip.focus();
      const box = await page.getByRole("tooltip").boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      await tip.blur();
    }
  });

  test("footer shows HiMat contact links", async ({ page }) => {
    await page.goto("/");
    const contact = page.getByRole("navigation", { name: "HiMat Technology contact" });
    await expect(contact.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:info@himat.co.in");
    await expect(contact.getByRole("link", { name: /Phone/ })).toHaveAttribute("href", "tel:+919445234023");
    await expect(contact.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/company/himat-technology",
    );
  });

  for (const vp of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`responsive layout: ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.getByRole("tab", { name: /Builder/ })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${vp.name}-builder.png`, fullPage: false });
      await page.getByRole("tab", { name: /Prompt Output/ }).click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${vp.name}-output.png`, fullPage: false });
      await page.getByRole("tab", { name: /Variable Simulator/ }).click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${vp.name}-simulator.png`, fullPage: false });
    });
  }
});
