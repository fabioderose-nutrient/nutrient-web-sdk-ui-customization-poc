import { DOCUMENTS, LOCALES, SDK_BASE_URL, SDK_VERSION } from "./catalog.js";
import { EXTERNAL_CONTROLS_CSS, EXTERNAL_CONTROLS_HTML, generateFiles } from "./codegen.js";
import { h } from "./dom.js";
import { highlight } from "./highlight.js";
import { createPanel } from "./panel.js";
import { matchingPreset, PRESETS, presetState } from "./presets.js";
import { changedKeys, DEFAULT_STATE, decodeHash, encodeHash, normalizeState } from "./state.js";
import { ViewerController } from "./viewer-controller.js";

const $ = (id) => document.getElementById(id);
const NutrientViewer = window.NutrientViewer;

let state = decodeHash(location.hash);

// --- Toasts -----------------------------------------------------------------

function toast(message) {
  const node = h("div", { class: "toast", role: "status" }, message);
  $("toast-area").append(node);
  setTimeout(() => node.remove(), 2600);
}

// --- Activity log and status bar ---------------------------------------------

const counters = { live: 0, reload: 0 };

function log(entry) {
  if (entry.kind === "live") counters.live += 1;
  if (entry.kind === "reload") counters.reload += 1;
  const label = { live: "live", reload: "reload", error: "error" }[entry.kind];
  $("status-dot").className = `status-dot status-${entry.kind}`;
  $("status-call").textContent = entry.code.split("\n")[0].slice(0, 140) + (entry.code.includes("\n") ? " ..." : "");
  $("status-call").title = entry.code;
  $("status-meta").textContent = `${entry.ms !== undefined ? `${entry.ms} ms · ` : ""}${counters.live} live updates · ${counters.reload} loads`;
  const item = h("li", { class: `log-${entry.kind}` },
    h("span", { class: `chip chip-${entry.kind === "live" ? "live" : entry.kind === "reload" ? "reload" : "error"}` }, label),
    h("pre", {}, entry.code),
    entry.detail ? h("span", { class: "log-detail" }, entry.detail) : null,
    entry.ms !== undefined ? h("span", { class: "log-time" }, `${entry.ms} ms`) : null);
  $("log").prepend(item);
  while ($("log").children.length > 60) $("log").lastElementChild.remove();
}

$("toggle-log").addEventListener("click", () => {
  const open = $("log").hidden;
  $("log").hidden = !open;
  $("toggle-log").setAttribute("aria-expanded", String(open));
});

function status({ busy, error }) {
  if (busy !== undefined) $("viewer-busy").hidden = !busy;
  if (error !== undefined) {
    $("viewer-error").hidden = !error;
    $("viewer-error").textContent = error ? `The viewer could not apply this configuration: ${error}` : "";
  }
}

// --- Host page controls (the "your own buttons" option) ----------------------

document.head.append(h("style", {}, EXTERNAL_CONTROLS_CSS));
$("host-controls").insertAdjacentHTML("beforeend", EXTERNAL_CONTROLS_HTML);

// --- Viewer ---------------------------------------------------------------------

const controller = new ViewerController({
  container: $("pg-viewer"),
  licenseKey: import.meta.env.VITE_NUTRIENT_LICENSE_KEY || "",
  onLog: log,
  onStatus: status,
});

// --- Panel ------------------------------------------------------------------------

const equals = (a, b) => changedKeys(a, b).length === 0;

const panel = createPanel($("panel"), {
  getState: () => state,
  setState,
  onPreset: (id) => {
    setState(presetState(id));
    toast(`Preset applied: ${PRESETS.find((preset) => preset.id === id).name}`);
  },
  locales: NutrientViewer?.I18n?.locales?.length ? [...NutrientViewer.I18n.locales] : LOCALES,
});

function render() {
  panel.sync(state, matchingPreset(state, equals));
  $("host-controls").hidden = !state.externalControls;
}

function setState(next) {
  state = normalizeState(next);
  const hash = encodeHash(state);
  history.replaceState(null, "", hash || location.pathname + location.search);
  render();
  controller.update(state);
}

