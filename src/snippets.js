// JavaScript source of every custom button, callback and UI slot the playground uses.
//
// These strings are the single source of truth: the playground compiles them with
// `new Function` and passes the result to the SDK, and the code generator copies
// them verbatim into the generated viewer.js. What you copy is what runs.
//
// Snippets may use two free variables: `NutrientViewer` (the SDK global) and
// `instance` (assigned once NutrientViewer.load() resolves).
// Every value taken from the playground state is inserted with JSON.stringify or
// validated beforehand (see state.js), never as raw text.

import { CUSTOM_STAMPS } from "./catalog.js";
import { onAccent } from "./theme/brand-theme.js";

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  braces: svg('<path d="M8 4H7a2 2 0 0 0-2 2v4l-2 2 2 2v4a2 2 0 0 0 2 2h1M16 4h1a2 2 0 0 1 2 2v4l2 2-2 2v4a2 2 0 0 1-2 2h-1"/>'),
  approve: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  send: svg('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>'),
  submit: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="m9 15 2 2 4-4"/>'),
  panel: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M12.5 9h5M12.5 13h5"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
};

// String literal for generated code. SVG markup reads better in single quotes.
const q = (value) => (typeof value === "string" && value.includes('"') && !/['\\\n]/.test(value)
  ? `'${value}'`
  : JSON.stringify(value));

// Grouping of the custom workflow buttons in the main toolbar.
function grouping(state) {
  return state.customGrouping === "dropdown" ? `\n  dropdownGroup: "workflow",` : "";
}

const SNIPPETS = {
  notify: () => `// A small toast for the demo actions. Replace it with your application's notifications.
function notify(message) {
  const toast = document.createElement("div");
  toast.className = "demo-toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toast.style.cssText =
    "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;" +
    "max-width:min(560px,90vw);padding:10px 16px;border-radius:8px;background:#1f2328;color:#fff;" +
    "font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)";
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3500);
}`,

  saveFile: () => `function saveFile(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}`,

  brandLogo: (state) => `// Logo area: a custom toolbar item that renders its own DOM node.
const brandLogo = {
  type: "custom",
  id: "brand-logo",
  title: ${q(state.brandName || "Logo")},
  node: (() => {
    const node = document.createElement("div");
    node.style.cssText =
      "display:flex;align-items:center;gap:8px;height:100%;padding:0 14px;white-space:nowrap;" +
      "font:600 14px/1 system-ui,sans-serif;color:var(--bui-color-text-primary)";
    node.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="1" y="1" width="22" height="22" rx="6" fill=${q(state.accent)}/>' +
      '<path d="M8 6.5h5.5L17 10v7.5H8z" fill="none" stroke=${q(onAccent(state.accent))} stroke-width="1.8" stroke-linejoin="round"/>' +
      "</svg>";
    node.append(${q(state.brandName || "Logo")});
    return node;
  })(),
};`,

  exportJsonButton: (state) => `const exportJsonButton = {
  type: "custom",
  id: "export-json",
  title: "Export JSON",
  icon: ${q(ICONS.braces)},${grouping(state)}
  onPress: async () => {
    // Instant JSON holds the annotations, form field values and bookmarks.
    const json = await instance.exportInstantJSON();
    saveFile(new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }), "annotations.json");
    notify(\`Exported \${json.annotations?.length ?? 0} annotations to annotations.json\`);
  },
};`,

  approveButton: (state) => `const approveButton = {
  type: "custom",
  id: "approve",
  title: "Approve",
  icon: ${q(ICONS.approve)},${grouping(state)}
  onPress: async () => {
    const pageIndex = instance.viewState.currentPageIndex;
    const { width } = instance.pageInfoForIndex(pageIndex);
    const stamp = new NutrientViewer.Annotations.StampAnnotation({
      pageIndex,
      stampType: "Approved",
      boundingBox: new NutrientViewer.Geometry.Rect({ left: width - 236, top: 36, width: 200, height: 64 }),
    });
    await instance.create(stamp);
    notify(\`Approved stamp added to page \${pageIndex + 1}\`);
  },
};`,

  sendForReviewButton: (state) => `const sendForReviewButton = {
  type: "custom",
  id: "send-for-review",
  title: "Send for review",
  icon: ${q(ICONS.send)},${grouping(state)}
  onPress: () => {
    const dialog = document.createElement("dialog");
    dialog.className = "review-dialog";
    dialog.innerHTML = \`
      <form method="dialog">
        <h2>Send for review</h2>
        <label>Reviewer
          <select name="reviewer">
            <option>Priya Natarajan, Quality</option>
            <option>Tom Varga, Field service</option>
            <option>Helen Osei, Compliance</option>
          </select>
        </label>
        <label>Message
          <textarea name="message" rows="3">Please check the marked sections before Friday.</textarea>
        </label>
        <menu>
          <button value="cancel">Cancel</button>
          <button value="send" class="primary">Send</button>
        </menu>
      </form>\`;
    dialog.addEventListener("close", () => {
      if (dialog.returnValue === "send") {
        const reviewer = dialog.querySelector("select").value;
        notify(\`Review request for \${reviewer} created (demo: nothing is sent)\`);
      }
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  },
};`,

  submitFormButton: (state) => `const submitFormButton = {
  type: "custom",
  id: "submit-form",
  title: "Submit form",
  icon: ${q(ICONS.submit)},${grouping(state)}
  onPress: () => {
    const values = instance.getFormFieldValues();
    // Unchecked check boxes report ["Off"].
    const filled = Object.values(values).filter((value) =>
      Array.isArray(value) ? value.some((item) => item !== "Off") : value !== null && value !== "");
    console.log("Form field values", values);
    notify(\`\${filled.length} of \${Object.keys(values).length} fields filled. Values logged to the console.\`);
  },
};`,

  documentPanelButton: () => `// Opens the custom "documentPanel" sidebar from the sidebar dropdown of the toolbar.
const documentPanelButton = {
  type: "custom",
  id: "document-panel",
  title: "Document panel",
  icon: ${q(ICONS.panel)},
  dropdownGroup: "sidebar",
  onPress: () => {
    instance.setViewState((viewState) =>
      viewState.set("sidebarMode", viewState.sidebarMode === "documentPanel" ? null : "documentPanel"));
  },
};`,

  documentPanel: () => `// Custom sidebar (ui.sidebar.documentPanel): live document facts from the instance API.
const documentPanel = (getInstance, id, { requestUpdate }) => {
  const root = document.createElement("div");
  root.style.cssText = "padding:16px 18px;font:14px/1.5 system-ui,sans-serif";
  let facts = null;
  const refresh = async () => {
    const viewer = getInstance();
    if (!viewer) return;
    const pages = await Promise.all(
      Array.from({ length: viewer.totalPageCount }, (_, pageIndex) => viewer.getAnnotations(pageIndex)));
    const byType = {};
    pages.forEach((annotations) => annotations.forEach((annotation) => {
      const type = NutrientViewer.Annotations.toSerializableObject(annotation).type.split("/").pop();
      if (type !== "widget") byType[type] = (byType[type] || 0) + 1;
    }));
    facts = { byType, fields: (await viewer.getFormFields()).size };
    requestUpdate();
  };
  return {
    render: () => {
      const viewer = getInstance();
      const row = (label, value) =>
        \`<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;\` +
        \`border-bottom:1px solid var(--bui-color-border-subtle)"><span>\${label}</span><strong>\${value}</strong></div>\`;
      const types = facts ? Object.entries(facts.byType) : [];
      root.innerHTML =
        '<div style="font-weight:600;margin-bottom:8px">Document</div>' +
        row("Pages", viewer ? viewer.totalPageCount : "-") +
        row("Current page", viewer ? viewer.viewState.currentPageIndex + 1 : "-") +
        row("Form fields", facts ? facts.fields : "-") +
        '<div style="font-weight:600;margin:16px 0 8px">Annotations</div>' +
        (types.length ? types.map(([type, count]) => row(type, count)).join("")
          : '<div style="color:var(--bui-color-text-secondary)">No annotations yet.</div>');
      return root;
    },
    onMount: () => {
      refresh();
      getInstance()?.addEventListener("annotations.change", refresh);
      getInstance()?.addEventListener("viewState.currentPageIndex.change", requestUpdate);
    },
    onUnmount: () => {
      getInstance()?.removeEventListener("annotations.change", refresh);
      getInstance()?.removeEventListener("viewState.currentPageIndex.change", requestUpdate);
    },
  };
};`,

  searchHeader: () => `// ui.search.header: a header above the built-in search panel.
const searchHeader = () => ({
  render: () => {
    const header = document.createElement("div");
    header.textContent = "Search this document";
    header.style.cssText =
      "padding:8px 12px;font:600 13px/1.4 system-ui,sans-serif;" +
      "color:var(--bui-color-text-oninteractive);background:var(--bui-color-background-interactive-enabled)";
    return header;
  },
});`,

  customLoader: (state) => `// ui.loader: shown while the document loads. getInstance() is still null here.
const customLoader = () => ({
  render: () => {
    const loader = document.createElement("div");
    loader.style.cssText =
      "display:grid;place-items:center;height:100%;font:600 15px/1.4 system-ui,sans-serif;" +
      "color:${state.theme === "CUSTOM" && state.themeBase === "DARK" ? "#e6e9ee" : "#3d434e"};" +
      "background:${state.theme === "CUSTOM" && state.themeBase === "DARK" ? "#14171c" : "#f6f9fd"}";
    loader.textContent = ${q(`${state.brandName || "Viewer"}: opening the document...`)};
    return loader;
  },
});`,

  annotationToolbarItems: () => `// Adds a custom button to the toolbar shown for the selected annotation.
const annotationToolbarItems = (annotation, { defaultAnnotationToolbarItems }) => {
  // pageIndex is null while an annotation is being created.
  if (!annotation || annotation.pageIndex === null) return defaultAnnotationToolbarItems;
  return [
    ...defaultAnnotationToolbarItems,
    {
      type: "custom",
      id: "copy-annotation-json",
      title: "Copy as JSON",
      icon: ${q(ICONS.copy)},
      onPress: async () => {
        const json = NutrientViewer.Annotations.toSerializableObject(annotation);
        await navigator.clipboard.writeText(JSON.stringify(json, null, 2)).catch(() => {});
        notify(\`Copied the \${json.type} annotation as Instant JSON\`);
      },
    },
  ];
};`,

  inlineTextSelectionToolbarItems: (state) => {
    const defaults = state.textSelectionDefaults ? "...defaultItems,\n  " : "";
    if (!state.textSelectionButtons) {
      return `// Hides the popover shown for selected text (text stays selectable).
const inlineTextSelectionToolbarItems = () => [];`;
    }
    return `// Adds buttons to the popover shown for selected text.
const inlineTextSelectionToolbarItems = ({ defaultItems }) => [
  ${defaults}{
    type: "custom",
    id: "copy-quote",
    title: "Copy quote",
    onPress: async () => {
      const selection = instance.getTextSelection();
      if (!selection) return;
      const quote = \`"\${(await selection.getText()).trim()}" (page \${selection.startPageIndex + 1})\`;
      await navigator.clipboard.writeText(quote).catch(() => {});
      notify(\`Copied: \${quote}\`);
    },
  },
  {
    type: "custom",
    id: "search-selection",
    title: "Search",
    onPress: async () => {
      const selection = instance.getTextSelection();
      if (selection) instance.startUISearch((await selection.getText()).trim());
    },
  },
];`;
  },

  annotationTooltipCallback: () => `// Items of the popover shown next to a selected annotation.
const annotationTooltipCallback = (annotation) => {
  if (annotation instanceof NutrientViewer.Annotations.WidgetAnnotation) return [];
  return [
    {
      type: "custom",
      id: "annotation-info",
      title: "Info",
      onPress: () => {
        const type = NutrientViewer.Annotations.toSerializableObject(annotation).type.split("/").pop();
        notify(\`\${type} annotation on page \${annotation.pageIndex + 1} by \${annotation.creatorName || "an unknown author"}\`);
      },
    },
    {
      type: "custom",
      id: "duplicate-annotation",
      title: "Duplicate",
      onPress: () => {
        instance.duplicateSelectedAnnotations();
        notify("Annotation duplicated");
      },
    },
  ];
};`,

  isEditableAnnotation: (state) => `// Users can only change the annotations they created.
const isEditableAnnotation = (annotation) => annotation.creatorName === ${q(state.author || "Jordan Lee")};`,

  renderPageCallback: (state) => `// Draws a watermark on every rendered and printed page.
const renderPageCallback = (context, pageIndex, pageSize) => {
  context.save();
  context.translate(pageSize.width / 2, pageSize.height / 2);
  context.rotate(-Math.PI / 5);
  context.font = \`600 \${Math.round(pageSize.width / 13)}px sans-serif\`;
  context.fillStyle = "rgba(179, 38, 30, 0.16)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(${q(state.watermark)}, 0, 0);
  context.restore();
};`,

  annotationToolbarColorPresets: (state) => `// Brand palette for every colour picker of the annotation toolbar.
const annotationToolbarColorPresets = ({ propertyName }) => {
  const palette = [
    ["brand", ${q(state.accent)}],
    ["ink", "#1f2933"],
    ["alert", "#b3261e"],
    ["marker", "#ffd166"],
    ["success", "#1f7a4d"],
    ["paper", "#ffffff"],
  ].map(([id, hex]) => ({
    color: new NutrientViewer.Color({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    }),
    localization: { id, defaultMessage: id[0].toUpperCase() + id.slice(1) },
  }));
  const transparent = { color: NutrientViewer.Color.TRANSPARENT, localization: { id: "none", defaultMessage: "None" } };
  const allowsNone = ["fill-color", "background-color"].includes(propertyName);
  return { presets: allowsNone ? [transparent, ...palette] : palette, showColorPicker: false };
};`,

  connectExternalControls: () => `// Connects the buttons of your own page (see index.html) to the viewer.
function connectExternalControls() {
  const byId = (id) => document.getElementById(id);
  const { InteractionMode, SidebarMode, ZoomMode } = NutrientViewer;
  const goTo = (delta) => instance.setViewState((viewState) => viewState.set("currentPageIndex",
    Math.min(instance.totalPageCount - 1, Math.max(0, viewState.currentPageIndex + delta))));
  const toggle = (key, value) => instance.setViewState((viewState) =>
    viewState.set(key, viewState[key] === value ? null : value));
  const sync = (viewState) => {
    byId("page-label").textContent = \`\${viewState.currentPageIndex + 1} / \${instance.totalPageCount}\`;
    byId("highlight").setAttribute("aria-pressed", viewState.interactionMode === InteractionMode.TEXT_HIGHLIGHTER);
    byId("draw").setAttribute("aria-pressed", viewState.interactionMode === InteractionMode.INK);
    byId("thumbnails").setAttribute("aria-pressed", viewState.sidebarMode === SidebarMode.THUMBNAILS);
  };

  byId("prev-page").onclick = () => goTo(-1);
  byId("next-page").onclick = () => goTo(1);
  byId("zoom-out").onclick = () => instance.setViewState((viewState) => viewState.zoomOut());
  byId("zoom-in").onclick = () => instance.setViewState((viewState) => viewState.zoomIn());
  byId("fit-width").onclick = () => instance.setViewState((viewState) => viewState.set("zoom", ZoomMode.FIT_TO_WIDTH));
  byId("thumbnails").onclick = () => toggle("sidebarMode", SidebarMode.THUMBNAILS);
  byId("highlight").onclick = () => toggle("interactionMode", InteractionMode.TEXT_HIGHLIGHTER);
  byId("draw").onclick = () => toggle("interactionMode", InteractionMode.INK);
  byId("search-form").onsubmit = (event) => {
    event.preventDefault();
    instance.startUISearch(byId("search-input").value);
  };
  byId("print").onclick = () => instance.print();
  byId("download").onclick = async () => {
    saveFile(new Blob([await instance.exportPDF()], { type: "application/pdf" }), "document.pdf");
  };
  instance.addEventListener("viewState.change", sync);
  sync(instance.viewState);
}`,
};

const DEPENDENCIES = {
  exportJsonButton: ["notify", "saveFile"],
  approveButton: ["notify"],
  sendForReviewButton: ["notify"],
  submitFormButton: ["notify"],
  annotationToolbarItems: ["notify"],
  inlineTextSelectionToolbarItems: ["notify"],
  annotationTooltipCallback: ["notify"],
  connectExternalControls: ["saveFile"],
};

// Custom toolbar entries (state.toolbar ids) and the snippet that defines each.
export const CUSTOM_TOOLBAR_SNIPPETS = {
  "custom:brand-logo": "brandLogo",
  "custom:document-panel": "documentPanelButton",
  "custom:export-json": "exportJsonButton",
  "custom:approve": "approveButton",
  "custom:send-review": "sendForReviewButton",
  "custom:submit-form": "submitFormButton",
};


// Names of the snippets the state needs, in dependency order.
export function neededSnippets(state, { externalControls = state.externalControls } = {}) {
  const wanted = [];
  const on = (id) => state.toolbar.some((item) => item.id === id && item.on);
  for (const [id, name] of Object.entries(CUSTOM_TOOLBAR_SNIPPETS)) if (on(id)) wanted.push(name);
  if (on("custom:document-panel") || state.sidebarMode === "documentPanel") wanted.push("documentPanel");
  if (state.searchHeader) wanted.push("searchHeader");
  if (state.loader === "custom") wanted.push("customLoader");
  if (state.annotationToolbarButton) wanted.push("annotationToolbarItems");
  if (state.textSelectionButtons || !state.textSelectionDefaults) wanted.push("inlineTextSelectionToolbarItems");
  if (state.annotationTooltip) wanted.push("annotationTooltipCallback");
  if (state.annotationEditing === "own") wanted.push("isEditableAnnotation");
  if (state.watermark) wanted.push("renderPageCallback");
  if (state.brandPalette) wanted.push("annotationToolbarColorPresets");
  if (externalControls) wanted.push("connectExternalControls");

  const ordered = [];
  const add = (name) => {
    if (ordered.includes(name)) return;
    (DEPENDENCIES[name] || []).forEach(add);
    ordered.push(name);
  };
  ["notify", "saveFile"].forEach((helper) => {
    if (wanted.some((name) => (DEPENDENCIES[name] || []).includes(helper))) add(helper);
  });
  wanted.forEach(add);
  return ordered;
}

export function snippetSources(state) {
  return neededSnippets(state).map((name) => ({ name, code: SNIPPETS[name](state) }));
}

// Compiles the snippets into live functions. Returns the defined names plus
// setInstance(), which assigns the `instance` variable the snippets close over.
export function compileSnippets(sources, NutrientViewer) {
  const names = sources.map((source) => source.name);
  const body = `"use strict";
let instance = null;
${sources.map((source) => source.code).join("\n\n")}
return { setInstance: (value) => { instance = value; }, ${names.join(", ")} };`;
  // eslint-disable-next-line no-new-func
  return new Function("NutrientViewer", body)(NutrientViewer);
}

export { CUSTOM_STAMPS };
