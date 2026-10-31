// Turns the playground state into Web SDK configuration: the NutrientViewer.load()
// options, the calls made right after load, and the runtime calls that apply a
// change to a running viewer without reloading it.
//
// Everything is expressed as code trees (codetree.js), so the same description
// produces both the runtime values and the generated source code.

import { CUSTOM_STAMPS, DEFAULT_TOOLBAR, DOCUMENTS, SDK_BASE_URL, TOOLBAR_ITEM_BY_ID } from "./catalog.js";
import { SPREAD, color, construct, expr, print, ref, sdkEnum, spread } from "./codetree.js";
import { CUSTOM_TOOLBAR_SNIPPETS } from "./snippets.js";
import { DEFAULT_STATE, isDefault } from "./state.js";
import { mix } from "./theme/brand-theme.js";

// ---------------------------------------------------------------------------
// Main toolbar

const DEFAULT_TOOLBAR_IDS = DEFAULT_TOOLBAR.filter((item) => item.on).map((item) => item.id);

export function isDefaultToolbar(state) {
  const ids = state.toolbar.filter((item) => item.on).map((item) => item.id);
  return state.annotateGroup === "default"
    && ids.length === DEFAULT_TOOLBAR_IDS.length
    && ids.every((id, index) => id === DEFAULT_TOOLBAR_IDS[index]);
}

const ANNOTATE_QUERIES = { always: ["all"], never: ["not all"] };

