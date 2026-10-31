// Renders the settings panel from settings.js and keeps it in sync with the state.

import { LOCALES, TOOLBAR_ITEM_BY_ID } from "./catalog.js";
import { h } from "./dom.js";
import { PRESETS } from "./presets.js";
import { applyRow, rowValue, SECTIONS } from "./settings.js";
import { DEFAULT_STATE } from "./state.js";

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

const resolve = (value, state) => (typeof value === "function" ? value(state) : value);

function localeLabel(code) {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export function createPanel(root, { getState, setState, onPreset, locales = LOCALES }) {
  const syncers = [];
  const rows = [];

  const update = (row, value) => setState(applyRow(row, getState(), value));

  // --- Presets ------------------------------------------------------------
  const presetButtons = PRESETS.map((preset) => h("button", {
    type: "button",
    class: "preset",
    dataset: { preset: preset.id },
    onclick: () => onPreset(preset.id),
  }, h("span", { class: "preset-name" }, preset.name), h("span", { class: "preset-description" }, preset.description)));

  const presetsBlock = h("section", { class: "presets", "aria-labelledby": "presets-title" },
    h("h2", { id: "presets-title", class: "block-title" }, "Presets"),
    h("div", { class: "preset-grid" }, presetButtons));

  // --- Filter -------------------------------------------------------------
  const filterInput = h("input", {
    type: "search", class: "filter", placeholder: "Filter settings or API names", "aria-label": "Filter settings",
  });

  // --- Controls -------------------------------------------------------------
  function chip(row) {
    const node = h("span", { class: "chip" });
    syncers.push((state) => {
      const mode = resolve(row.mode, state);
      node.className = `chip chip-${mode}`;
      node.textContent = mode === "live" ? "live" : "reload";
      node.title = mode === "live"
        ? "Applied to the running viewer with an instance method"
        : "A NutrientViewer.load() option: the viewer is loaded again";
    });
    return node;
  }

  function apiLine(row) {
    const node = h("code", { class: "api" });
    syncers.push((state) => { node.textContent = resolve(row.api, state) || ""; });
    return node;
  }

  function control(row, id) {
    switch (row.type) {
      case "toggle":
      case "toolbarToggle": {
        const input = h("input", { id, type: "checkbox", role: "switch", class: "switch" });
        input.addEventListener("change", () => update(row, input.checked));
        syncers.push((state) => { input.checked = Boolean(rowValue(row, state)); });
        return input;
      }
      case "select": {
        const select = h("select", { id });
        let options = [];
        const fill = (state) => {
          const list = row.options === "locales"
            ? locales.map((code) => [code, localeLabel(code)]).sort((a, b) => a[1].localeCompare(b[1]))
            : resolve(row.options, state);
          if (JSON.stringify(list) === JSON.stringify(options)) return;
          options = list;
          select.replaceChildren(...list.map(([value, label], index) => h("option", { value: String(index) }, label)));
        };
        select.addEventListener("change", () => update(row, options[Number(select.value)][0]));
        syncers.push((state) => {
          fill(state);
          const index = options.findIndex(([value]) => value === state[row.key]);
          select.value = String(Math.max(0, index));
        });
        return select;
      }
      case "segmented": {
        const group = h("div", { class: "segmented", role: "radiogroup", id });
        const buttons = row.options.map(([value, label]) => {
          const button = h("button", { type: "button", role: "radio", dataset: { value: String(value) } }, label);
          button.addEventListener("click", () => update(row, value));
          return button;
        });
        group.append(...buttons);
        syncers.push((state) => buttons.forEach((button, index) => {
          button.setAttribute("aria-checked", String(row.options[index][0] === state[row.key]));
        }));
        return group;
      }
      case "multi": {
        const group = h("div", { class: "multi", id });
        const boxes = row.options.map(([value, label]) => {
          const input = h("input", { type: "checkbox", value });
          input.addEventListener("change", () => {
            const current = getState()[row.key];
            const next = input.checked ? [...current, value] : current.filter((v) => v !== value);
            if (!next.length) { input.checked = true; return; }
            update(row, row.options.map(([v]) => v).filter((v) => next.includes(v)));
          });
          return { value, input, node: h("label", { class: "check" }, input, label) };
        });
        group.append(...boxes.map((box) => box.node));
        syncers.push((state) => boxes.forEach((box) => { box.input.checked = state[row.key].includes(box.value); }));
        return group;
      }
      case "range": {
        const input = h("input", { id, type: "range", min: row.min, max: row.max, step: row.step });
        const output = h("output", { for: id });
        input.addEventListener("input", () => update(row, Number(input.value)));
        syncers.push((state) => {
          input.value = state[row.key];
          output.textContent = `${state[row.key]} ${row.unit}`;
        });
        return h("div", { class: "range" }, input, output);
      }
      case "color": {
        const input = h("input", { id, type: "color" });
        const hex = h("input", { type: "text", class: "hex", maxlength: 7, spellcheck: "false", "aria-label": `${row.label} (hex)` });
        input.addEventListener("input", () => update(row, input.value));
        hex.addEventListener("change", () => {
          const value = hex.value.trim().toLowerCase();
          if (/^#[0-9a-f]{6}$/.test(value)) update(row, value);
        });
        const swatches = (row.swatches || []).map((value) => h("button", {
          type: "button", class: "swatch", style: `--swatch:${value}`, title: value, "aria-label": `Use ${value}`,
          onclick: () => update(row, value),
        }));
        syncers.push((state) => {
          input.value = state[row.key];
          if (document.activeElement !== hex) hex.value = state[row.key];
          swatches.forEach((swatch) => swatch.setAttribute("aria-pressed", String(swatch.title === state[row.key])));
        });
        return h("div", { class: "color" }, input, hex, swatches.length ? h("div", { class: "swatches" }, swatches) : null);
      }
      case "text": {
        const input = h("input", { id, type: "text", placeholder: row.placeholder || "", maxlength: 40 });
        input.addEventListener("input", () => update(row, input.value));
        syncers.push((state) => { if (document.activeElement !== input) input.value = state[row.key]; });
        return input;
      }
      case "textarea": {
        const area = h("textarea", { id, rows: 5, spellcheck: "false", placeholder: row.placeholder || "" });
        area.addEventListener("input", () => update(row, area.value));
        syncers.push((state) => { if (document.activeElement !== area) area.value = state[row.key]; });
        const examples = row.examples ? h("div", { class: "examples" },
          h("span", {}, "Examples:"),
          row.examples.map(([label, css]) => h("button", {
            type: "button", class: "link",
            onclick: () => {
              const current = getState()[row.key].trim();
              update(row, current ? `${current}\n\n${css}` : css);
            },
          }, label))) : null;
        return h("div", { class: "textarea" }, area, examples);
      }
      case "toolbarList":
        return toolbarList();
      default:
        return h("span", {}, "?");
    }
  }

  function toolbarList() {
    const list = h("ol", { class: "toolbar-list", "aria-label": "Toolbar items" });
    const onlyOn = h("input", { type: "checkbox" });
    let dragIndex = null;

    const move = (from, to) => {
      const state = getState();
      if (to < 0 || to >= state.toolbar.length || from === to) return;
      const toolbar = [...state.toolbar];
      const [moved] = toolbar.splice(from, 1);
      toolbar.splice(to, 0, moved);
      setState({ ...state, toolbar });
    };

    const render = (state) => {
      const focused = document.activeElement?.closest?.(".toolbar-item")?.dataset.id;
      list.replaceChildren(...state.toolbar.map((entry, index) => {
        const info = TOOLBAR_ITEM_BY_ID[entry.id];
        const checkbox = h("input", { type: "checkbox", checked: entry.on, "aria-label": `Show ${info.label}` });
        checkbox.addEventListener("change", () => {
          const current = getState();
          setState({ ...current, toolbar: current.toolbar.map((it) => (it.id === entry.id ? { ...it, on: checkbox.checked } : it)) });
        });
        const li = h("li", {
          class: `toolbar-item${entry.on ? "" : " off"}`,
          draggable: "true",
          dataset: { id: entry.id, index: String(index) },
          hidden: onlyOn.checked && !entry.on,
        },
        h("span", { class: "grip", "aria-hidden": "true" }),
        checkbox,
        h("span", { class: "toolbar-label" }, info.label),
        info.kind !== "builtin" ? h("span", { class: `kind kind-${info.kind}` }, info.kind) : null,
        h("code", { class: "toolbar-type" }, info.kind === "custom" ? "custom" : entry.id),
        h("span", { class: "move" },
          h("button", { type: "button", class: "icon-button", title: "Move up", "aria-label": `Move ${info.label} up`, onclick: () => move(index, index - 1) }, "↑"),
          h("button", { type: "button", class: "icon-button", title: "Move down", "aria-label": `Move ${info.label} down`, onclick: () => move(index, index + 1) }, "↓")));
        li.addEventListener("dragstart", (event) => {
          dragIndex = index;
          li.classList.add("dragging");
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", entry.id);
        });
        li.addEventListener("dragend", () => { li.classList.remove("dragging"); dragIndex = null; });
        li.addEventListener("dragover", (event) => {
          event.preventDefault();
          const rect = li.getBoundingClientRect();
          li.classList.toggle("drop-before", event.clientY < rect.top + rect.height / 2);
          li.classList.toggle("drop-after", event.clientY >= rect.top + rect.height / 2);
        });
        li.addEventListener("dragleave", () => li.classList.remove("drop-before", "drop-after"));
        li.addEventListener("drop", (event) => {
          event.preventDefault();
          const after = li.classList.contains("drop-after");
          li.classList.remove("drop-before", "drop-after");
          if (dragIndex === null) return;
          let target = index + (after ? 1 : 0);
          if (dragIndex < target) target -= 1;
          move(dragIndex, target);
        });
        return li;
      }));
      if (focused) list.querySelector(`[data-id="${CSS.escape(focused)}"] input`)?.focus();
    };

    let last = null;
    syncers.push((state) => {
      const key = JSON.stringify(state.toolbar) + onlyOn.checked;
      if (key === last) return;
      last = key;
      render(state);
    });
    onlyOn.addEventListener("change", () => { last = null; render(getState()); });

    const reset = h("button", {
      type: "button", class: "link",
      onclick: () => setState({ ...getState(), toolbar: DEFAULT_STATE.toolbar, annotateGroup: "default" }),
    }, "Reset to the SDK default");

    return h("div", { class: "toolbar-editor" },
      h("div", { class: "toolbar-tools" }, h("label", { class: "check" }, onlyOn, "Only items shown"), reset),
      list);
  }

  function rowNode(row) {
    if (row.type === "heading") {
      const node = h("div", { class: "row row-heading" }, h("div", { class: "subheading" }, row.label), row.hint ? h("p", { class: "hint" }, row.hint) : null);
      rows.push({ row: { ...row, api: "", key: "" }, node });
      return node;
    }
    const id = nextId("setting");
    const settingKey = row.key || row.item || row.type;
    const inline = ["toggle", "toolbarToggle"].includes(row.type);
    const label = h("label", { for: id, class: "row-label" }, row.label);
    const node = h("div", {
      class: `row row-${row.type}${inline ? " row-inline" : ""}`,
      dataset: { setting: settingKey },
    },
    h("div", { class: "row-head" }, label, chip(row), inline ? control(row, id) : null),
    inline ? null : control(row, id),
    apiLine(row),
    row.hint ? h("p", { class: "hint" }, row.hint) : null);
    rows.push({ row, node });
    syncers.push((state) => {
      node.hidden = row.visible ? !row.visible(state) : false;
    });
    return node;
  }

  const sections = SECTIONS.map((section) => {
    const details = h("details", { class: "section", dataset: { section: section.id }, open: ["document", "toolbar"].includes(section.id) },
      h("summary", {}, h("span", {}, section.title), h("span", { class: "count" }, String(section.rows.filter((row) => row.type !== "heading").length))),
      h("div", { class: "section-body" }, section.rows.map(rowNode)));
    return { section, details };
  });

  // Filter rows by label, API or key.
  filterInput.addEventListener("input", () => {
    const query = filterInput.value.trim().toLowerCase();
    const state = getState();
    rows.forEach(({ row, node }) => {
      const text = `${row.label} ${resolve(row.api, state)} ${row.key || row.item || ""}`.toLowerCase();
      node.classList.toggle("filtered-out", Boolean(query) && !text.includes(query));
    });
    sections.forEach(({ details }) => {
      const visible = details.querySelectorAll(".row:not(.filtered-out)").length;
      details.classList.toggle("filtered-out", Boolean(query) && !visible);
      if (query && visible) details.open = true;
    });
  });

  root.replaceChildren(
    presetsBlock,
    h("div", { class: "filter-bar" }, filterInput),
    h("div", { class: "sections" }, sections.map(({ details }) => details)),
  );

  return {
    sync(state, activePreset) {
      syncers.forEach((fn) => fn(state));
      presetButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset)));
    },
    setLocales(list) {
      locales = list;
    },
  };
}
