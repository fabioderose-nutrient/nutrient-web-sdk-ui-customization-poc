import { expect, test } from "@playwright/test";
import { DARK, LIGHT } from "../src/theme/tokens.js";
import {
  choose, openPlayground, pick, row, setColor, setRange, settle, themeVar, toggle, type, viewer,
} from "./helpers.js";

test.describe("Theme and branding", () => {
  test("switches the built-in themes (theme option, reload)", async ({ page }) => {
    await openPlayground(page);
    expect(await themeVar(page, "--bui-color-background-primary-subtle")).toBe(LIGHT.color.background.primary.subtle);
    await pick(page, "theme", "Dark");
    expect(await themeVar(page, "--bui-color-background-primary-subtle")).toBe(DARK.color.background.primary.subtle);
    await pick(page, "theme", "High contrast dark");
    expect(await themeVar(page, "--bui-color-background-primary-subtle")).not.toBe(DARK.color.background.primary.subtle);
  });

  test("builds a complete custom theme from the accent colour", async ({ page }) => {
    await openPlayground(page);
    await setColor(page, "accent", "#7a4fd1");
    expect(await page.evaluate(() => window.playground.getState().theme)).toBe("CUSTOM");
    expect(await themeVar(page, "--bui-color-background-interactive-enabled")).toBe("#7a4fd1");
    expect(await themeVar(page, "--bui-color-focused-default")).toBe("#7a4fd1");
    // The base theme decides the surfaces.
    await choose(page, "themeBase", "LIGHT");
    expect(await themeVar(page, "--bui-color-background-primary-subtle")).toBe(LIGHT.color.background.primary.subtle);
    await setRange(page, "surfaceTint", 20);
    expect(await themeVar(page, "--bui-color-background-primary-subtle")).not.toBe(LIGHT.color.background.primary.subtle);
  });

  test("changes corners and font through the theme tokens", async ({ page }) => {
    await openPlayground(page, { theme: "CUSTOM", themeBase: "LIGHT" });
    await choose(page, "corners", "square");
    expect(await themeVar(page, "--bui-rounded-md")).toBe("0px");
    await choose(page, "corners", "rounded");
    expect(await themeVar(page, "--bui-rounded-md")).toBe("12px");
    await pick(page, "font", "Serif");
    expect(await themeVar(page, "--bui-typography-body-md-regular-font")).toContain("Georgia");
    // The pager label of the toolbar uses the theme typography.
    const font = await viewer(page).locator(".PSPDFKit-Toolbar").getByText("Page", { exact: true }).first()
      .evaluate((node) => getComputedStyle(node).fontFamily);
    expect(font).toContain("Charter");
  });

  test("adds a logo area with a custom node toolbar item", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "custom:brand-logo", true);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toContainText("Larkfield Docs");
    await type(page, "brandName", "Harbour Records");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toContainText("Harbour Records");
  });

  test("loads custom CSS into the viewer with styleSheets", async ({ page }) => {
    await openPlayground(page);
    await row(page, "customCss").getByRole("button", { name: "Accent line under the toolbar" }).click();
    await settle(page);
    const shadow = await viewer(page).locator(".PSPDFKit-Toolbar").evaluate((node) => getComputedStyle(node).boxShadow);
    expect(shadow).toContain("inset");
    expect(shadow).toContain("rgb(47, 111, 143)");
  });
});
