// The settings panel: every control, the state key it edits and the Web SDK API it uses.
//
// mode "live"   = applied to the running viewer with an instance method
// mode "reload" = a NutrientViewer.load() option: the viewer is loaded again

import { DOCUMENTS, FONTS } from "./catalog.js";
import { setToolbarItem, toolbarItemOn } from "./state.js";

const live = "live";
const reload = "reload";

// A switch bound to the presence of a main toolbar item.
const item = (id, label, hint) => ({
  type: "toolbarToggle", item: id, label, hint, mode: live, api: `toolbarItems: { type: "${id}" }`,
});

const onOff = (key, label, api, mode, extra = {}) => ({ type: "toggle", key, label, api, mode, ...extra });

// Brand settings switch the theme to a custom theme object based on the current light or dark theme.
const brand = (key) => (state, value) => ({
  ...state,
  [key]: value,
  theme: "CUSTOM",
  themeBase: state.theme === "CUSTOM" ? state.themeBase : (state.theme.includes("DARK") ? "DARK" : "LIGHT"),
  ...(key === "themeBase" ? { themeBase: value } : {}),
});

export const SECTIONS = [
  {
    id: "document",
    title: "Document",
    rows: [
      {
        type: "segmented", key: "document", label: "Sample document", mode: reload, api: "document",
        options: Object.entries(DOCUMENTS).map(([value, doc]) => [value, doc.label]),
        set: (state, value) => ({ ...state, document: value, initialPage: 1 }),
      },
    ],
  },
  {
    id: "toolbar",
    title: "Toolbar",
    rows: [
      onOff("toolbarVisible", "Show the toolbar", "ViewState.showToolbar", live),
      {
        type: "segmented", key: "toolbarPlacement", label: "Position", mode: reload, api: "toolbarPlacement",
        options: [["TOP", "Top"], ["BOTTOM", "Bottom"]],
      },
      {
        type: "toolbarList", label: "Items: drag to reorder, switch to show or hide", mode: live,
        api: "instance.setToolbarItems()",
      },
      {
        type: "segmented", key: "annotateGroup", label: "Group the annotation tools", mode: live,
        api: 'mediaQueries of { type: "annotate" }',
        hint: "The built-in annotate item is a responsive group. By default it collapses the tools on screens up to 992 px.",
        options: [["default", "Small screens"], ["always", "Always"], ["never", "Never"]],
      },
      {
        type: "segmented", key: "customGrouping", label: "Group the custom buttons", mode: live,
        api: "ToolbarItem.dropdownGroup",
        hint: "One button with a menu that holds Export JSON, Approve, Send for review and Submit form.",
        options: [["none", "Side by side"], ["dropdown", "Dropdown group"]],
      },
      onOff("externalControls", "Drive the viewer from your own buttons", "instance.setViewState(), print(), exportPDF()", live, {
        hint: "Hides the SDK toolbar and adds a bar of plain HTML buttons above the viewer.",
        set: (state, value) => ({ ...state, externalControls: value, toolbarVisible: !value }),
      }),
    ],
  },
  {
    id: "custom",
    title: "Custom buttons and popovers",
    rows: [
      { ...item("custom:export-json", "Export JSON"), api: "instance.exportInstantJSON()", hint: "Downloads the annotations as Instant JSON." },
      { ...item("custom:approve", "Approve"), api: "instance.create(new StampAnnotation())", hint: "Adds an Approved stamp to the current page." },
      { ...item("custom:send-review", "Send for review"), api: "onPress opens your own dialog", hint: "Any code can run from a toolbar button." },
      { ...item("custom:submit-form", "Submit form"), api: "instance.getFormFieldValues()", hint: "Reads the form field values." },
      onOff("annotationToolbarButton", "\"Copy as JSON\" in the annotation toolbar", "instance.setAnnotationToolbarItems()", live, {
        hint: "Select an annotation to see it.",
      }),
      onOff("textSelectionButtons", "\"Copy quote\" and \"Search\" in the text popover", "instance.setInlineTextSelectionToolbarItems()", live, {
        hint: "Select some text to see it.",
      }),
      onOff("textSelectionDefaults", "Keep the built-in markup buttons in the text popover", "defaultItems of the same callback", live),
      onOff("annotationTooltip", "\"Info\" and \"Duplicate\" in the annotation popover", "annotationTooltipCallback", reload, {
        hint: "A popover next to the selected annotation.",
      }),
    ],
  },
  {
    id: "theme",
    title: "Theme and branding",
    rows: [
      {
        type: "select", key: "theme", label: "Theme", mode: reload,
        api: (state) => (state.theme === "CUSTOM" ? "theme: brandTheme (full theme object)" : `theme: NutrientViewer.Theme.${state.theme}`),
        options: [
          ["LIGHT", "Light"], ["DARK", "Dark"], ["AUTO", "Auto (follows the system)"],
          ["HIGH_CONTRAST_LIGHT", "High contrast light"], ["HIGH_CONTRAST_DARK", "High contrast dark"],
          ["CUSTOM", "Custom brand theme"],
        ],
      },
      {
        type: "heading", label: "Custom brand theme",
        hint: "The Web SDK needs a complete theme object. The playground builds it from the light or dark tokens and the settings below.",
      },
      {
        type: "color", key: "accent", label: "Accent colour", mode: reload, api: "color.*.interactive tokens",
        swatches: ["#2f6f8f", "#e8833a", "#1f7a4d", "#7a4fd1", "#c2410c", "#0f766e", "#b3261e", "#334155"],
        hint: "Any change below switches the theme to the custom brand theme.",
        set: brand("accent"),
      },
      {
        type: "segmented", key: "themeBase", label: "Base", mode: reload, api: "LIGHT or DARK tokens",
        options: [["LIGHT", "Light"], ["DARK", "Dark"]],
        set: brand("themeBase"),
      },
      {
        type: "range", key: "surfaceTint", label: "Tint surfaces with the accent", mode: reload, min: 0, max: 30, step: 1, unit: "%",
        api: "color.background.primary.* tokens",
        set: brand("surfaceTint"),
      },
      {
        type: "select", key: "font", label: "Font", mode: reload, api: "typography.*.font tokens",
        options: Object.entries(FONTS).map(([value, font]) => [value, font.label]),
        set: brand("font"),
      },
      {
        type: "segmented", key: "corners", label: "Corners", mode: reload, api: "rounded.* tokens",
        options: [["square", "Square"], ["default", "Default"], ["rounded", "Rounded"]],
        set: brand("corners"),
      },
      { ...item("custom:brand-logo", "Logo area in the toolbar"), api: 'toolbarItems: { type: "custom", node }' },
      {
        type: "text", key: "brandName", label: "Brand name", mode: live, api: "your own DOM node",
        placeholder: "Brand name", visible: (state) => toolbarItemOn(state, "custom:brand-logo") || state.loader === "custom",
      },
      {
        type: "textarea", key: "customCss", label: "Custom CSS", mode: reload, api: "styleSheets",
        placeholder: ".PSPDFKit-Toolbar { ... }",
        hint: "Loaded inside the viewer. Use the public PSPDFKit-* and BaselineUI-* classes.",
        examples: [
          ["Accent line under the toolbar", ".PSPDFKit-Toolbar {\n  box-shadow: inset 0 -2px 0 #2f6f8f;\n}"],
          ["Taller toolbar", ".PSPDFKit-Toolbar {\n  height: 56px;\n}"],
          ["Soft page shadow", ".PSPDFKit-Page {\n  box-shadow: 0 6px 28px rgba(15, 23, 42, 0.18);\n}"],
          ["Wider sidebar border", ".PSPDFKit-Sidebar {\n  border-right: 3px solid #2f6f8f;\n}"],
        ],
      },
    ],
  },
  {
    id: "features",
    title: "Features",
    rows: [
      onOff("readOnly", "Read-only", "ViewState.readOnly", live, {
        hint: "No annotation or form editing in the UI.",
        set: (state, value) => ({ ...state, readOnly: value, showAnnotations: value ? state.showAnnotations : true }),
      }),
      {
        type: "segmented", key: "annotationEditing", label: "Who can edit annotations", mode: live,
        api: (state) => (state.annotationEditing === "none" ? "setEditableAnnotationTypes([])" : "isEditableAnnotation"),
        options: [["all", "Everyone"], ["own", "Only the author"], ["none", "Nobody"]],
        set: (state, value) => ({ ...state, annotationEditing: value, author: value === "own" && !state.author ? "Jordan Lee" : state.author }),
      },
      onOff("showAnnotations", "Show annotations", "ViewState.showAnnotations", live, {
        hint: "The SDK hides annotations only in read-only mode, so switching this off also turns read-only on.",
        set: (state, value) => ({ ...state, showAnnotations: value, readOnly: value ? state.readOnly : true }),
      }),
      onOff("forms", "Forms", "disableForms", reload, { hint: "Off: form fields are neither rendered nor parsed." }),
      item("form-creator", "Form creator"),
      onOff("allowPrinting", "Printing allowed", "ViewState.allowPrinting", live),
      item("print", "Print button"),
      {
        type: "segmented", key: "printQuality", label: "Print quality", mode: reload, api: "printOptions.quality",
        options: [["LOW", "Low"], ["MEDIUM", "Medium"], ["HIGH", "High"]],
      },
      onOff("allowExport", "Download allowed", "ViewState.allowExport", live),
      item("export-pdf", "Download button"),
      onOff("textSelection", "Text selection", "disableTextSelection", reload),
      onOff("preventTextCopy", "Block copying text", "preventTextCopy", reload),
      item("search", "Search"),
      item("document-editor", "Document editor"),
      item("content-editor", "Content editor"),
      item("sidebar-thumbnails", "Thumbnails sidebar"),
      item("sidebar-document-outline", "Outline sidebar"),
      item("sidebar-annotations", "Annotations sidebar"),
      item("sidebar-bookmarks", "Bookmarks sidebar"),
      item("sidebar-signatures", "Signatures sidebar"),
      item("signature", "Electronic signatures"),
      {
        type: "multi", key: "signatureModes", label: "Signature creation modes", mode: reload,
        api: "electronicSignatures.creationModes",
        options: [["DRAW", "Draw"], ["IMAGE", "Image"], ["TYPE", "Type"]],
      },
      item("comment", "Comments"),
      onOff("showComments", "Show comments", "ViewState.showComments", live),
      {
        type: "segmented", key: "commentDisplay", label: "Comment display", mode: live, api: "ViewState.commentDisplay",
        options: [["FITTING", "Fitting"], ["POPOVER", "Popover"], ["FLOATING", "Floating"]],
      },
      onOff("history", "Undo and redo", "enableHistory", reload, {
        hint: "Also adds the undo and redo toolbar items.",
        set: (state, value) => setToolbarItem(setToolbarItem({ ...state, history: value }, "undo", value), "redo", value),
      }),
      item("measure", "Measurement tools"),
      item("redact-text-highlighter", "Redaction tools"),
      {
        type: "text", key: "watermark", label: "Watermark text", mode: reload, api: "renderPageCallback",
        placeholder: "Empty = no watermark", hint: "Drawn on every rendered and printed page.",
      },
    ],
  },
  {
    id: "view",
    title: "View",
    rows: [
      {
        type: "select", key: "initialPage", label: "Initial page", mode: live, api: "ViewState.currentPageIndex",
        options: (state) => Array.from({ length: DOCUMENTS[state.document].pages }, (_, i) => [i + 1, `Page ${i + 1}`]),
      },
      {
        type: "select", key: "zoom", label: "Zoom", mode: live, api: "ViewState.zoom",
        options: [
          ["AUTO", "Auto"], ["FIT_TO_WIDTH", "Fit to width"], ["FIT_TO_VIEWPORT", "Fit page"],
          ["50", "50 %"], ["75", "75 %"], ["100", "100 %"], ["125", "125 %"], ["150", "150 %"], ["200", "200 %"],
        ],
      },
      {
        type: "segmented", key: "layoutMode", label: "Layout", mode: live, api: "ViewState.layoutMode",
        options: [["SINGLE", "Single"], ["DOUBLE", "Double"], ["AUTO", "Auto"]],
      },
      onOff("keepFirstSpreadAsSinglePage", "Cover page on its own", "ViewState.keepFirstSpreadAsSinglePage", live, {
        visible: (state) => state.layoutMode !== "SINGLE",
      }),
      {
        type: "segmented", key: "scrollMode", label: "Scrolling", mode: live, api: "ViewState.scrollMode",
        options: [["CONTINUOUS", "Continuous"], ["PER_SPREAD", "Per page"], ["DISABLED", "Disabled"]],
      },
      { type: "range", key: "spreadSpacing", label: "Spread spacing", mode: live, api: "ViewState.spreadSpacing", min: 0, max: 120, step: 4, unit: "px" },
      { type: "range", key: "pageSpacing", label: "Page spacing (double layout)", mode: live, api: "ViewState.pageSpacing", min: 0, max: 120, step: 4, unit: "px" },
      {
        type: "segmented", key: "pagesRotation", label: "Rotation", mode: live, api: "ViewState.pagesRotation",
        options: [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]],
      },
      {
        type: "select", key: "sidebarMode", label: "Open sidebar", mode: live, api: "ViewState.sidebarMode",
        options: [
          ["NONE", "None"], ["THUMBNAILS", "Thumbnails"], ["DOCUMENT_OUTLINE", "Outline"],
          ["ANNOTATIONS", "Annotations"], ["BOOKMARKS", "Bookmarks"], ["documentPanel", "Document panel (custom)"],
        ],
      },
      {
        type: "segmented", key: "sidebarPlacement", label: "Sidebar side", mode: live, api: "ViewState.sidebarPlacement",
        options: [["START", "Start"], ["END", "End"]],
      },
    ],
  },
  {
    id: "annotations",
    title: "Annotations",
    rows: [
      {
        type: "text", key: "author", label: "Author name", mode: live, api: "instance.setAnnotationCreatorName()",
        placeholder: "Empty = no author", hint: "Stored on every annotation the user creates.",
      },
      onOff("stylePresets", "Custom default styles for the tools", "annotationPresets / instance.setAnnotationPresets()", live),
      { type: "color", key: "inkColor", label: "Ink colour", mode: live, api: "presets.ink.strokeColor", visible: (s) => s.stylePresets },
      { type: "range", key: "inkWidth", label: "Ink width", mode: live, api: "presets.ink.lineWidth", min: 1, max: 40, step: 1, unit: "pt", visible: (s) => s.stylePresets },
      { type: "range", key: "inkOpacity", label: "Ink opacity", mode: live, api: "presets.ink.opacity", min: 10, max: 100, step: 5, unit: "%", visible: (s) => s.stylePresets },
      { type: "color", key: "highlightColor", label: "Highlight colour", mode: live, api: 'presets["text-highlighter"].color', visible: (s) => s.stylePresets },
      { type: "range", key: "highlightOpacity", label: "Highlight opacity", mode: live, api: 'presets["text-highlighter"].opacity', min: 10, max: 100, step: 5, unit: "%", visible: (s) => s.stylePresets },
      { type: "color", key: "textColor", label: "Text box colour", mode: live, api: "presets.text.fontColor", visible: (s) => s.stylePresets },
      { type: "range", key: "textSize", label: "Text box size", mode: live, api: "presets.text.fontSize", min: 8, max: 48, step: 1, unit: "pt", visible: (s) => s.stylePresets },
      {
        type: "segmented", key: "textFont", label: "Text box font", mode: live, api: "presets.text.font",
        options: [["Helvetica", "Helvetica"], ["Times", "Times"], ["Courier", "Courier"]], visible: (s) => s.stylePresets,
      },
      { type: "color", key: "shapeColor", label: "Shape colour", mode: live, api: "presets.rectangle.strokeColor (+ ellipse, polygon, line, arrow)", visible: (s) => s.stylePresets },
      { type: "range", key: "shapeWidth", label: "Shape line width", mode: live, api: "presets.*.strokeWidth", min: 1, max: 20, step: 1, unit: "pt", visible: (s) => s.stylePresets },
      onOff("shapeFill", "Fill shapes with a light tint", "presets.*.fillColor", live, { visible: (s) => s.stylePresets }),
      onOff("customStamps", "Custom stamp templates", "stampAnnotationTemplates / setStampAnnotationTemplates()", live, {
        hint: "Adds REVIEWED, CHANGES REQUESTED and SITE VISIT DONE to the stamp picker.",
      }),
      onOff("keepDefaultStamps", "Keep the built-in stamps", "NutrientViewer.defaultStampAnnotationTemplates", live),
      onOff("brandPalette", "Brand colour palette in the colour pickers", "annotationToolbarColorPresets", reload, {
        hint: "Six colours, including the accent colour. No free colour picker.",
      }),
    ],
  },
  {
    id: "language",
    title: "Language",
    rows: [
      {
        type: "select", key: "locale", label: "Interface language", mode: live, api: "instance.setLocale()",
        options: "locales",
      },
    ],
  },
  {
    id: "slots",
    title: "UI slots",
    rows: [
      {
        type: "segmented", key: "uiPreset", label: "Built-in UI", mode: live, api: 'instance.setUI({ preset: "minimal" })',
        hint: "Minimal hides all SDK interface and keeps the page canvas.",
        options: [["default", "Full"], ["minimal", "Minimal (canvas only)"]],
      },
      { ...item("custom:document-panel", "Custom sidebar panel"), api: "ui.sidebar.documentPanel", hint: "Opens from the sidebar menu of the toolbar." },
      onOff("searchHeader", "Header above the search panel", "ui.search.header", live),
      {
        type: "segmented", key: "loader", label: "Loading screen", mode: reload, api: "ui.loader",
        options: [["default", "Skeleton"], ["progress", "Progress"], ["custom", "Custom"]],
      },
    ],
  },
];

export function rowValue(row, state) {
  if (row.type === "toolbarToggle") return toolbarItemOn(state, row.item);
  return state[row.key];
}

export function applyRow(row, state, value) {
  if (row.type === "toolbarToggle") return setToolbarItem(state, row.item, value);
  if (row.set) return row.set(state, value);
  return { ...state, [row.key]: value };
}