window.addEventListener("hashchange", () => {
  const next = decodeHash(location.hash);
  if (!equals(next, state)) setState(next);
});

// --- Header actions ------------------------------------------------------------

$("share-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("Link copied. It opens the playground with this configuration.");
  } catch {
    toast("Copy the address bar: it holds the configuration.");
  }
});

$("reset-all").addEventListener("click", () => {
  setState({ ...DEFAULT_STATE });
  toast("Back to the SDK defaults");
});

// --- Code drawer -----------------------------------------------------------------

let files = [];
let activeFile = "viewer.js";

function liveCallsFile() {
  const calls = controller.liveCalls;
  return {
    name: "Live calls",
    language: "js",
    note: "Runtime calls made since the viewer was last loaded.",
    content: calls.length
      ? `// Calls the playground made on the running instance since the last NutrientViewer.load().\n\n${calls.join("\n\n")}\n`
      : "// No runtime call since the last load.\n// Change a setting marked \"live\" to see the instance method it uses.\n",
  };
}

function showFile(name) {
  activeFile = name;
  const file = files.find((candidate) => candidate.name === name) || files[0];
  $("code-view").firstElementChild.innerHTML = highlight(file.content, file.language);
  $("code-view").scrollTop = 0;
  $("code-note").textContent = file.note || `${file.content.split("\n").length - 1} lines`;
  $("download-file").hidden = file.name === "Live calls";
  [...$("code-tabs").children].forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.name === file.name)));
}

function openCode() {
  files = [...generateFiles(state), liveCallsFile()];
  $("code-tabs").replaceChildren(...files.map((file) => h("button", {
    type: "button", role: "tab", class: "tab", dataset: { name: file.name },
    onclick: () => showFile(file.name),
  }, file.name)));
  showFile(files.some((file) => file.name === activeFile) ? activeFile : "viewer.js");
  $("code-drawer").hidden = false;
  $("copy-file").focus();
}

function closeCode() {
  $("code-drawer").hidden = true;
  $("show-code").focus();
}

$("show-code").addEventListener("click", async () => {
  openCode();
  try {
    await navigator.clipboard.writeText(files.find((file) => file.name === "viewer.js").content);
    toast("viewer.js copied to the clipboard");
  } catch {
    // The drawer still shows the code; the Copy button retries.
  }
});
$("code-drawer").addEventListener("click", (event) => { if (event.target.closest("[data-close]")) closeCode(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("code-drawer").hidden) closeCode(); });

$("copy-file").addEventListener("click", async () => {
  const file = files.find((candidate) => candidate.name === activeFile);
  try {
    await navigator.clipboard.writeText(file.content);
    toast(`${file.name} copied to the clipboard`);
  } catch {
    toast("The clipboard is not available. Select the code and copy it.");
  }
});

$("download-file").addEventListener("click", () => {
  const file = files.find((candidate) => candidate.name === activeFile);
  const type = { js: "text/javascript", html: "text/html", css: "text/css" }[file.language];
  const link = h("a", { href: URL.createObjectURL(new Blob([file.content], { type })), download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// --- Start --------------------------------------------------------------------------

if (!NutrientViewer) {
  status({ busy: false, error: "the Web SDK script did not load. Check the network connection to the CDN." });
} else {
  $("sdk-version").textContent = `Nutrient Web SDK ${NutrientViewer.version || SDK_VERSION}`;
  // Start downloading and compiling the WebAssembly worker while the page renders.
  NutrientViewer.preloadWorker({
    baseUrl: SDK_BASE_URL,
    document: new URL(DOCUMENTS[state.document].file, document.baseURI).href,
    ...(import.meta.env.VITE_NUTRIENT_LICENSE_KEY ? { licenseKey: import.meta.env.VITE_NUTRIENT_LICENSE_KEY } : {}),
  }).catch(() => {});
  render();
  controller.update(state);
}

// Hooks for the Playwright tests and for the browser console.
window.playground = {
  getState: () => state,
  setState,
  applyPreset: (id) => setState(presetState(id)),
  controller,
  generateFiles: () => generateFiles(state),
  idle: () => controller.idle(),
};
