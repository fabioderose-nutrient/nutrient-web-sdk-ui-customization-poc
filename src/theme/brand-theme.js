// Builds a complete custom theme object (Baseline UI theme contract) from one of the
// built-in token sets plus a few brand settings: accent colour, surface tint, font
// and corner radius. The Web SDK needs every token, so the result is always complete.

import { FONTS } from "../catalog.js";
import { DARK, LIGHT } from "./tokens.js";

const BASES = { LIGHT, DARK };

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(rgb) {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

export function mix(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((c, i) => c + (cb[i] - c) * amount));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Text colour to use on top of the accent colour.
export function onAccent(accent) {
  return contrast(accent, "#ffffff") >= contrast(accent, "#14171c") ? "#ffffff" : "#14171c";
}

const clone = (value) => JSON.parse(JSON.stringify(value));

export function buildBrandTheme({ base, accent, surfaceTint, font, corners }) {
  const theme = clone(BASES[base]);
  const c = theme.color;
  const dark = base === "DARK";
  const hovered = dark ? mix(accent, "#ffffff", 0.22) : mix(accent, "#000000", 0.18);
  const active = dark ? mix(accent, "#ffffff", 0.4) : mix(accent, "#000000", 0.34);
  const textOnAccent = onAccent(accent);

  for (const group of [c.background.interactive, c.text.interactive, c.icon.interactive, c.border.interactive]) {
    group.enabled = accent;
    group.hovered = hovered;
    group.active = active;
    group.visited = active;
  }
  c.focused.default = accent;
  c.background.overlay.interactive = `${accent}40`;
  c.background.positive.interactive.enabled = accent;
  c.border.positive.interactive.enabled = accent;
  c.text.oninteractive = textOnAccent;
  c.icon.oninteractive = textOnAccent;

  if (surfaceTint > 0) {
    const amount = surfaceTint / 100;
    for (const group of [c.background.primary, c.background.secondary]) {
      for (const key of Object.keys(group)) group[key] = mix(group[key], accent, amount);
    }
    for (const key of ["subtle", "medium"]) c.border[key] = mix(c.border[key], accent, amount);
  }

  const stack = FONTS[font]?.stack;
  if (stack) {
    const replaceFamily = (node) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "object") replaceFamily(value);
        else if (key === "font") node[key] = value.replace(/^(\d+\s+\S+)\s+.*$/, `$1 ${stack}`);
      }
    };
    replaceFamily(theme.typography);
  }

  if (corners === "square") {
    for (const key of Object.keys(theme.rounded)) if (key !== "full") theme.rounded[key] = "0px";
  } else if (corners === "rounded") {
    Object.assign(theme.rounded, { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "22px", "2xl": "30px" });
  }

  return theme;
}

// Prints the theme object as JavaScript source, one token per line.
export function printTheme(theme, indent = 0) {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  const lines = Object.entries(theme).map(([key, value]) => {
    const printedKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
    const printedValue = typeof value === "object" ? printTheme(value, indent + 1) : JSON.stringify(value);
    return `${inner}${printedKey}: ${printedValue},`;
  });
  return `{\n${lines.join("\n")}\n${pad}}`;
}
