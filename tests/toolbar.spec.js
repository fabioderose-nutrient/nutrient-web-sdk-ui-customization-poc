import { expect, test } from "@playwright/test";
import {
  choose, inViewer, openPlayground, settle, toggle, toolbarButton, toolbarListItem, toolbarTypes, viewer, viewState,
} from "./helpers.js";

test.describe("Toolbar", () => {
  test("hides and shows the toolbar with ViewState.showToolbar", async ({ page }) => {
    await openPlayground(page);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toBeVisible();
    await toggle(page, "toolbarVisible", false);
    expect(await viewState(page, "showToolbar")).toBe(false);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toHaveCount(0);
    await toggle(page, "toolbarVisible", true);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar")).toBeVisible();
  });

  test("moves the toolbar to the bottom with toolbarPlacement (reload)", async ({ page }) => {
    await openPlayground(page);
    const loads = await page.evaluate(() => document.querySelectorAll("#log .log-reload").length);
    await choose(page, "toolbarPlacement", "BOTTOM");
    expect(await page.evaluate(() => document.querySelectorAll("#log .log-reload").length)).toBe(loads + 1);
    const toolbar = await viewer(page).locator(".PSPDFKit-Toolbar").boundingBox();
    const frame = await viewer(page).boundingBox();
    expect(toolbar.y).toBeGreaterThan(frame.y + frame.height / 2);
  });

  test("removes an item with setToolbarItems", async ({ page }) => {
    await openPlayground(page);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Search")).toBeVisible();
    await toolbarListItem(page, "search", false);
    expect(await toolbarTypes(page)).not.toContain("search");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Search")).toHaveCount(0);
  });

  test("reorders items by drag and drop", async ({ page }) => {
    await openPlayground(page);
    // Use two rows that are visible together, so nothing scrolls during the drag.
    await page.locator(".toolbar-list").evaluate((list) => { list.scrollIntoView({ block: "center" }); list.scrollTop = 0; });
    await page.locator('.toolbar-item[data-id="sidebar-layers"]').dragTo(page.locator('.toolbar-item[data-id="sidebar-thumbnails"]'), {
      targetPosition: { x: 40, y: 4 },
    });
    await settle(page);
    expect((await toolbarTypes(page))[0]).toBe("sidebar-layers");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar button").first()).toHaveClass(/PSPDFKit-Toolbar-Button-Sidebar-Layers/);
    // The arrow buttons move an item one step at a time.
    await page.locator('.toolbar-item[data-id="sidebar-layers"]').hover();
    await page.locator('.toolbar-item[data-id="sidebar-layers"] .move button').last().click();
    await settle(page);
    expect((await toolbarTypes(page))[0]).toBe("sidebar-thumbnails");
  });

  test("groups the annotation tools with the annotate responsive group", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "annotateGroup", "never");
    expect(await inViewer(page, (instance) => instance.toolbarItems.find((item) => item.type === "annotate").mediaQueries)).toEqual(["not all"]);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Annotate")).toHaveCount(0);
    await choose(page, "annotateGroup", "always");
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Annotate")).toBeVisible();
  });

  test("groups custom buttons in a dropdown group", async ({ page }) => {
    await openPlayground(page);
    await toolbarListItem(page, "custom:approve", true);
    await toolbarListItem(page, "custom:send-review", true);
    await choose(page, "customGrouping", "dropdown");
    const groups = await inViewer(page, (instance) => instance.toolbarItems.filter((item) => item.type === "custom").map((item) => item.dropdownGroup));
    expect(groups).toEqual(["workflow", "workflow"]);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-DropdownGroup-Workflow, .PSPDFKit-Toolbar-DropdownGroup-workflow")).toHaveCount(1);
  });

  test("drives the viewer from buttons of the host page", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "externalControls", true);
    await expect(page.locator("#host-controls")).toBeVisible();
    expect(await viewState(page, "showToolbar")).toBe(false);
    await expect(page.locator("#page-label")).toHaveText("1 / 8");
    await page.locator("#next-page").click();
    await expect(page.locator("#page-label")).toHaveText("2 / 8");
    expect(await viewState(page, "currentPageIndex")).toBe(1);
    await page.locator("#highlight").click();
    await expect(page.locator("#highlight")).toHaveAttribute("aria-pressed", "true");
    expect(await viewState(page, "interactionMode")).toBe("TEXT_HIGHLIGHTER");
    await page.locator("#thumbnails").click();
    expect(await viewState(page, "sidebarMode")).toBe("THUMBNAILS");
  });
});
