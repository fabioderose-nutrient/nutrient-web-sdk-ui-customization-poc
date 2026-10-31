// Playground state: defaults, validation and the URL hash encoding.
//
// The state is a flat object. Every value is validated when it comes from the URL,
// because some values (names, colours) end up in generated JavaScript.

import { DEFAULT_TOOLBAR, DOCUMENTS, FONTS, LOCALES, TOOLBAR_ITEM_BY_ID } from "./catalog.js";

export const DEFAULT_STATE = Object.freeze({
  document: "handbook",

  // Toolbar
  toolbar: DEFAULT_TOOLBAR,
  toolbarVisible: true,
  toolbarPlacement: "TOP",
  annotateGroup: "default",
  customGrouping: "none",
  externalControls: false,

  // Custom buttons and popovers (the custom main toolbar buttons live in `toolbar`)
  annotationToolbarButton: false,
  textSelectionButtons: false,
  textSelectionDefaults: true,
  annotationTooltip: false,

  // Theme and branding
  theme: "LIGHT",
  themeBase: "LIGHT",
  accent: "#2f6f8f",
  surfaceTint: 0,
  font: "system",
  corners: "default",
  brandName: "Larkfield Docs",
  customCss: "",

  // Features
  readOnly: false,
  annotationEditing: "all",
  showAnnotations: true,
  forms: true,
  allowPrinting: true,
  allowExport: true,
  printQuality: "LOW",
  textSelection: true,
  preventTextCopy: false,
  history: false,
  signatureModes: ["DRAW", "IMAGE", "TYPE"],
  showComments: true,
  commentDisplay: "FITTING",
  watermark: "",

  // View
  initialPage: 1,
  zoom: "AUTO",
  layoutMode: "SINGLE",
  scrollMode: "CONTINUOUS",
  spreadSpacing: 20,
  pageSpacing: 0,
  keepFirstSpreadAsSinglePage: false,
  pagesRotation: 0,
  sidebarMode: "NONE",
  sidebarPlacement: "START",

  // Annotations
  author: "",
  stylePresets: false,
  inkColor: "#d1495b",
  inkWidth: 4,
  inkOpacity: 100,
  highlightColor: "#ffd166",
  highlightOpacity: 70,
  textColor: "#1f2933",
  textSize: 16,
  textFont: "Helvetica",
  shapeColor: "#2f6f8f",
  shapeWidth: 3,
  shapeFill: false,
  customStamps: false,
  keepDefaultStamps: true,
  brandPalette: false,

  // Language
  locale: "en",

  // UI slots
  uiPreset: "default",
  searchHeader: false,
  loader: "default",
});

const bool = { type: "bool" };
const enumOf = (...values) => ({ type: "enum", values });
const int = (min, max) => ({ type: "int", min, max });
const color = { type: "color" };
const text = (max) => ({ type: "string", max });

export const SCHEMA = {
  document: enumOf(...Object.keys(DOCUMENTS)),
  toolbar: { type: "toolbar" },
  toolbarVisible: bool,
  toolbarPlacement: enumOf("TOP", "BOTTOM"),
  annotateGroup: enumOf("default", "always", "never"),
  customGrouping: enumOf("none", "dropdown"),
  externalControls: bool,
  annotationToolbarButton: bool,
  textSelectionButtons: bool,
  textSelectionDefaults: bool,
  annotationTooltip: bool,
  theme: enumOf("LIGHT", "DARK", "AUTO", "HIGH_CONTRAST_LIGHT", "HIGH_CONTRAST_DARK", "CUSTOM"),
  themeBase: enumOf("LIGHT", "DARK"),
  accent: color,
  surfaceTint: int(0, 30),
  font: enumOf(...Object.keys(FONTS)),
  corners: enumOf("square", "default", "rounded"),
  brandName: text(40),
  customCss: text(4000),
  readOnly: bool,
  annotationEditing: enumOf("all", "own", "none"),
  showAnnotations: bool,
  forms: bool,
  allowPrinting: bool,
  allowExport: bool,
  printQuality: enumOf("LOW", "MEDIUM", "HIGH"),
  textSelection: bool,
  preventTextCopy: bool,
  history: bool,
  signatureModes: { type: "set", values: ["DRAW", "IMAGE", "TYPE"] },
  showComments: bool,
  commentDisplay: enumOf("FITTING", "POPOVER", "FLOATING"),
  watermark: text(60),
  initialPage: int(1, 50),
  zoom: enumOf("AUTO", "FIT_TO_WIDTH", "FIT_TO_VIEWPORT", "50", "75", "100", "125", "150", "200"),
  layoutMode: enumOf("SINGLE", "DOUBLE", "AUTO"),
  scrollMode: enumOf("CONTINUOUS", "PER_SPREAD", "DISABLED"),
  spreadSpacing: int(0, 120),
  pageSpacing: int(0, 120),
  keepFirstSpreadAsSinglePage: bool,
  pagesRotation: enumOf(0, 90, 180, 270),
  sidebarMode: enumOf("NONE", "THUMBNAILS", "DOCUMENT_OUTLINE", "ANNOTATIONS", "BOOKMARKS", "documentPanel"),
  sidebarPlacement: enumOf("START", "END"),
  author: text(40),
  stylePresets: bool,
  inkColor: color,
  inkWidth: int(1, 40),
  inkOpacity: int(10, 100),
  highlightColor: color,
  highlightOpacity: int(10, 100),
  textColor: color,
  textSize: int(8, 48),
  textFont: enumOf("Helvetica", "Times", "Courier"),
  shapeColor: color,
  shapeWidth: int(1, 20),
  shapeFill: bool,
  customStamps: bool,
  keepDefaultStamps: bool,
  brandPalette: bool,
  locale: enumOf(...LOCALES),
  uiPreset: enumOf("default", "minimal"),
  searchHeader: bool,
  loader: enumOf("default", "progress", "custom"),
};

