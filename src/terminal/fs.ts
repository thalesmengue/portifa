// A tiny read-only virtual filesystem for the terminal.

import { site, shell, stack, projects, contact } from "../data";
import { CUCUMBER_LOG, MOTD, OS_RELEASE, ZSHRC } from "./content";
import { dim, esc, link, rows } from "./html";

export type FileNode = { type: "file"; read: () => string; exec?: boolean };
export type DirNode = { type: "dir"; children: Record<string, FsNode>; locked?: boolean };
export type FsNode = FileNode | DirNode;
export type NoteRef = { title: string; url: string; slug: string; description?: string };

export const HOME = `/home/${shell.user}`;

const file = (read: () => string, exec = false): FileNode => ({ type: "file", read, exec });
const dir = (children: Record<string, FsNode>, locked = false): DirNode => ({ type: "dir", children, locked });
const binary = () => file(() => "", true);

export function buildFs(notes: NoteRef[]): DirNode {
  const projectFiles = Object.fromEntries(
    projects.map((p) => [
      `${p.name}.md`,
      file(() => [`<b>${esc(p.name)}</b>`, dim(esc(p.desc)), "", link(p.url.replace(/^https?:\/\//, ""), p.url)].join("\n")),
    ]),
  );

  const noteFiles = Object.fromEntries(
    notes.map((n) => [
      `${n.slug}.md`,
      file(() =>
        [`<b>${esc(n.title)}</b>`, ...(n.description ? [dim(esc(n.description))] : []), "", `read it: ${link(n.url, n.url)}`].join(
          "\n",
        ),
      ),
    ]),
  );

  const home = dir({
    "about.txt": file(() => esc(site.about)),
    "stack.txt": file(() => rows([["main", esc(stack.main.join(", "))], ["also", esc(stack.also.join(", "))]], 6)),
    "contact.txt": file(() => rows(contact.map((c) => [c.name, link(c.url.replace(/^mailto:|^https?:\/\/(www\.)?/, ""), c.url)]))),
    projects: dir(projectFiles),
    notes: dir(noteFiles),
    ".zshrc": file(() => esc(ZSHRC)),
    ".cat_treats": file(() => "you found the treats. the cat likes you now."),
    ".ssh": dir({ id_ed25519: file(() => "") }, true),
  });

  return dir({
    bin: dir({ cat: binary(), ls: binary(), php: binary(), composer: binary(), zsh: binary() }),
    etc: dir({
      hostname: file(() => esc(shell.host)),
      motd: file(() => esc(MOTD)),
      "os-release": file(() => esc(OS_RELEASE)),
    }),
    home: dir({ [shell.user]: home }),
    root: dir({}, true),
    var: dir({ log: dir({ "cucumbers.log": file(() => esc(CUCUMBER_LOG)) }) }),
  });
}

/** Turns any path (relative, absolute, ~) into a normalized absolute path. */
export function resolve(cwd: string, path = "~") {
  let p = path.replace(/^~(?=\/|$)/, HOME);
  if (!p.startsWith("/")) p = `${cwd}/${p}`;
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return `/${parts.join("/")}`;
}

/** Finds a node; "denied" when the path goes through a locked directory. */
export function lookup(root: DirNode, abs: string): FsNode | "denied" | null {
  let node: FsNode = root;
  for (const seg of abs.split("/").filter(Boolean)) {
    if (node.type !== "dir") return null;
    if (node.locked) return "denied";
    const next: FsNode | undefined = node.children[seg];
    if (!next) return null;
    node = next;
  }
  return node;
}

export const display = (abs: string) =>
  abs === HOME ? "~" : abs.startsWith(`${HOME}/`) ? `~${abs.slice(HOME.length)}` : abs;

export const basename = (abs: string) => (abs === "/" ? "/" : abs.slice(abs.lastIndexOf("/") + 1));

export const owner = (abs: string) => (abs.startsWith(HOME) && !abs.includes("/.ssh") ? shell.user : "root");
