// What `curl thaleslab.xyz` returns: the middleware serves this to CLI user agents.

import { site, shell, stack, projects, contact } from "./data";
import { CAT } from "./terminal/content";
import { getNotes } from "./notes";

const ESC = "\x1b[";
const c = (code: string) => (s: string) => `${ESC}${code}m${s}${ESC}0m`;
const green = c("1;32");
const cyan = c("1;36");
const dim = c("2");
const bold = c("1");

const WIDTH = 76;

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return line ? [...lines, line] : lines;
}

export async function curlPage() {
  const site_ = `https://${site.domain}`;
  const id = `${shell.user}@${shell.host}`;

  const info = [
    `${green(shell.user)}@${green(shell.host)}`,
    dim("-".repeat(id.length)),
    ...[
      ["name", site.name.toLowerCase()],
      ["role", site.role],
      ["stack", stack.main.join(", ")],
      ["also", stack.also.join(", ")],
      ["shell", "zsh"],
      ["locale", "pt-BR"],
    ].map(([k, v]) => `${green(k)}${dim(":")} ${v}`),
    "",
    [41, 42, 43, 44, 45, 46, 47].map((n) => `${ESC}${n}m   ${ESC}0m`).join(""),
  ];

  const artWidth = Math.max(...CAT.map((l) => l.length)) + 4;
  const rows = Math.max(CAT.length, info.length);
  const fetch = Array.from({ length: rows }, (_, i) => {
    const art = (CAT[i] ?? "").padEnd(artWidth);
    return `  ${green(art)}${info[i] ?? ""}`;
  });

  const section = (title: string) => ["", `  ${cyan(title)}`];
  const notes = await getNotes();

  const lines = [
    "",
    ...fetch,
    ...section("about"),
    ...wrap(site.about, WIDTH - 4).map((l) => `  ${l}`),
    ...section("projects"),
    ...projects.map((p) => `  ${bold(p.name.padEnd(14))}${p.desc.padEnd(22)}${dim(p.url)}`),
    ...section("notes"),
    ...(notes.length
      ? notes.map((n) => `  ${n.data.title.padEnd(36)}${dim(`${site_}/notes/${n.id}/`)}`)
      : [`  ${dim("nothing yet.")}`]),
    ...section("contact"),
    ...contact.map((l) => `  ${bold(l.name.padEnd(14))}${l.url.replace(/^mailto:/, "")}`),
    "",
    `  ${dim(`there's a cat game and a working terminal at ${site_}. open it in a browser.`)}`,
    "",
  ];

  return lines.join("\n");
}
