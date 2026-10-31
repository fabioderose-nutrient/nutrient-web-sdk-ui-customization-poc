import { expect, test } from "@playwright/test";
import { choose, openPlayground, pick, settle, toggle, viewer, viewState, waitForViewer } from "./helpers.js";

test.describe("Playground", () => {
  test("keeps the configuration in the URL hash", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "toolbarPlacement", "BOTTOM");
    await pick(page, "zoom", "Fit to width");
    await toggle(page, "readOnly", true);
    expect(page.url()).toContain("#config=");

    await page.reload();
    await waitForViewer(page);
    const state = await page.evaluate(() => window.playground.getState());
    expect(state).toMatchObject({ toolbarPlacement: "BOTTOM", zoom: "FIT_TO_WIDTH", readOnly: true });
    expect(await viewState(page, "readOnly")).toBe(true);
    const toolbar = await viewer(page).locator(".PSPDFKit-Toolbar").boundingBox();
    const frame = await viewer(page).boundingBox();
    expect(toolbar.y).toBeGreaterThan(frame.y + frame.height / 2);
  });

  test("copies a share link", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "layoutMode", "DOUBLE");
    await page.locator("#share-link").click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toBe(page.url());
    expect(link).toContain("#config=");
  });

  test("shows and copies the generated configuration", async ({ page }) => {
    await openPlayground(page, { theme: "CUSTOM", customCss: ".PSPDFKit-Toolbar { height: 56px; }" });
    await page.locator("#show-code").click();
    const tabs = page.locator("#code-tabs .tab");
    await expect(tabs).toHaveText(["viewer.js", "index.html", "brand-theme.js", "viewer-overrides.css", "Live calls"]);
    await expect(page.locator("#code-view")).toContainText("instance = await NutrientViewer.load({");
    await expect(page.locator("#code-view")).toContainText("theme: brandTheme");
    await page.locator("#copy-file").click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const files = await page.evaluate(() => window.playground.generateFiles());
    expect(copied).toBe(files.find((file) => file.name === "viewer.js").content);
    await tabs.filter({ hasText: "brand-theme.js" }).click();
    await expect(page.locator("#code-view")).toContainText("export const brandTheme = {");
    await page.keyboard.press("Escape");
    await expect(page.locator("#code-drawer")).toBeHidden();
  });

  test("lists the runtime calls made since the last load", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "readOnly", true);
    await pick(page, "locale", "German (de)");
    await page.locator("#show-code").click();
    await page.locator("#code-tabs .tab", { hasText: "Live calls" }).click();
    await expect(page.locator("#code-view")).toContainText('instance.setViewState((viewState) => viewState.set("readOnly", true));');
    await expect(page.locator("#code-view")).toContainText('instance.setLocale("de");');
  });

  test("filters the settings by label or API name", async ({ page }) => {
    await openPlayground(page);
    await page.locator(".filter").fill("setLocale");
    await expect(page.locator('[data-setting="locale"]')).toBeVisible();
    await expect(page.locator('[data-setting="readOnly"]')).toBeHidden();
    await page.locator(".filter").fill("");
    await expect(page.locator('[data-setting="readOnly"]')).toBeVisible();
  });

  test("labels each change as live or reload and logs it", async ({ page }) => {
    await openPlayground(page);
    await expect(page.locator('[data-setting="readOnly"] .chip')).toHaveText("live");
    await expect(page.locator('[data-setting="theme"] .chip')).toHaveText("reload");
    await toggle(page, "readOnly", true);
    await expect(page.locator("#status-call")).toContainText('instance.setViewState((viewState) => viewState.set("readOnly", true));');
    await pick(page, "theme", "Dark");
    await expect(page.locator("#status-call")).toHaveText("NutrientViewer.load(configuration)");
    await page.locator("#toggle-log").click();
    await expect(page.locator("#log li").first()).toContainText("load-time setting changed: theme");
  });

  test("resets every setting", async ({ page }) => {
    await openPlayground(page, { readOnly: true, locale: "fr" });
    await page.locator("#reset-all").click();
    await settle(page);
    expect(page.url()).not.toContain("#config=");
    expect(await viewState(page, "readOnly")).toBe(false);
    await expect(page.locator('.preset[data-preset="default"]')).toHaveAttribute("aria-pressed", "true");
  });
});
