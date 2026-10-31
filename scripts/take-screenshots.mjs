// Takes the README screenshots of the running playground (npm run dev first).
//
//   node scripts/take-screenshots.mjs
//
// Writes docs/screenshots/01-dark-branded.png, 02-generated-code.png and 03-form-kiosk.png.

import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const port = Number(process.env.PORT) || 4610;
const base = `http://localhost:${port}/`;
const out = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
const page = await context.newPage();

async function preset(id) {
  await page.goto(base);
  await page.waitForFunction(() => window.playground?.controller.instance);
  await page.locator(`.preset[data-preset="${id}"]`).click();
  await page.evaluate(() => window.playground.idle());
  await page.waitForTimeout(1500);
}

async function hideToasts() {
  await page.evaluate(() => document.querySelectorAll(".toast, .demo-toast").forEach((node) => node.remove()));
}

// 1. Dark branded viewer with the theme settings next to it.
await preset("dark-branded");
await page.evaluate(async () => {
  const instance = window.playground.controller.instance;
  const NV = window.NutrientViewer;
  const page0 = instance.pageInfoForIndex(0);
  await instance.create([
    new NV.Annotations.StampAnnotation({
      pageIndex: 0, stampType: "Approved", creatorName: "Jordan Lee",
      boundingBox: new NV.Geometry.Rect({ left: page0.width - 236, top: 96, width: 200, height: 64 }),
    }),
  ]);
  // Highlight the first line of the introduction.
  const line = (await instance.textLinesForPageIndex(0)).find((textLine) => textLine.contents.startsWith("The Tarnwell"));
  await instance.create(new NV.Annotations.HighlightAnnotation({
    pageIndex: 0, color: new NV.Color({ r: 255, g: 209, b: 102 }), creatorName: "Jordan Lee",
    rects: NV.Immutable.List([line.boundingBox]), boundingBox: line.boundingBox,
  }));
});
await page.evaluate(() => {
  document.querySelectorAll("details.section").forEach((section) => { section.open = ["theme"].includes(section.dataset.section); });
  const panel = document.querySelector("#panel");
  const row = document.querySelector('[data-setting="theme"]');
  panel.scrollTop += row.getBoundingClientRect().top - panel.getBoundingClientRect().top - 62;
});
await page.waitForTimeout(600);
await hideToasts();
await page.screenshot({ path: `${out}01-dark-branded.png` });

// 2. The generated code for the review profile.
await preset("review");
await page.locator("#show-code").click();
await page.waitForTimeout(400);
await page.evaluate(() => {
  const view = document.querySelector("#code-view");
  const lines = view.textContent.split("\n");
  const index = lines.findIndex((line) => line.startsWith("instance = await NutrientViewer.load"));
  view.scrollTop = Math.max(0, index - 2) * parseFloat(getComputedStyle(view).lineHeight);
});
await hideToasts();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}02-generated-code.png` });

// 3. Form filling kiosk with a partly filled form and a drawn signature.
await preset("kiosk");
await page.evaluate(async () => {
  const instance = window.playground.controller.instance;
  const NV = window.NutrientViewer;
  await instance.setFormFieldValues({
    contact_name: "Alex Morgan",
    company: "Northbridge Interiors Ltd",
    email: "alex.morgan@northbridge.example",
    phone: "01632 960 112",
    site_address: "Unit 4, Quayside Works, Larkfield LF3 2PD",
    serial_number: "LX2-0457-1182",
    issue_category: ["Unstable readings"],
    priority: "urgent",
    visit_date: "2026-11-12",
    description: "pH readings jump by up to 0.8 between consecutive minutes since the last calibration.",
    escort_required: ["Yes"],
    signatory: "Alex Morgan",
  });
  const field = (await instance.getAnnotations(0)).find((annotation) => annotation.formFieldName === "signature");
  const box = field.boundingBox;
  const points = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39;
    return new NV.Geometry.DrawingPoint({
      x: box.left + 18 + t * (box.width - 60),
      y: box.top + box.height * 0.55 + Math.sin(t * Math.PI * 5) * 10 * (1 - t * 0.6),
    });
  });
  await instance.create(new NV.Annotations.InkAnnotation({
    pageIndex: 0, isSignature: true, lineWidth: 2, strokeColor: new NV.Color({ r: 26, g: 54, b: 120 }),
    lines: NV.Immutable.List([NV.Immutable.List(points)]),
    boundingBox: new NV.Geometry.Rect({ left: box.left + 10, top: box.top + 6, width: box.width - 40, height: box.height - 12 }),
  }));
});
await page.waitForTimeout(800);
await hideToasts();
// The custom "Submit form" button reads the values with instance.getFormFieldValues().
await page.locator("#pg-viewer .PSPDFKit-Toolbar").getByRole("button", { name: "Submit form" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}03-form-kiosk.png` });

await browser.close();
console.log("Screenshots written to docs/screenshots/");
