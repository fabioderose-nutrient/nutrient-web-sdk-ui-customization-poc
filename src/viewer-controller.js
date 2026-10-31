// Keeps one Web SDK instance in sync with the playground state.
//
// A change is applied with the runtime API when one exists (setToolbarItems,
// setViewState, setAnnotationPresets, setLocale, setUI, ...). When an option is
// only read by NutrientViewer.load(), the viewer is unloaded and loaded again.

import { DOCUMENTS } from "./catalog.js";
import { materialize, print } from "./codetree.js";
import { LIVE_GROUPS, LOAD_KEYS, loadSignature, loadTree, postLoadCalls } from "./config.js";
import { compileSnippets, snippetSources } from "./snippets.js";
import { changedKeys } from "./state.js";
import { buildBrandTheme } from "./theme/brand-theme.js";

const RELOAD_DEBOUNCE_MS = 250;
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function refsIn(node, out = new Set()) {
  if (Array.isArray(node)) node.forEach((item) => refsIn(item, out));
  else if (node && typeof node === "object") {
    if (node.$node === "ref") out.add(node.name);
    else if (node.$node === "new") refsIn(node.arg, out);
    else if (!node.$node) Object.values(node).forEach((value) => refsIn(value, out));
  }
  return out;
}

// Sanitises user CSS before it is injected into the viewer: no imports, no remote URLs.
export function safeCss(css) {
  return css
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\)/gi, "none");
}

export class ViewerController {
  constructor({ container, licenseKey, onLog, onStatus, onLoaded }) {
    this.container = container;
    this.licenseKey = licenseKey;
    this.onLog = onLog;
    this.onStatus = onStatus;
    this.onLoaded = onLoaded;
    this.state = null;
    this.instance = null;
    this.sandbox = null;
    this.sources = {};
    this.pending = null;
    this.running = false;
    this.cssUrl = null;
    this.liveCalls = [];
  }

  update(state) {
    this.pending = state;
    if (!this.running) this.flush();
  }

  // Resolves when every queued state has been applied.
  async idle() {
    while (this.running || this.pending) await sleep(30);
  }

  async flush() {
    this.running = true;
    try {
      while (this.pending) {
        let next = this.pending;
        this.pending = null;
        const reload = !this.instance || loadSignature(next) !== loadSignature(this.state);
        if (reload && this.instance) {
          // Let a burst of changes (a colour picker being dragged) settle first.
          await sleep(RELOAD_DEBOUNCE_MS);
          if (this.pending) {
            next = this.pending;
            this.pending = null;
          }
        }
        try {
          if (!this.instance || loadSignature(next) !== loadSignature(this.state)) await this.reload(next);
          else await this.applyLive(next);
        } catch (error) {
          console.error(error);
          this.onLog({ kind: "error", code: String(error?.message || error) });
          this.onStatus({ busy: false, error: String(error?.message || error) });
        }
      }
    } finally {
      this.running = false;
    }
  }

  context() {
    return { NutrientViewer: window.NutrientViewer, sandbox: this.sandbox };
  }

  compile(state) {
    const sources = snippetSources(state);
    this.sources = Object.fromEntries(sources.map((source) => [source.name, source.code]));
    this.sandbox = compileSnippets(sources, window.NutrientViewer);
    if (this.instance) this.sandbox.setInstance(this.instance);
  }

  async reload(next) {
    const { NutrientViewer } = window;
    const previous = this.state;
    const previousPage = this.instance?.viewState.currentPageIndex ?? null;
    const keepPage = previous && previousPage !== null
      && previous.document === next.document && previous.initialPage === next.initialPage;

    this.onStatus({ busy: true });
    if (this.instance) {
      NutrientViewer.unload(this.container);
      this.instance = null;
    }
    if (this.cssUrl) URL.revokeObjectURL(this.cssUrl);
    this.cssUrl = next.customCss.trim()
      ? URL.createObjectURL(new Blob([safeCss(next.customCss)], { type: "text/css" }))
      : null;

    this.compile(next);
    const env = {
      container: this.container,
      documentUrl: new URL(DOCUMENTS[next.document].file, document.baseURI).href,
      licenseKey: this.licenseKey,
      cssUrl: this.cssUrl,
      theme: next.theme === "CUSTOM" ? buildBrandTheme({
        base: next.themeBase, accent: next.accent, surfaceTint: next.surfaceTint, font: next.font, corners: next.corners,
      }) : null,
    };
    const options = materialize(loadTree(next, env), this.context());

    const started = performance.now();
    const instance = await NutrientViewer.load(options);
    this.instance = instance;
    this.sandbox.setInstance(instance);
    for (const item of postLoadCalls(next)) await this.run(item);
    if (keepPage && previousPage > 0) {
      instance.setViewState((viewState) => viewState.set("currentPageIndex", Math.min(previousPage, instance.totalPageCount - 1)));
    }
    this.state = next;
    this.liveCalls = [];

    const reasons = previous ? changedKeys(previous, next).filter((key) => LOAD_KEYS.includes(key)) : [];
    this.onLog({
      kind: "reload",
      code: "NutrientViewer.load(configuration)",
      detail: previous ? `load-time setting changed: ${reasons.join(", ") || "brand name"}` : "initial load",
      ms: Math.round(performance.now() - started),
    });
    this.onStatus({ busy: false, error: null });
    this.onLoaded?.(instance);
  }

  async applyLive(next) {
    const prev = this.state;
    const changed = changedKeys(prev, next);
    if (!changed.length) return;

    const previousSources = this.sources;
    const nextSources = Object.fromEntries(snippetSources(next).map((source) => [source.name, source.code]));
    const sourcesChanged = JSON.stringify(previousSources) !== JSON.stringify(nextSources);
    if (sourcesChanged) this.compile(next);

    for (const group of LIVE_GROUPS) {
      if (!group.keys.some((key) => changed.includes(key))) continue;
      const calls = group.calls(next, prev, changed);
      const before = new Map(group.calls(prev, prev, changed).map((item) => [item.method, item.code]));
      for (const item of calls) {
        // Skip a call that would pass exactly the same arguments as before.
        const refs = [...refsIn(item.args || [])];
        const refsChanged = refs.some((name) => previousSources[name] !== nextSources[name]);
        const sameAsBefore = item.method && item.method !== "setViewState" && !["setEditableAnnotationTypes", "setIsEditableAnnotation"].includes(item.method)
          && before.get(item.method) === item.code && !refsChanged;
        if (sameAsBefore) continue;
        const started = performance.now();
        await this.run(item);
        const entry = { kind: "live", code: item.code, ms: Math.round(performance.now() - started) };
        this.liveCalls.push(item.code);
        this.onLog(entry);
      }
    }
    this.state = next;
  }

  async run(item) {
    const ctx = this.context();
    if (item.run) return item.run(this.instance, ctx, (node) => materialize(node, ctx));
    const args = item.args.map((arg) => materialize(arg, ctx));
    return this.instance[item.method](...args);
  }
}

export { print };
