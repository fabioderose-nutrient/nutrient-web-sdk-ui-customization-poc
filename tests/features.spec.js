import { expect, test } from "@playwright/test";
import {
  choose, createRectangle, inViewer, openPlayground, row, selectAnnotation, selectText, settle, toggle,
  toolbarButton, toolbarTypes, type, viewer, viewState,
} from "./helpers.js";

test.describe("Features", () => {
  test("read-only mode hides the annotation tools (ViewState.readOnly)", async ({ page }) => {
    await openPlayground(page, { annotateGroup: "never" });
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Ink-Annotation")).toBeVisible();
    await toggle(page, "readOnly", true);
    expect(await viewState(page, "readOnly")).toBe(true);
    await expect(viewer(page).locator(".PSPDFKit-Toolbar-Button-Ink-Annotation")).toHaveCount(0);
  });

  test("only the author can edit their annotations (isEditableAnnotation)", async ({ page }) => {
    await openPlayground(page);
    await choose(page, "annotationEditing", "own");
    expect(await inViewer(page, (instance) => instance.annotationCreatorName)).toBe("Jordan Lee");
    const foreign = await createRectangle(page, { creatorName: "Sam Patel" });
    await selectAnnotation(page, foreign);
    await expect(viewer(page).getByRole("button", { name: "Delete" })).toHaveCount(0);
    const own = await createRectangle(page, { creatorName: "Jordan Lee" });
    await selectAnnotation(page, own);
    await expect(viewer(page).getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("nobody can edit annotations (setEditableAnnotationTypes([]))", async ({ page }) => {
    await openPlayground(page);
    const id = await createRectangle(page);
    await choose(page, "annotationEditing", "none");
    await selectAnnotation(page, id);
    await expect(viewer(page).getByRole("button", { name: "Delete" })).toHaveCount(0);
    await choose(page, "annotationEditing", "all");
    await selectAnnotation(page, id);
    await expect(viewer(page).getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("hides annotations in read-only mode (ViewState.showAnnotations)", async ({ page }) => {
    await openPlayground(page);
    await createRectangle(page);
    await expect(viewer(page).locator(".PSPDFKit-Annotation").first()).toBeVisible();
    await toggle(page, "showAnnotations", false);
    expect(await viewState(page, "readOnly")).toBe(true);
    expect(await viewState(page, "showAnnotations")).toBe(false);
    await expect(viewer(page).locator(".PSPDFKit-Annotation")).toHaveCount(0);
  });

  test("disables forms (disableForms)", async ({ page }) => {
    await openPlayground(page, { document: "form" });
    await expect(viewer(page).locator('input[name="contact_name"]')).toHaveCount(1);
    await toggle(page, "forms", false);
    await expect(viewer(page).locator('input[name="contact_name"]')).toHaveCount(0);
  });

  test("blocks printing and download (ViewState.allowPrinting, allowExport)", async ({ page }) => {
    await openPlayground(page);
    await expect(toolbarButton(page, "Print")).toBeEnabled();
    await toggle(page, "allowPrinting", false);
    expect(await viewState(page, "allowPrinting")).toBe(false);
    await expect(toolbarButton(page, "Print")).toBeDisabled();
    await toggle(page, "allowExport", false);
    expect(await viewState(page, "allowExport")).toBe(false);
    await expect(toolbarButton(page, "Export")).toBeDisabled();
  });

  test("turns text selection off (disableTextSelection)", async ({ page }) => {
    await openPlayground(page);
    await expect(viewer(page).locator(".PSPDFKit-Text").first()).toBeAttached();
    await toggle(page, "textSelection", false);
    await expect(viewer(page).locator(".PSPDFKit-Text")).toHaveCount(0);
  });

  test("blocks copying selected text (preventTextCopy)", async ({ page }) => {
    const copyLine = async (index) => {
      await page.evaluate(() => navigator.clipboard.writeText("nothing copied"));
      await selectText(page, index);
      await page.keyboard.press("ControlOrMeta+c");
      await page.waitForTimeout(300);
      return page.evaluate(() => navigator.clipboard.readText());
    };
    await openPlayground(page, { zoom: "100" });
    const lines = viewer(page).locator(".PSPDFKit-Text");
    await expect(lines.filter({ hasText: "Published by" })).toHaveCount(1);
    const index = await lines.evaluateAll((nodes) => nodes.findIndex((node) => node.textContent.includes("Published by")));
    expect(await copyLine(index)).toContain("Published by");
    await toggle(page, "preventTextCopy", true);
    // The text layer still exists for selection, but it no longer holds the document text.
    await expect(lines.nth(index)).toBeAttached();
    expect(await lines.nth(index).textContent()).not.toContain("Published");
    expect(await copyLine(index)).not.toContain("Published");
  });

  test("adds undo and redo (enableHistory)", async ({ page }) => {
    await openPlayground(page, { annotateGroup: "never" });
    await toggle(page, "history", true);
    expect(await toolbarTypes(page)).toEqual(expect.arrayContaining(["undo", "redo"]));
    await createRectangle(page);
    await expect(toolbarButton(page, "Undo")).toBeEnabled();
    await toolbarButton(page, "Undo").click();
    await expect.poll(() => inViewer(page, async (instance) => (await instance.getAnnotations(0)).size)).toBe(0);
  });

  test("limits the electronic signature creation modes", async ({ page }) => {
    await openPlayground(page, { annotateGroup: "never" });
    await row(page, "signatureModes").getByLabel("Image").uncheck();
    await settle(page);
    await toolbarButton(page, "Sign").click();
    const dialog = viewer(page).getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: "Draw" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Type" })).toBeVisible();
    await expect(dialog.getByRole("tab", { name: "Image" })).toHaveCount(0);
  });

  test("shows comments and their display mode", async ({ page }) => {
    await openPlayground(page, { annotateGroup: "never" });
    await toggle(page, "comment", true);
    await expect(toolbarButton(page, "Comment")).toBeVisible();
    await toggle(page, "showComments", false);
    expect(await viewState(page, "showComments")).toBe(false);
    await choose(page, "commentDisplay", "FLOATING");
    expect(await viewState(page, "commentDisplay")).toBe("FLOATING");
  });

  test("draws a watermark with renderPageCallback", async ({ page }) => {
    const reddish = () => viewer(page).locator(".PSPDFKit-Page img").first().evaluate(async (img) => {
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      const { data } = context.getImageData(0, Math.round(canvas.height * 0.35), canvas.width, Math.round(canvas.height * 0.3));
      let count = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] > data[i + 1] + 12 && data[i] > data[i + 2] + 12) count += 1;
      return count;
    });
    await openPlayground(page);
    const before = await reddish();
    await type(page, "watermark", "CONFIDENTIAL");
    await page.waitForTimeout(800);
    expect(await reddish()).toBeGreaterThan(before + 500);
  });

  const items = [
    ["search", "PSPDFKit-Toolbar-Button-Search"],
    ["document-editor", "PSPDFKit-Toolbar-Button-Document-Editor"],
    ["print", "PSPDFKit-Toolbar-Button-Print"],
    ["export-pdf", "PSPDFKit-Toolbar-Button-Export-PDF"],
  ];
  for (const [id, className] of items) {
    test(`removes the ${id} toolbar item`, async ({ page }) => {
      await openPlayground(page);
      await expect(viewer(page).locator(`.${className}`)).toHaveCount(1);
      await toggle(page, id, false);
      expect(await toolbarTypes(page)).not.toContain(id);
      await expect(viewer(page).locator(`.${className}`)).toHaveCount(0);
    });
  }

  for (const id of ["form-creator", "content-editor", "measure", "redact-text-highlighter", "sidebar-signatures"]) {
    test(`toggles the ${id} toolbar item`, async ({ page }) => {
      await openPlayground(page);
      const before = await toolbarTypes(page);
      await toggle(page, id, !before.includes(id));
      expect((await toolbarTypes(page)).includes(id)).toBe(!before.includes(id));
    });
  }
});