function validValue(spec, value) {
  switch (spec.type) {
    case "bool": return typeof value === "boolean";
    case "enum": return spec.values.includes(value);
    case "int": return Number.isInteger(value) && value >= spec.min && value <= spec.max;
    case "color": return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
    case "string": return typeof value === "string" && value.length <= spec.max && !/[\u0000-\u001f]/.test(value.replace(/\n/g, ""));
    case "set": return Array.isArray(value) && value.every((v) => spec.values.includes(v)) && new Set(value).size === value.length;
    case "toolbar": return Array.isArray(value) && value.every((item) => item && TOOLBAR_ITEM_BY_ID[item.id] && typeof item.on === "boolean");
    default: return false;
  }
}

// Completes a toolbar list with any catalog item it lacks (switched off), so that
// links created with an older catalog keep working.
function completeToolbar(toolbar) {
  const seen = new Set(toolbar.map((item) => item.id));
  const out = toolbar.filter((item, index) => toolbar.findIndex((other) => other.id === item.id) === index);
  DEFAULT_TOOLBAR.forEach((item, index) => {
    if (seen.has(item.id)) return;
    const before = DEFAULT_TOOLBAR.slice(0, index).reverse().find((candidate) => seen.has(candidate.id));
    const position = before ? out.findIndex((candidate) => candidate.id === before.id) + 1 : 0;
    out.splice(position, 0, { id: item.id, on: false });
    seen.add(item.id);
  });
  return out;
}

export function normalizeState(input) {
  const state = { ...DEFAULT_STATE };
  if (!input || typeof input !== "object") return state;
  for (const [key, spec] of Object.entries(SCHEMA)) {
    if (!(key in input)) continue;
    let value = input[key];
    if (spec.type === "toolbar" && Array.isArray(value)) value = decodeToolbar(value);
    if (validValue(spec, value)) state[key] = spec.type === "toolbar" ? completeToolbar(value) : value;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Toolbar helpers

export function toolbarItemOn(state, id) {
  return state.toolbar.some((item) => item.id === id && item.on);
}

export function setToolbarItem(state, id, on) {
  return { ...state, toolbar: state.toolbar.map((item) => (item.id === id ? { ...item, on } : item)) };
}

// Compact form for the URL: ["pager", "-ink", ...] where "-" marks an item that is off.
function encodeToolbar(toolbar) {
  return toolbar.map((item) => (item.on ? item.id : `-${item.id}`));
}

function decodeToolbar(list) {
  return list.map((entry) => (typeof entry === "string"
    ? { id: entry.replace(/^-/, ""), on: !entry.startsWith("-") }
    : entry));
}

function sameToolbar(a, b) {
  return a.length === b.length && a.every((item, i) => item.id === b[i].id && item.on === b[i].on);
}

// ---------------------------------------------------------------------------
// Diff and URL hash

export function isDefault(key, value) {
  const def = DEFAULT_STATE[key];
  if (key === "toolbar") return sameToolbar(value, def);
  if (Array.isArray(def)) return JSON.stringify(value) === JSON.stringify(def);
  return value === def;
}

export function stateDiff(state) {
  const diff = {};
  for (const key of Object.keys(SCHEMA)) {
    if (isDefault(key, state[key])) continue;
    diff[key] = key === "toolbar" ? encodeToolbar(state[key]) : state[key];
  }
  return diff;
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function encodeHash(state) {
  const diff = stateDiff(state);
  return Object.keys(diff).length ? `#config=${toBase64Url(JSON.stringify(diff))}` : "";
}

export function decodeHash(hash) {
  const match = /config=([A-Za-z0-9_-]+)/.exec(hash || "");
  if (!match) return { ...DEFAULT_STATE };
  try {
    return normalizeState(JSON.parse(fromBase64Url(match[1])));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function changedKeys(a, b) {
  return Object.keys(SCHEMA).filter((key) => (key === "toolbar"
    ? !sameToolbar(a.toolbar, b.toolbar)
    : JSON.stringify(a[key]) !== JSON.stringify(b[key])));
}
