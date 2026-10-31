// Helpers shared by the Playwright tests. The tests drive the real settings panel
// and read the effect back from the running Web SDK instance and its DOM.

import { expect } from "@playwright/test";
import { DEFAULT_STATE, encodeHash, normalizeState } from "../src/state.js";

export const viewer = (page) => page.locator("#pg-viewer");

// Opens the playground, optionally with a configuration, and waits for the viewer.
export async function openPlayground(page, patch = null) {
  const hash = patch ? encodeHash(normalizeState({ ...DEFAULT_STATE, ...patch })) : "";
  await page.goto(`/${hash}`);
  await waitForViewer(page);
  await page.evaluate(() => document.querySelectorAll("details.section").forEach((section) => { section.open = true; }));
}

export async function waitForViewer(page) {
  await page.waitForFunction(() => window.playground?.controller.instance, null, { timeout: 60_000 });
  await settle(page);
}

// Waits until every queued change has been applied (live call or reload).
export async function settle(page) {
  await page.evaluate(() => window.playground.idle());
  await page.waitForTimeout(250);
}

// Runs fn(instance, NutrientViewer, arg) in the page.
export function inViewer(page, fn, arg) {
  return page.evaluate(async ([source, value]) => {
    const instance = window.playground.controller.instance;
    // eslint-disable-next-line no-eval
    const run = (0, eval)(`(${source})`);
    return run(instance, window.NutrientViewer, value);
  }, [fn.toString(), arg]);
}

export const viewState = (page, key) => inViewer(page, (instance, NV, k) => {
  const value = instance.viewState[k];
  return value && value.toJS ? value.toJS() : value;
}, key);

export const toolbarTypes = (page) => inViewer(page, (instance) => instance.toolbarItems.map((item) => (item.type === "custom" ? `custom:${item.id}` : item.type)));

export async function themeVar(page, name) {
  const style = await viewer(page).locator(".BaselineUI-ThemeProvider").first().getAttribute("style");
  const match = new RegExp(`${name}:\\s*([^;]+)`).exec(style);
  return match ? match[1].trim() : null;
}

export const row = (page, key) => page.locator(`[data-setting="${key}"]`);

export async function toggle(page, key, on) {
  await row(page, key).locator("input.switch").setChecked(on);
  await settle(page);
}

export async function choose(page, key, value) {
  await row(page, key).locator(`.segmented button[data-value="${value}"]`).click();
  await settle(page);
}

export async function pick(page, key, label) {
  await row(page, key).locator("select").selectOption({ label });
  await settle(page);
}

export async function type(page, key, text) {
  const input = row(page, key).locator("input[type=text], textarea").first();
  await input.fill(text);
  await input.press("Tab");
  await settle(page);
}

export async function setRange(page, key, value) {
  await row(page, key).locator("input[type=range]").fill(String(value));
  await settle(page);
}

export async function setColor(page, key, hex) {
  const input = row(page, key).locator("input.hex");
  await input.fill(hex);
  await input.press("Tab");
  await settle(page);
}

// Switches a toolbar item on or off in the toolbar list.
export async function toolbarListItem(page, id, on) {
  await page.locator(`.toolbar-item[data-id="${id}"] input[type=checkbox]`).setChecked(on);
  await settle(page);
}

export const toolbarButton = (page, name) => viewer(page).locator(".PSPDFKit-Toolbar").getByRole("button", { name, exact: true });

export async function createRectangle(page, { creatorName = null, pageIndex = 0 } = {}) {
  return inViewer(page, async (instance, NV, options) => {
    const annotation = new NV.Annotations.RectangleAnnotation({
      pageIndex: options.pageIndex,
      boundingBox: new NV.Geometry.Rect({ left: 120, top: 320, width: 160, height: 90 }),
      strokeColor: NV.Color.RED,
      ...(options.creatorName ? { creatorName: options.creatorName } : {}),
    });
    const [created] = await instance.create(annotation);
    return created.id;
  }, { creatorName, pageIndex });
}

export async function selectAnnotation(page, id) {
  await inViewer(page, (instance, NV, annotationId) => instance.setSelectedAnnotations(NV.Immutable.List([annotationId])), id);
  await page.waitForTimeout(500);
}

export async function annotationCount(page, pageIndex = 0) {
  return inViewer(page, async (instance, NV, index) => (await instance.getAnnotations(index))
    .filter((annotation) => !(annotation instanceof NV.Annotations.WidgetAnnotation)).size, pageIndex);
}

// Selects the first words of a text line with the mouse: the line that contains
// `target` (a string) or the text line at that index (a number).
export async function selectText(page, target) {
  const lines = viewer(page).locator(".PSPDFKit-Text");
  const line = typeof target === "number" ? lines.nth(target) : lines.filter({ hasText: target }).first();
  const box = await line.boundingBox();
  await page.mouse.move(box.x + 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

export async function lastToast(page) {
  const toast = page.locator(".demo-toast").last();
  await expect(toast).toBeVisible();
  return toast.textContent();
}
