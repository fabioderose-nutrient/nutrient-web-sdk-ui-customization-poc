import { expect, test } from "@playwright/test";
import { PRESETS } from "../src/presets.js";
import { inViewer, openPlayground, settle, themeVar, toolbarTypes, viewState } from "./helpers.js";

const checks = {
  default: async (page) => {
    expect(await inViewer(page, (instance, NV) => instance.toolbarItems.length === NV.defaultToolbarItems.length)).toBe(true);
  },
  minimal: async (page) => {
    expect(await viewState(page, "readOnly")).toBe(true);
    expect(await toolbarTypes(page)).toEqual(["sidebar-thumbnails", "pager", "spacer", "zoom-out", "zoom-in", "zoom-mode", "search", "export-pdf"]);
  },
  review: async (page) => {
    expect(await inViewer(page, (instance) => instance.annotationCreatorName)).toBe("Jordan Lee");
    expect(await toolbarTypes(page)).toEqual(expect.arrayContaining(["comment", "undo", "custom:approve", "custom:send-for-review"]));
    expect(await viewState(page, "sidebarMode")).toBe("ANNOTATIONS");
  },
  kiosk: async (page) => {
    expect(await inViewer(page, (instance) => instance.totalPageCount)).toBe(1);
    expect(await toolbarTypes(page)).toEqual(["custom:brand-logo", "spacer", "zoom-out", "zoom-in", "custom:submit-form"]);
    expect(await themeVar(page, "--bui-color-background-interactive-enabled")).toBe("#1f7a4d");
  },
  "dark-branded": async (page) => {
    expect(await themeVar(page, "--bui-color-background-interactive-enabled")).toBe("#e8833a");
    expect(await themeVar(page, "--bui-rounded-md")).toBe("0px");
    expect(await viewState(page, "sidebarMode")).toBe("DOCUMENT_OUTLINE");
  },
  secure: async (page) => {
    expect(await viewState(page, "allowPrinting")).toBe(false);
    expect(await viewState(page, "allowExport")).toBe(false);
    expect(await toolbarTypes(page)).not.toContain("export-pdf");
  },
  headless: async (page) => {
    await expect(page.locator("#host-controls")).toBeVisible();
    await expect(page.locator("#pg-viewer .PSPDFKit-Toolbar")).toHaveCount(0);
  },
};

test.describe("Presets", () => {
  for (const preset of PRESETS) {
    test(`applies the "${preset.name}" preset`, async ({ page }) => {
      await openPlayground(page);
      await page.locator(`.preset[data-preset="${preset.id}"]`).click();
      await settle(page);
      await expect(page.locator(`.preset[data-preset="${preset.id}"]`)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#log .log-error")).toHaveCount(0);
      await expect(page.locator("#viewer-error")).toBeHidden();
      await checks[preset.id](page);
    });
  }
});
