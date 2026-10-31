import { expect, test } from "@playwright/test";
import { choose, inViewer, openPlayground, pick, settle, toggle, toolbarButton, viewer } from "./helpers.js";

test.describe("Language", () => {
  test("switches the interface language at runtime (setLocale)", async ({ page }) => {
    await openPlayground(page);
    await expect(toolbarButton(page, "Search Document")).toBeVisible();
    await pick(page, "locale", "German (de)");
    expect(await inViewer(page, (instance) => instance.locale)).toBe("de");
    await expect(toolbarButton(page, "Search Document")).toHaveCount(0);
    await pick(page, "locale", "French (fr)");
    expect(await inViewer(page, (instance) => instance.locale)).toBe("fr");
  });
});

test.describe("UI slots", () => {
  test("hides all SDK interface with the minimal preset (setUI)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "uiPreset", "minimal");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toHaveCount(0);
    await choose(page, "uiPreset", "default");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toBeVisible();
  });

  test("adds a custom sidebar panel (ui.sidebar)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "custom:document-panel", true);
    await pick(page, "sidebarMode", "Document panel (custom)");
    await expect(viewer(page).getByText("Form fields")).toBeVisible();
    await expect(viewer(page).getByText("No annotations yet.")).toBeVisible();
    await inViewer(page, async (instance, NV) => instance.create(new NV.Annotations.NoteAnnotation({
      pageIndex: 0, text: { format: "plain", value: "Check" }, boundingBox: new NV.Geometry.Rect({ left: 50, top: 50, width: 32, height: 32 }),
    })));
    await expect(viewer(page).getByText("note", { exact: true })).toBeVisible();
  });

  test("adds a header to the search panel (ui.search.header)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "searchHeader", true);
    await inViewer(page, (instance) => instance.startUISearch("calibration"));
    await expect(viewer(page).getByText("Search this document")).toBeVisible();
  });

  test("shows a custom loading screen (ui.loader)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "loader", "custom");
    // The loader only shows while a document loads: switch the document and watch for it.
    const seen = page.waitForFunction(() => document.querySelector("#pg-viewer")?.firstElementChild?.shadowRoot
      ?.textContent.includes("opening the document"), null, { polling: 10, timeout: 20_000 }).then(() => true).catch(() => false);
    await page.locator('[data-setting="document"] button[data-value="form"]').click();
    await settle(page);
    expect(await seen).toBe(true);
  });
});
