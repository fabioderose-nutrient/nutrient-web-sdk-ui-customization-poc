import { expect, test } from "@playwright/test";
import { choose, openPlayground, pick, setRange, toggle, viewer, viewState } from "./helpers.js";

test.describe("View", () => {
  test("jumps to the initial page (ViewState.currentPageIndex)", async ({ page }) => {
    await openPlayground(page);
    await pick(page, "initialPage", "Page 5");
    expect(await viewState(page, "currentPageIndex")).toBe(4);
  });

  test("sets the zoom (ViewState.zoom)", async ({ page }) => {
    await openPlayground(page);
    await pick(page, "zoom", "150 %");
    expect(await viewState(page, "zoom")).toBe(1.5);
    await pick(page, "zoom", "Fit to width");
    expect(await viewState(page, "zoom")).toBe("FIT_TO_WIDTH");
  });

  test("shows two pages side by side (ViewState.layoutMode)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "layoutMode", "DOUBLE");
    expect(await viewState(page, "layoutMode")).toBe("DOUBLE");
    await toggle(page, "keepFirstSpreadAsSinglePage", true);
    expect(await viewState(page, "keepFirstSpreadAsSinglePage")).toBe(true);
    const pagesPerSpread = await viewer(page).locator(".PSPDFKit-Spread").nth(1).locator(".PSPDFKit-Page").count();
    expect(pagesPerSpread).toBe(2);
  });

  test("scrolls per page (ViewState.scrollMode)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "scrollMode", "PER_SPREAD");
    expect(await viewState(page, "scrollMode")).toBe("PER_SPREAD");
    // The next page replaces the current one instead of scrolling below it.
    await viewer(page).locator(".PSPDFKit-Toolbar").getByRole("button", { name: "Next Page" }).click();
    expect(await viewState(page, "currentPageIndex")).toBe(1);
    const visible = await viewer(page).locator(".PSPDFKit-Page").evaluateAll((pages) => pages.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    }).length);
    expect(visible).toBe(1);
  });

  test("changes spread and page spacing", async ({ page }) => {
    await openPlayground(page);
    await setRange(page, "spreadSpacing", 60);
    expect(await viewState(page, "spreadSpacing")).toBe(60);
    await setRange(page, "pageSpacing", 32);
    expect(await viewState(page, "pageSpacing")).toBe(32);
  });

  test("rotates the pages (ViewState.pagesRotation)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "pagesRotation", "90");
    expect(await viewState(page, "pagesRotation")).toBe(90);
    await expect(viewer(page).locator(".PSPDFKit-Page-Rotation-90-degree").first()).toBeAttached();
  });

  test("opens a sidebar on a chosen side (sidebarMode, sidebarPlacement)", async ({ page }) => {
    await openPlayground(page);
    await pick(page, "sidebarMode", "Outline");
    expect(await viewState(page, "sidebarMode")).toBe("DOCUMENT_OUTLINE");
    await expect(viewer(page).getByText("4. Calibration")).toBeVisible();
    await choose(page, "sidebarPlacement", "END");
    expect(await viewState(page, "sidebarPlacement")).toBe("END");
    const outline = await viewer(page).getByText("4. Calibration").boundingBox();
    const frame = await viewer(page).boundingBox();
    expect(outline.x).toBeGreaterThan(frame.x + frame.width / 2);
  });
});
