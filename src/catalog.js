// Static catalogs: SDK version, sample documents, toolbar items, locales and fonts.

export const SDK_VERSION = "1.24.0";
export const SDK_BASE_URL = `https://cdn.cloud.pspdfkit.com/pspdfkit-web@${SDK_VERSION}/`;
export const SDK_SCRIPT_URL = `${SDK_BASE_URL}nutrient-viewer.js`;

export const DOCUMENTS = {
  handbook: {
    label: "Field service handbook",
    detail: "8 pages, outline, table",
    file: "documents/field-service-handbook.pdf",
    pages: 8,
  },
  form: {
    label: "Service request form",
    detail: "1 page, AcroForm fields",
    file: "documents/service-request-form.pdf",
    pages: 1,
  },
};

// Main toolbar items. `builtin` items are NutrientViewer.defaultToolbarItems in their
// default order. `extra` items exist in the SDK but are not in the default toolbar.
// `custom` items are defined by this playground (type: "custom").
// The default items `linearized-download-indicator` and `debug` are left out on purpose:
// they never show in a standalone viewer outside debug mode.
export const TOOLBAR_ITEMS = [
  { id: "custom:brand-logo", label: "Brand logo", kind: "custom" },
  { id: "sidebar-thumbnails", label: "Thumbnails sidebar", kind: "builtin" },
  { id: "sidebar-document-outline", label: "Outline sidebar", kind: "builtin" },
  { id: "sidebar-annotations", label: "Annotations sidebar", kind: "builtin" },
  { id: "sidebar-bookmarks", label: "Bookmarks sidebar", kind: "builtin" },
  { id: "sidebar-signatures", label: "Signatures sidebar", kind: "builtin" },
  { id: "sidebar-attachments", label: "Attachments sidebar", kind: "builtin" },
  { id: "sidebar-layers", label: "Layers sidebar", kind: "builtin" },
  { id: "custom:document-panel", label: "Document panel (custom sidebar)", kind: "custom" },
  { id: "pager", label: "Pager", kind: "builtin" },
  { id: "multi-annotations-selection", label: "Multiple selection", kind: "builtin" },
  { id: "pan", label: "Pan", kind: "builtin" },
  { id: "zoom-out", label: "Zoom out", kind: "builtin" },
  { id: "zoom-in", label: "Zoom in", kind: "builtin" },
  { id: "zoom-mode", label: "Zoom mode", kind: "builtin" },
  { id: "marquee-zoom", label: "Marquee zoom", kind: "extra" },
  { id: "layout-config", label: "Page layout", kind: "extra" },
  { id: "spacer", label: "Spacer", kind: "builtin" },
  { id: "annotate", label: "Annotate (responsive group)", kind: "builtin" },
  { id: "ink", label: "Ink", kind: "builtin" },
  { id: "highlighter", label: "Freehand highlighter", kind: "builtin" },
  { id: "text-highlighter", label: "Text highlighter", kind: "builtin" },
  { id: "ink-eraser", label: "Eraser", kind: "builtin" },
  { id: "signature", label: "Signature", kind: "builtin" },
  { id: "image", label: "Image", kind: "builtin" },
  { id: "stamp", label: "Stamp", kind: "builtin" },
  { id: "note", label: "Note", kind: "builtin" },
  { id: "comment", label: "Comment", kind: "extra" },
  { id: "text", label: "Text box", kind: "builtin" },
  { id: "callout", label: "Callout", kind: "builtin" },
  { id: "line", label: "Line", kind: "builtin" },
  { id: "link", label: "Link", kind: "builtin" },
  { id: "arrow", label: "Arrow", kind: "builtin" },
  { id: "rectangle", label: "Rectangle", kind: "builtin" },
  { id: "ellipse", label: "Ellipse", kind: "builtin" },
  { id: "polygon", label: "Polygon", kind: "builtin" },
  { id: "cloudy-polygon", label: "Cloud", kind: "builtin" },
  { id: "polyline", label: "Polyline", kind: "builtin" },
  { id: "measure", label: "Measurement", kind: "extra" },
  { id: "redact-text-highlighter", label: "Text redaction", kind: "extra" },
  { id: "redact-rectangle", label: "Area redaction", kind: "extra" },
  { id: "undo", label: "Undo", kind: "extra" },
  { id: "redo", label: "Redo", kind: "extra" },
  { id: "print", label: "Print", kind: "builtin" },
  { id: "document-editor", label: "Document editor", kind: "builtin" },
  { id: "document-crop", label: "Crop", kind: "builtin" },
  { id: "content-editor", label: "Content editor", kind: "extra" },
  { id: "form-creator", label: "Form creator", kind: "extra" },
  { id: "search", label: "Search", kind: "builtin" },
  { id: "export-pdf", label: "Download PDF", kind: "builtin" },
  { id: "custom:export-json", label: "Export JSON (custom)", kind: "custom" },
  { id: "custom:approve", label: "Approve (custom)", kind: "custom" },
  { id: "custom:send-review", label: "Send for review (custom)", kind: "custom" },
  { id: "custom:submit-form", label: "Submit form (custom)", kind: "custom" },
];

export const TOOLBAR_ITEM_BY_ID = Object.fromEntries(TOOLBAR_ITEMS.map((item) => [item.id, item]));

// The toolbar the SDK shows when `toolbarItems` is not set.
export const DEFAULT_TOOLBAR = TOOLBAR_ITEMS.map((item) => ({ id: item.id, on: item.kind === "builtin" }));

// Annotation tools that can be grouped in the `annotate` responsive group.
export const ANNOTATION_TOOL_IDS = [
  "ink", "highlighter", "text-highlighter", "ink-eraser", "signature", "image", "stamp", "note",
  "comment", "text", "callout", "line", "link", "arrow", "rectangle", "ellipse", "polygon",
  "cloudy-polygon", "polyline", "measure", "redact-text-highlighter", "redact-rectangle",
];

// Locales shipped with Web SDK 1.24.0 (NutrientViewer.I18n.locales). The panel reads the
// live list from the SDK at runtime; this list is the fallback before the SDK is loaded.
export const LOCALES = [
  "ar", "cs", "cy", "da", "de", "el", "en-GB", "en", "es", "fi", "fr-CA", "fr", "he", "hr",
  "id", "it", "ja", "ko", "ms", "nb-NO", "nl", "pl", "pt-PT", "pt", "ru", "sk", "sl", "sv",
  "th", "tr", "uk", "zh-Hans", "zh-Hant",
];

// Font stacks for the custom theme. Only fonts installed on the device are used.
export const FONTS = {
  system: { label: "SDK default (system UI)", stack: null },
  humanist: { label: "Humanist sans", stack: 'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif' },
  geometric: { label: "Geometric sans", stack: 'Avenir, Montserrat, Corbel, "URW Gothic", source-sans-pro, sans-serif' },
  rounded: { label: "Rounded sans", stack: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", Calibri, source-sans-pro, sans-serif' },
  serif: { label: "Serif", stack: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif' },
  mono: { label: "Monospace", stack: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace' },
};

export const STAMP_FONTS = ["Helvetica", "Times", "Courier"];

// Custom stamp templates offered by the playground (StampAnnotation, stampType "Custom").
export const CUSTOM_STAMPS = [
  { id: "reviewed", title: "REVIEWED", subtitle: "Field service desk", color: "#2f6f8f" },
  { id: "changes", title: "CHANGES REQUESTED", subtitle: "See comments", color: "#b3261e" },
  { id: "site-visit", title: "SITE VISIT DONE", subtitle: "Engineer on site", color: "#1f7a4d" },
];
