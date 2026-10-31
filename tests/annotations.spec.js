import { expect, test } from "@playwright/test";
import {
  choose, createRectangle, inViewer, openPlayground, selectAnnotation, setColor, setRange, toggle, type, viewer,
} from "./helpers.js";

test.describe("Annotations", () => {
  test("sets the author name (setAnnotationCreatorName)", async ({ page }) => {
    await openPlayground(page);
    await type(page, "author", "Riley Chen");
    expect(await inViewer(page, (instance) => instance.annotationCreatorName)).toBe("Riley Chen");
    const id = await createRectangle(page);
    expect(await inViewer(page, async (instance, NV, annotationId) => (await instance.getAnnotations(0))
      .find((annotation) => annotation.id === annotationId).creatorName, id)).toBe("Riley Chen");
  });

  test("changes the default tool styles (setAnnotationPresets)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "stylePresets", true);
    await setColor(page, "inkColor", "#1f7a4d");
    await setRange(page, "inkWidth", 9);
    await setRange(page, "textSize", 24);
    await choose(page, "textFont", "Courier");
    const presets = await inViewer(page, (instance) => {
      const { ink, text } = instance.annotationPresets;
      return { ink: ink.strokeColor.toCSSValue(), width: ink.lineWidth, size: text.fontSize, font: text.font };
    });
    expect(presets).toEqual({ ink: "rgb(31, 122, 77)", width: 9, size: 24, font: "Courier" });
    await toggle(page, "stylePresets", false);
    expect(await inViewer(page, (instance) => instance.annotationPresets.ink.lineWidth)).toBe(5);
  });

  test("adds custom stamp templates (setStampAnnotationTemplates)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "customStamps", true);
    const titles = () => inViewer(page, (instance) => instance.stampAnnotationTemplates.map((stamp) => stamp.title || stamp.stampType));
    expect(await titles()).toEqual(expect.arrayContaining(["REVIEWED", "CHANGES REQUESTED", "SITE VISIT DONE", "Approved"]));
    await toggle(page, "keepDefaultStamps", false);
    expect(await titles()).toEqual(["REVIEWED", "CHANGES REQUESTED", "SITE VISIT DONE"]);
  });

  test("limits colour pickers to a brand palette (annotationToolbarColorPresets)", async ({ page }) => {
    await openPlayground(page);
    await toggle(page, "brandPalette", true);
    const id = await createRectangle(page);
    await selectAnnotation(page, id);
    await viewer(page).getByRole("button", { name: "Color", exact: true }).click();
    // At this viewer width the annotation toolbar is compact: open the swatch list from the current colour.
    const brand = viewer(page).getByLabel("Brand", { exact: true });
    if (!(await brand.isVisible())) await viewer(page).getByLabel("vibrant red", { exact: true }).first().click();
    await expect(brand).toBeVisible();
    for (const name of ["Ink", "Alert", "Marker", "Success", "Paper"]) {
      await expect(viewer(page).getByLabel(name, { exact: true })).toBeVisible();
    }
  });
});
