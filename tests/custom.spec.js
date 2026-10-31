import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  annotationCount, createRectangle, inViewer, lastToast, openPlayground, selectAnnotation, selectText,
  toggle, toolbarButton, viewer,
} from "./helpers.js";

test.describe("Custom buttons and popovers", () => {
  test("Export JSON downloads the annotations as Instant JSON", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "custom:export-json", true);
    await createRectangle(page);
    const download = page.waitForEvent("download");
    await toolbarButton(page, "Export JSON").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("annotations.json");
    const json = JSON.parse(await readFile(await file.path(), "utf8"));
    expect(json.format).toMatch(/^https:\/\/pspdfkit\.com\/instant-json/);
    expect(json.annotations).toHaveLength(1);
    expect(await lastToast(page)).toContain("Exported 1 annotations");
  });

  test("Approve adds an Approved stamp to the current page", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "custom:approve", true);
    await toolbarButton(page, "Approve").click();
    await expect.poll(() => inViewer(page, async (instance) => (await instance.getAnnotations(0))
      .map((annotation) => annotation.stampType).toArray())).toContain("Approved");
    expect(await lastToast(page)).toContain("Approved stamp added to page 1");
  });

  test("Send for review opens the application's own dialog", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "custom:send-review", true);
    await toolbarButton(page, "Send for review").click();
    const dialog = page.locator("dialog.review-dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("select").selectOption({ index: 2 });
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await lastToast(page)).toContain("Helen Osei");
  });

  test("Submit form reads the form field values", async ({ page }) => {
    await openPlayground(page, { document: "form" });
    await toggle(page, "custom:submit-form", true);
    await inViewer(page, (instance) => instance.setFormFieldValues({ contact_name: "Alex Morgan", company: "Northbridge Interiors Ltd" }));
    await toolbarButton(page, "Submit form").click();
    expect(await lastToast(page)).toMatch(/\d+ of 15 fields filled/);
  });

  test("adds Copy as JSON to the annotation toolbar", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "annotationToolbarButton", true);
    const id = await createRectangle(page);
    await selectAnnotation(page, id);
    const button = viewer(page).getByRole("button", { name: "Copy as JSON" });
    await expect(button).toBeVisible();
    await button.click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(clipboard).type).toBe("pspdfkit/shape/rectangle");
  });

  test("adds Copy quote and Search to the text selection popover", async ({ page }) => {
    await openPlayground(page, { zoom: "100" });
    await toggle(page, "textSelectionButtons", true);
    await selectText(page, "Published by");
    await expect(viewer(page).getByRole("button", { name: "Underline" })).toBeVisible();
    await viewer(page).getByRole("button", { name: "Copy quote" }).click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/^"Published by .*" \(page 1\)$/);
  });

  test("can hide the built-in markup buttons of the text popover", async ({ page }) => {
    await openPlayground(page, { zoom: "100", textSelectionButtons: true });
    await toggle(page, "textSelectionDefaults", false);
    await selectText(page, "Published by");
    await expect(viewer(page).getByRole("button", { name: "Copy quote" })).toBeVisible();
    await expect(viewer(page).getByRole("button", { name: "Underline" })).toHaveCount(0);
  });

  test("adds Info and Duplicate to the annotation popover (annotationTooltipCallback)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "annotationTooltip", true);
    const id = await createRectangle(page, { creatorName: "Sam Patel" });
    await selectAnnotation(page, id);
    await viewer(page).getByRole("button", { name: "Info" }).click();
    expect(await lastToast(page)).toContain("by Sam Patel");
    await selectAnnotation(page, id);
    await viewer(page).getByRole("button", { name: "Duplicate" }).click();
    await expect.poll(() => annotationCount(page)).toBe(2);
  });
});
