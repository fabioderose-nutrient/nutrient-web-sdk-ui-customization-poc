// Minimal syntax highlighting for the generated code (JavaScript, HTML, CSS).

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const JS_RULES = [
  ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
  ["string", /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`/y],
  ["number", /\b\d+(?:\.\d+)?\b/y],
  ["keyword", /\b(?:const|let|var|function|return|await|async|new|if|else|import|from|export|null|true|false|undefined|typeof|instanceof)\b/y],
  ["sdk", /\bNutrientViewer\b|\binstance\b/y],
  ["prop", /\b[A-Za-z_$][\w$]*(?=\s*:(?!:))/y],
  ["call", /\b[A-Za-z_$][\w$]*(?=\s*\()/y],
  ["plain", /[A-Za-z_$][\w$]*|\s+|./y],
];

const CSS_RULES = [
  ["comment", /\/\*[\s\S]*?\*\//y],
  ["string", /"[^"]*"|'[^']*'/y],
  ["prop", /[a-z-]+(?=\s*:)/y],
  ["selector", /[.#]?[A-Za-z][\w-]*(?=[^{}]*\{)/y],
  ["number", /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%)?/y],
  ["plain", /\s+|./y],
];

const HTML_RULES = [
  ["comment", /<!--[\s\S]*?-->/y],
  ["keyword", /<\/?[a-zA-Z][\w-]*|\/?>|<!doctype html>/iy],
  ["string", /"[^"]*"/y],
  ["prop", /\b[a-z-]+(?==)/y],
  ["plain", /[^<"=]+|./y],
];

function tokenize(code, rules) {
  let out = "";
  let index = 0;
  while (index < code.length) {
    for (const [type, regex] of rules) {
      regex.lastIndex = index;
      const match = regex.exec(code);
      if (!match || !match[0]) continue;
      const text = escape(match[0]);
      out += type === "plain" ? text : `<span class="tok-${type}">${text}</span>`;
      index += match[0].length;
      break;
    }
  }
  return out;
}

export function highlight(code, language) {
  if (language === "css") return tokenize(code, CSS_RULES);
  if (language === "html") {
    // Highlight inline <style> blocks as CSS.
    return code.split(/(<style>[\s\S]*?<\/style>)/).map((part) => {
      const style = /^<style>([\s\S]*)<\/style>$/.exec(part);
      return style
        ? `${tokenize("<style>", HTML_RULES)}${tokenize(style[1], CSS_RULES)}${tokenize("</style>", HTML_RULES)}`
        : tokenize(part, HTML_RULES);
    }).join("");
  }
  return tokenize(code, JS_RULES);
}
