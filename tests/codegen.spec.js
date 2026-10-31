// Checks that the generated code reproduces the viewer of the playground.
//
// For each preset, the files from "Copy configuration" are served on a blank page
// (index.html, viewer.js, brand-theme.js, viewer-overrides.css). The viewer that
// the generated code creates is compared with the playground viewer: toolbar
// items, view state, locale, author, presets, stamps, theme tokens and the
// labels of the rendered toolbar buttons.

import { expect, test } from "@playwright/test";
import { PRESETS } from "../src/presets.js";
import { openPlayground, settle } from "./helpers.js";

// Reads the comparable facts from a viewer instance and its DOM.
function snapshot(page, getInstance) {
  return page.evaluate(async (getInstanceSource) => {
    // eslint-disable-next-line no-eval
    const instance = (0, eval)(`(${getInstanceSource})`)();
    const root = instance.contentDocument;
    const viewState = instance.viewState.toJS();
    for (const key of ["instance", "resolvedLayoutMode", "sidebarWidth", "sidebarOptions", "pageCursor", "viewportPadding"]) delete viewState[key];
    const toolbar = root.querySelector(".PSPDFKit-Toolbar");
    return {
      toolbarItems: instance.toolbarItems.map((item) => JSON.stringify({
        type: item.type, id: item.id, title: item.title, mediaQueries: item.mediaQueries, dropdownGroup: item.dropdownGroup,
      })),
      viewState,
      locale: instance.locale,
      author: instance.annotationCreatorName,
      ink: instance.annotationPresets.ink?.strokeColor?.toCSSValue() ?? null,
      stamps: instance.stampAnnotationTemplates.map((stamp) => stamp.title || stamp.stampType),
      theme: root.querySelector(".BaselineUI-ThemeProvider")?.getAttribute("style"),
      toolbarButtons: toolbar ? [...toolbar.querySelectorAll("button")].map((button) => button.getAttribute("aria-label") || button.textContent.trim()) : null,
      toolbarShadow: toolbar ? getComputedStyle(toolbar).boxShadow : null,
      pages: instance.totalPageCount,
    };
  }, getInstance.toString());
}

// A combination of settings that no preset uses.
const MIXED = {
  toolbarPlacement: "BOTTOM",
  locale: "de",
  layoutMode: "DOUBLE",
  keepFirstSpreadAsSinglePage: true,
  zoom: "75",
  pagesRotation: 90,
  sidebarMode: "BOOKMARKS",
  sidebarPlacement: "END",
  theme: "CUSTOM",
  themeBase: "LIGHT",
  accent: "#7a4fd1",
  surfaceTint: 12,
  font: "mono",
  corners: "rounded",
  customCss: ".PSPDFKit-Toolbar {\n  box-shadow: inset 0 2px 0 #7a4fd1;\n}",
  annotateGroup: "never",
  customGrouping: "dropdown",
  author: "Riley Chen",
  stylePresets: true,
  inkColor: "#0f766e",
  customStamps: true,
  keepDefaultStamps: false,
  annotationToolbarButton: true,
  textSelectionButtons: true,
  annotationTooltip: true,
  history: true,
  printQuality: "HIGH",
  signatureModes: ["TYPE"],
  commentDisplay: "POPOVER",
  watermark: "DRAFT",
  searchHeader: true,
};

const CASES = [
  ...PRESETS.map((preset) => ({ name: `the "${preset.name}" preset`, preset: preset.id })),
  { name: "a mixed configuration", patch: MIXED },
];

test.describe("Generated code", () => {
  for (const testCase of CASES) {
    test(`reproduces ${testCase.name}`, async ({ page, context }) => {
      if (testCase.preset) {
        await openPlayground(page);
        await page.locator(`.preset[data-preset="${testCase.preset}"]`).click();
      } else {
        await openPlayground(page, testCase.patch);
        await page.evaluate(() => {
          const state = window.playground.getState();
          const toolbar = state.toolbar.map((item) => (["custom:approve", "custom:export-json", "undo", "redo"].includes(item.id) ? { ...item, on: true } : item));
          window.playground.setState({ ...state, toolbar });
        });
      }
      await settle(page);
      await page.waitForTimeout(500);
      const expected = await snapshot(page, () => window.playground.controller.instance);
      const files = await page.evaluate(() => window.playground.generateFiles());
      const frame = await page.locator(".viewer-frame").boundingBox();
      const hostControls = await page.locator("#host-controls").isVisible();
      const hostHeight = hostControls ? (await page.locator("#host-controls").boundingBox()).height : 0;

      // A fresh page that only runs the generated files.
      const generated = await context.newPage();
      await generated.setViewportSize({ width: Math.round(frame.width), height: Math.round(frame.height + hostHeight) });
      // Test instrumentation only: keep a reference to the instance that viewer.js creates.
      // The SDK global exposes `load` as a read-only getter, so it is wrapped in a Proxy.
      await generated.addInitScript(() => {
        let sdk;
        Object.defineProperty(window, "NutrientViewer", {
          configurable: true,
          get: () => sdk,
          set: (value) => {
            const load = async (options) => {
              window.generatedInstance = await value.load(options);
              return window.generatedInstance;
            };
            sdk = new Proxy(value, { get: (target, key) => (key === "load" ? load : Reflect.get(target, key)) });
          },
        });
      });
      const byName = Object.fromEntries(files.map((file) => [file.name, file]));
      const types = { js: "text/javascript", html: "text/html", css: "text/css" };
      await generated.route("**/__generated__/**", (route) => {
        const name = new URL(route.request().url()).pathname.split("/").pop() || "index.html";
        const file = byName[name];
        return file ? route.fulfill({ contentType: types[file.language], body: file.content }) : route.fulfill({ status: 404 });
      });
      await generated.route("**/viewer-overrides.css", (route) => route.fulfill({
        contentType: "text/css", body: byName["viewer-overrides.css"]?.content || "",
      }));
      const errors = [];
      generated.on("pageerror", (error) => errors.push(error.message));
      await generated.goto("/__generated__/index.html");
      await generated.waitForFunction(() => window.generatedInstance, null, { timeout: 60_000 });
      await generated.waitForTimeout(1500);
      const actual = await snapshot(generated, () => window.generatedInstance);

      expect(errors).toEqual([]);
      expect(actual.toolbarItems).toEqual(expected.toolbarItems);
      expect(actual.viewState).toEqual(expected.viewState);
      expect(actual.locale).toBe(expected.locale);
      expect(actual.author).toBe(expected.author);
      expect(actual.ink).toBe(expected.ink);
      expect(actual.stamps).toEqual(expected.stamps);
      expect(actual.theme).toBe(expected.theme);
      expect(actual.toolbarButtons).toEqual(expected.toolbarButtons);
      expect(actual.toolbarShadow).toBe(expected.toolbarShadow);
      expect(actual.pages).toBe(expected.pages);
      if (hostControls) await expect(generated.locator("#page-label")).toHaveText(await page.locator("#page-label").textContent());
      await generated.close();
    });
  }
});
