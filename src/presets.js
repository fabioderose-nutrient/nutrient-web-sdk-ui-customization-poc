// One-click profiles. Each one starts from the defaults and changes many settings at once.

import { TOOLBAR_ITEMS } from "./catalog.js";
import { DEFAULT_STATE } from "./state.js";

// The given items switched on, in this order, followed by every other item switched off.
function toolbar(...ids) {
  const rest = TOOLBAR_ITEMS.filter((item) => !ids.includes(item.id)).map((item) => ({ id: item.id, on: false }));
  return [...ids.map((id) => ({ id, on: true })), ...rest];
}

export const PRESETS = [
  {
    id: "default",
    name: "Default",
    description: "The viewer as the SDK ships it.",
    state: {},
  },
  {
    id: "minimal",
    name: "Minimal viewer",
    description: "Read, zoom, search and download. No editing tools.",
    state: {
      toolbar: toolbar("sidebar-thumbnails", "pager", "spacer", "zoom-out", "zoom-in", "zoom-mode", "search", "export-pdf"),
      readOnly: true,
      zoom: "FIT_TO_WIDTH",
    },
  },
  {
    id: "review",
    name: "Review mode",
    description: "Highlight, comment and approve, with reviewer name and custom stamps.",
    state: {
      toolbar: toolbar(
        "sidebar-thumbnails", "sidebar-annotations", "pager", "zoom-out", "zoom-in", "spacer",
        "text-highlighter", "note", "comment", "ink", "arrow", "rectangle", "stamp", "undo", "redo",
        "search", "custom:approve", "custom:send-review", "custom:export-json",
      ),
      history: true,
      author: "Jordan Lee",
      annotationEditing: "own",
      stylePresets: true,
      highlightColor: "#ffd166",
      inkColor: "#d1495b",
      inkWidth: 3,
      shapeColor: "#d1495b",
      customStamps: true,
      annotationToolbarButton: true,
      textSelectionButtons: true,
      annotationTooltip: true,
      sidebarMode: "ANNOTATIONS",
    },
  },
  {
    id: "kiosk",
    name: "Form filling kiosk",
    description: "One form, branded, sign and submit. Nothing else.",
    state: {
      document: "form",
      toolbar: toolbar("custom:brand-logo", "spacer", "zoom-out", "zoom-in", "custom:submit-form"),
      textSelection: false,
      zoom: "FIT_TO_WIDTH",
      signatureModes: ["TYPE", "DRAW"],
      theme: "CUSTOM",
      themeBase: "LIGHT",
      accent: "#1f7a4d",
      corners: "rounded",
      font: "rounded",
      brandName: "Service desk",
    },
  },
  {
    id: "dark-branded",
    name: "Dark branded",
    description: "Custom dark theme, logo, square corners, custom buttons.",
    state: {
      toolbar: toolbar(
        "custom:brand-logo", "sidebar-thumbnails", "sidebar-document-outline", "custom:document-panel", "pager",
        "zoom-out", "zoom-in", "zoom-mode", "spacer", "annotate", "ink", "highlighter", "text-highlighter",
        "note", "text", "stamp", "arrow", "rectangle", "search", "print",
        "custom:export-json", "custom:approve",
      ),
      annotateGroup: "always",
      theme: "CUSTOM",
      themeBase: "DARK",
      accent: "#e8833a",
      surfaceTint: 6,
      font: "geometric",
      corners: "square",
      brandName: "Larkfield Docs",
      customCss: ".PSPDFKit-Toolbar {\n  box-shadow: inset 0 -2px 0 #e8833a;\n}",
      loader: "custom",
      sidebarMode: "DOCUMENT_OUTLINE",
      zoom: "FIT_TO_WIDTH",
      customStamps: true,
      stylePresets: true,
      inkColor: "#e8833a",
      shapeColor: "#e8833a",
      brandPalette: true,
      searchHeader: true,
    },
  },
  {
    id: "secure",
    name: "Read-only secure viewer",
    description: "No editing, printing, download or copying. Watermarked pages.",
    state: {
      toolbar: toolbar("sidebar-thumbnails", "sidebar-document-outline", "pager", "zoom-out", "zoom-in", "zoom-mode", "spacer", "search"),
      readOnly: true,
      allowPrinting: false,
      allowExport: false,
      preventTextCopy: true,
      textSelectionDefaults: false,
      watermark: "CONFIDENTIAL",
      sidebarMode: "THUMBNAILS",
    },
  },
  {
    id: "headless",
    name: "Your own controls",
    description: "No SDK chrome: the page drives the viewer through the API.",
    state: {
      toolbarVisible: false,
      externalControls: true,
      uiPreset: "minimal",
      zoom: "FIT_TO_WIDTH",
    },
  },
];

export function presetState(id) {
  const preset = PRESETS.find((candidate) => candidate.id === id);
  return { ...DEFAULT_STATE, ...(preset?.state || {}) };
}

// The preset whose settings equal the state, if any.
export function matchingPreset(state, equals) {
  return PRESETS.find((preset) => equals(presetState(preset.id), state))?.id || null;
}
