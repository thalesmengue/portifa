// Small helpers to build terminal output. Commands return HTML strings.

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const span = (cls: string, html: string) => `<span class="${cls}">${html}</span>`;
export const dim = (html: string) => span("dim", html);
export const green = (html: string) => span("key", html);
export const yellow = (html: string) => span("yellow", html);

export function link(name: string, url: string) {
  const external = /^https?:/.test(url);
  return `<a href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ""}>${esc(name)}</a>`;
}

export const rows = (pairs: [string, string][], pad = 10) =>
  pairs.map(([k, v]) => `${dim(esc(k.padEnd(pad)))}${v}`).join("\n");

/** `left ........ right`, Laravel style. Both sides are plain text. */
export function dots(left: string, right: string, width: number, rightHtml = esc(right)) {
  const n = Math.max(2, width - left.length - right.length - 2);
  return `${esc(left)} ${dim(".".repeat(n))} ${rightHtml}`;
}

export const badge = (kind: "info" | "warn" | "error", text = kind.toUpperCase()) =>
  span(`badge ${kind}`, ` ${text} `);

export function toText(html: string) {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent ?? "";
}
