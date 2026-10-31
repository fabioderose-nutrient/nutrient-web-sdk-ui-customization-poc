// A small value tree that can be turned into JavaScript source code AND into the
// runtime value the playground passes to the SDK. Building every load option and
// every API call from one tree guarantees that the generated code is exactly what
// the playground runs.
//
// Plain JSON values (strings, numbers, booleans, null, arrays, objects) print as
// literals. Special nodes:
//   expr(code, resolve)   any expression; resolve(ctx) returns its runtime value
//   ref(name)             a constant defined in the generated snippets (see snippets.js)
//   construct(ctor, arg)  `new NutrientViewer.X(arg)`
//   spread(path)          `...NutrientViewer.x.y` inside an array or (as SPREAD key) an object

export const SPREAD = Symbol("spread");

export const expr = (code, resolve) => ({ $node: "expr", code, resolve });
export const ref = (name) => ({ $node: "ref", name });
export const construct = (ctor, arg) => ({ $node: "new", ctor, arg });
export const spread = (path) => ({ $node: "spread", path });

// NutrientViewer.Theme.DARK and similar enum members.
export const sdkEnum = (enumName, member) => expr(
  `NutrientViewer.${enumName}.${member}`,
  ({ NutrientViewer }) => NutrientViewer[enumName][member],
);

export function color(hex) {
  const value = parseInt(hex.slice(1), 16);
  const rgb = { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
  return construct("NutrientViewer.Color", rgb);
}

function resolvePath(path, ctx) {
  return path.split(".").reduce((value, key) => value?.[key], { NutrientViewer: ctx.NutrientViewer });
}

export function materialize(node, ctx) {
  if (Array.isArray(node)) {
    return node.flatMap((item) => (item?.$node === "spread"
      ? [...resolvePath(item.path, ctx)]
      : [materialize(item, ctx)]));
  }
  if (node && typeof node === "object") {
    switch (node.$node) {
      case "expr": return node.resolve(ctx);
      case "ref": {
        if (!(node.name in ctx.sandbox)) throw new Error(`Unknown snippet: ${node.name}`);
        return ctx.sandbox[node.name];
      }
      case "new": {
        const Ctor = resolvePath(node.ctor, ctx);
        return new Ctor(materialize(node.arg, ctx));
      }
      default: {
        const out = node[SPREAD] ? { ...resolvePath(node[SPREAD], ctx) } : {};
        for (const [key, value] of Object.entries(node)) out[key] = materialize(value, ctx);
        return out;
      }
    }
  }
  return node;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const printKey = (key) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

// "NutrientViewer.defaultAnnotationPresets.text-highlighter"
//   -> NutrientViewer.defaultAnnotationPresets["text-highlighter"]
export function accessor(path) {
  const [first, ...rest] = path.split(".");
  return first + rest.map((key) => (IDENTIFIER.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`)).join("");
}

export function print(node, indent = 0, width = 78) {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);

  if (node === undefined) return "undefined";
  if (node === null || typeof node !== "object") return JSON.stringify(node);

  if (Array.isArray(node)) {
    if (!node.length) return "[]";
    const items = node.map((item) => print(item, indent + 1, width));
    const flat = `[${items.join(", ")}]`;
    if (flat.length + pad.length <= width && !flat.includes("\n")) return flat;
    return `[\n${items.map((item) => `${inner}${item},`).join("\n")}\n${pad}]`;
  }

  switch (node.$node) {
    case "expr": return node.code;
    case "ref": return node.name;
    case "spread": return `...${accessor(node.path)}`;
    case "new": return `new ${node.ctor}(${print(node.arg, indent, width)})`;
    default: {
      const entries = [];
      if (node[SPREAD]) entries.push(`...${accessor(node[SPREAD])}`);
      for (const [key, value] of Object.entries(node)) {
        if (value === undefined) continue;
        if (value?.$node === "ref" && value.name === key) {
          entries.push(key);
          continue;
        }
        entries.push(`${printKey(key)}: ${print(value, indent + 1, width)}`);
      }
      if (!entries.length) return "{}";
      const flat = `{ ${entries.join(", ")} }`;
      if (flat.length + pad.length <= width && !flat.includes("\n")) return flat;
      return `{\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${pad}}`;
    }
  }
}