// Returns the toolbarItems array tree, or null when the SDK default toolbar applies.
export function toolbarItemsTree(state) {
  if (isDefaultToolbar(state)) return null;
  const items = [];
  for (const { id, on } of state.toolbar) {
    if (!on) continue;
    if (TOOLBAR_ITEM_BY_ID[id].kind === "custom") {
      items.push(ref(CUSTOM_TOOLBAR_SNIPPETS[id]));
    } else if (id === "annotate" && state.annotateGroup !== "default") {
      items.push({ type: "annotate", mediaQueries: ANNOTATE_QUERIES[state.annotateGroup] });
    } else {
      items.push({ type: id });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// View state

const ZOOM_MODES = ["AUTO", "FIT_TO_WIDTH", "FIT_TO_VIEWPORT"];

function zoomValue(zoom) {
  return ZOOM_MODES.includes(zoom) ? sdkEnum("ZoomMode", zoom) : Number(zoom) / 100;
}

// ViewState properties that differ from the SDK defaults, as [property, value tree].
export function viewStateEntries(state, keys = null) {
  const pages = DOCUMENTS[state.document].pages;
  const all = {
    toolbarVisible: ["showToolbar", state.toolbarVisible],
    readOnly: ["readOnly", state.readOnly],
    showAnnotations: ["showAnnotations", state.showAnnotations],
    allowPrinting: ["allowPrinting", state.allowPrinting],
    allowExport: ["allowExport", state.allowExport],
    showComments: ["showComments", state.showComments],
    commentDisplay: ["commentDisplay", sdkEnum("CommentDisplay", state.commentDisplay)],
    initialPage: ["currentPageIndex", Math.min(state.initialPage, pages) - 1],
    zoom: ["zoom", zoomValue(state.zoom)],
    layoutMode: ["layoutMode", sdkEnum("LayoutMode", state.layoutMode)],
    scrollMode: ["scrollMode", sdkEnum("ScrollMode", state.scrollMode)],
    spreadSpacing: ["spreadSpacing", state.spreadSpacing],
    pageSpacing: ["pageSpacing", state.pageSpacing],
    keepFirstSpreadAsSinglePage: ["keepFirstSpreadAsSinglePage", state.keepFirstSpreadAsSinglePage],
    pagesRotation: ["pagesRotation", state.pagesRotation],
    sidebarMode: ["sidebarMode", state.sidebarMode === "NONE" ? null
      : state.sidebarMode === "documentPanel" ? "documentPanel" : sdkEnum("SidebarMode", state.sidebarMode)],
    sidebarPlacement: ["sidebarPlacement", sdkEnum("SidebarPlacement", state.sidebarPlacement)],
  };
  const pick = keys || Object.keys(all).filter((key) => (key === "initialPage"
    ? Math.min(state.initialPage, pages) !== 1
    : !isDefault(key, state[key])));
  return pick.filter((key) => all[key]).map((key) => all[key]);
}

export const VIEW_STATE_KEYS = [
  "toolbarVisible", "readOnly", "showAnnotations", "allowPrinting", "allowExport", "showComments",
  "commentDisplay", "initialPage", "zoom", "layoutMode", "scrollMode", "spreadSpacing", "pageSpacing",
  "keepFirstSpreadAsSinglePage", "pagesRotation", "sidebarMode", "sidebarPlacement",
];

// ---------------------------------------------------------------------------
// Annotation presets and stamps

const preset = (key, values) => ({ [SPREAD]: `NutrientViewer.defaultAnnotationPresets.${key}`, ...values });

export function annotationPresetsTree(state) {
  if (!state.stylePresets) return null;
  const stroke = { strokeColor: color(state.shapeColor), strokeWidth: state.shapeWidth };
  const fill = state.shapeFill ? { fillColor: color(mix(state.shapeColor, "#ffffff", 0.82)) } : {};
  const highlight = { color: color(state.highlightColor), opacity: state.highlightOpacity / 100 };
  return {
    [SPREAD]: "NutrientViewer.defaultAnnotationPresets",
    ink: preset("ink", { strokeColor: color(state.inkColor), lineWidth: state.inkWidth, opacity: state.inkOpacity / 100 }),
    "text-highlighter": preset("text-highlighter", highlight),
    highlight: preset("highlight", highlight),
    text: preset("text", { fontColor: color(state.textColor), fontSize: state.textSize, font: state.textFont }),
    rectangle: preset("rectangle", { ...stroke, ...fill }),
    ellipse: preset("ellipse", { ...stroke, ...fill }),
    polygon: preset("polygon", { ...stroke, ...fill }),
    line: preset("line", stroke),
    arrow: preset("arrow", stroke),
  };
}

export function stampTemplatesTree(state) {
  if (!state.customStamps && state.keepDefaultStamps) return null;
  const stamps = state.customStamps ? CUSTOM_STAMPS.map((stamp) => construct("NutrientViewer.Annotations.StampAnnotation", {
    stampType: "Custom",
    title: stamp.title,
    subtitle: stamp.subtitle,
    color: color(stamp.color),
    boundingBox: construct("NutrientViewer.Geometry.Rect", { left: 0, top: 0, width: 300, height: 100 }),
  })) : [];
  return state.keepDefaultStamps ? [spread("NutrientViewer.defaultStampAnnotationTemplates"), ...stamps] : stamps;
}

// ---------------------------------------------------------------------------
// UI slots

export function uiTree(state) {
  const ui = {};
  if (state.uiPreset === "minimal") ui.preset = "minimal";
  if (state.loader === "progress") ui.loader = { type: "progress" };
  if (state.loader === "custom") ui.loader = ref("customLoader");
  const panel = state.toolbar.some((item) => item.id === "custom:document-panel" && item.on)
    || state.sidebarMode === "documentPanel";
  if (panel) ui.sidebar = { documentPanel: ref("documentPanel") };
  if (state.searchHeader) ui.search = { header: ref("searchHeader") };
  return ui;
}

// ---------------------------------------------------------------------------
// Annotation permissions and popovers

function editableTypesTree(state) {
  return state.annotationEditing === "none" ? [] : null;
}

function inlineTextSelectionTree(state) {
  return state.textSelectionButtons || !state.textSelectionDefaults ? ref("inlineTextSelectionToolbarItems") : null;
}

// ---------------------------------------------------------------------------
// NutrientViewer.load() options

// env: { documentUrl, container, licenseKey, cssUrl, theme } runtime values
export function loadTree(state, env) {
  const doc = DOCUMENTS[state.document];
  const options = {
    container: expr('"#viewer"', () => env.container),
    document: expr(JSON.stringify(`/${doc.file}`), () => env.documentUrl),
    baseUrl: SDK_BASE_URL,
  };
  if (env.licenseKey) options.licenseKey = expr("LICENSE_KEY", () => env.licenseKey);

  if (state.theme === "CUSTOM") options.theme = expr("brandTheme", () => env.theme);
  else if (state.theme !== "LIGHT") options.theme = sdkEnum("Theme", state.theme);
  if (state.toolbarPlacement !== "TOP") options.toolbarPlacement = sdkEnum("ToolbarPlacement", state.toolbarPlacement);
  if (state.customCss.trim()) options.styleSheets = expr('["/viewer-overrides.css"]', () => [env.cssUrl]);

  const toolbarItems = toolbarItemsTree(state);
  if (toolbarItems) options.toolbarItems = toolbarItems;

  const viewState = viewStateEntries(state);
  if (viewState.length) options.initialViewState = construct("NutrientViewer.ViewState", Object.fromEntries(viewState));

  options.locale = state.locale;

  const presets = annotationPresetsTree(state);
  if (presets) options.annotationPresets = presets;
  const stamps = stampTemplatesTree(state);
  if (stamps) options.stampAnnotationTemplates = stamps;
  if (state.brandPalette) options.annotationToolbarColorPresets = ref("annotationToolbarColorPresets");

  const editable = editableTypesTree(state);
  if (editable) options.editableAnnotationTypes = editable;
  if (state.annotationEditing === "own") options.isEditableAnnotation = ref("isEditableAnnotation");

  if (!state.forms) options.disableForms = true;
  if (!state.textSelection) options.disableTextSelection = true;
  if (state.preventTextCopy) options.preventTextCopy = true;
  if (state.history) options.enableHistory = true;
  if (state.printQuality !== "LOW") options.printOptions = { quality: sdkEnum("PrintQuality", state.printQuality) };
  if (!isDefault("signatureModes", state.signatureModes)) {
    options.electronicSignatures = {
      creationModes: state.signatureModes.map((mode) => sdkEnum("ElectronicSignatureCreationMode", mode)),
    };
  }
  if (state.watermark) options.renderPageCallback = ref("renderPageCallback");

  if (state.annotationToolbarButton) options.annotationToolbarItems = ref("annotationToolbarItems");
  const inline = inlineTextSelectionTree(state);
  if (inline) options.inlineTextSelectionToolbarItems = inline;
  if (state.annotationTooltip) options.annotationTooltipCallback = ref("annotationTooltipCallback");

  const ui = uiTree(state);
  if (Object.keys(ui).length) options.ui = ui;
  return options;
}

// Calls made once NutrientViewer.load() resolves (options without a load-time equivalent).
export function postLoadCalls(state) {
  const calls = [];
  if (state.author) {
    calls.push(call("setAnnotationCreatorName", [state.author]));
  }
  if (state.externalControls) {
    calls.push({
      code: "connectExternalControls();",
      run: (instance, ctx) => ctx.sandbox.connectExternalControls(),
    });
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Options that are only read at load time. A change in this projection reloads the viewer.

export const LOAD_KEYS = [
  "document", "theme", "themeBase", "accent", "surfaceTint", "font", "corners", "toolbarPlacement", "customCss",
  "forms", "textSelection", "preventTextCopy", "history", "printQuality", "signatureModes", "watermark",
  "annotationTooltip", "brandPalette", "loader",
];

export function loadSignature(state) {
  const customTheme = state.theme === "CUSTOM";
  return JSON.stringify({
    document: state.document,
    theme: state.theme,
    themeDetails: customTheme ? [state.themeBase, state.accent, state.surfaceTint, state.font, state.corners] : null,
    toolbarPlacement: state.toolbarPlacement,
    customCss: state.customCss.trim(),
    forms: state.forms,
    textSelection: state.textSelection,
    preventTextCopy: state.preventTextCopy,
    history: state.history,
    printQuality: state.printQuality,
    signatureModes: state.signatureModes,
    watermark: state.watermark,
    annotationTooltip: state.annotationTooltip,
    brandPalette: state.brandPalette ? state.accent : false,
    loader: state.loader,
    loaderText: state.loader === "custom" ? [state.brandName, state.themeBase, customTheme] : null,
  });
}

// ---------------------------------------------------------------------------
// Runtime calls for a running viewer

// A call: { code, run(instance, ctx) }. `args` are code trees.
export function call(method, args) {
  return {
    code: `instance.${method}(${args.map((arg) => print(arg, 0)).join(", ")});`,
    method,
    args,
  };
}

function setViewStateCall(entries) {
  const chain = entries.map(([key, value]) => `.set(${JSON.stringify(key)}, ${print(value, 1)})`);
  const code = chain.length === 1
    ? `instance.setViewState((viewState) => viewState${chain[0]});`
    : `instance.setViewState((viewState) => viewState\n  ${chain.join("\n  ")});`;
  return {
    code,
    method: "setViewState",
    run: (instance, ctx, materialize) => instance.setViewState((viewState) => entries.reduce(
      (current, [key, value]) => current.set(key, materialize(value)), viewState)),
  };
}

const RESET = {
  toolbarItems: expr("NutrientViewer.defaultToolbarItems", ({ NutrientViewer }) => NutrientViewer.defaultToolbarItems),
  presets: expr("NutrientViewer.defaultAnnotationPresets", ({ NutrientViewer }) => NutrientViewer.defaultAnnotationPresets),
  stamps: expr("NutrientViewer.defaultStampAnnotationTemplates", ({ NutrientViewer }) => NutrientViewer.defaultStampAnnotationTemplates),
  annotationToolbar: expr(
    "(annotation, { defaultAnnotationToolbarItems }) => defaultAnnotationToolbarItems",
    () => (annotation, { defaultAnnotationToolbarItems }) => defaultAnnotationToolbarItems,
  ),
  inlineToolbar: expr("({ defaultItems }) => defaultItems", () => ({ defaultItems }) => defaultItems),
  editableTypes: expr("NutrientViewer.defaultEditableAnnotationTypes", ({ NutrientViewer }) => NutrientViewer.defaultEditableAnnotationTypes),
  allEditable: expr("() => true", () => () => true),
};

// Groups of state keys that one runtime API call applies. Each group returns the
// calls needed to go from `prev` to `next`.
export const LIVE_GROUPS = [
  {
    keys: ["toolbar", "annotateGroup", "customGrouping", "brandName", "accent"],
    calls: (next) => [call("setToolbarItems", [toolbarItemsTree(next) || RESET.toolbarItems])],
  },
  {
    keys: VIEW_STATE_KEYS,
    calls: (next, prev, changed) => {
      const entries = viewStateEntries(next, changed.filter((key) => VIEW_STATE_KEYS.includes(key)));
      return entries.length ? [setViewStateCall(entries)] : [];
    },
  },
  {
    keys: ["stylePresets", "inkColor", "inkWidth", "inkOpacity", "highlightColor", "highlightOpacity",
      "textColor", "textSize", "textFont", "shapeColor", "shapeWidth", "shapeFill"],
    calls: (next) => [call("setAnnotationPresets", [annotationPresetsTree(next) || RESET.presets])],
  },
  {
    keys: ["customStamps", "keepDefaultStamps"],
    calls: (next) => [call("setStampAnnotationTemplates", [stampTemplatesTree(next) || RESET.stamps])],
  },
  {
    keys: ["author"],
    calls: (next) => [call("setAnnotationCreatorName", [next.author || null])],
  },
  {
    keys: ["annotationEditing", "author"],
    calls: (next, prev) => {
      if (next.annotationEditing === prev.annotationEditing && next.annotationEditing !== "own") return [];
      const out = [];
      if (prev.annotationEditing === "none" && next.annotationEditing !== "none") {
        out.push(call("setEditableAnnotationTypes", [RESET.editableTypes]));
      }
      if (next.annotationEditing === "none") out.push(call("setEditableAnnotationTypes", [[]]));
      if (next.annotationEditing === "own") out.push(call("setIsEditableAnnotation", [ref("isEditableAnnotation")]));
      else if (prev.annotationEditing === "own") out.push(call("setIsEditableAnnotation", [RESET.allEditable]));
      return out;
    },
  },
  {
    keys: ["locale"],
    calls: (next) => [call("setLocale", [next.locale])],
  },
  {
    keys: ["textSelectionButtons", "textSelectionDefaults"],
    calls: (next) => [call("setInlineTextSelectionToolbarItems", [inlineTextSelectionTree(next) || RESET.inlineToolbar])],
  },
  {
    keys: ["annotationToolbarButton"],
    calls: (next) => [call("setAnnotationToolbarItems", [next.annotationToolbarButton ? ref("annotationToolbarItems") : RESET.annotationToolbar])],
  },
  {
    keys: ["uiPreset", "searchHeader", "toolbar", "sidebarMode"],
    calls: (next, prev) => {
      const before = print(uiTree(prev));
      const after = uiTree(next);
      return before === print(after) ? [] : [call("setUI", [after])];
    },
  },
  {
    keys: ["externalControls"],
    calls: (next) => (next.externalControls
      ? [{ code: "connectExternalControls();", run: (instance, ctx) => ctx.sandbox.connectExternalControls() }]
      : []),
  },
];

export { DEFAULT_STATE };
