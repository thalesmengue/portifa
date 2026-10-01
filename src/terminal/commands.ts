// Every command the terminal understands. Each returns HTML (or null when it printed itself).

import { site, shell, stack, projects, contact, now, lua } from "../data";
import { CAT, FORTUNES, LUA_FACES, PAST_HISTORY, QUOTES, SAYCAT } from "./content";
import { badge, dim, dots, esc, green, link, rows, span, toText, yellow } from "./html";
import {
  HOME,
  basename,
  display,
  lookup,
  owner,
  resolve,
  type DirNode,
  type FsNode,
  type NoteRef,
} from "./fs";
import { THEMES } from "./themes";
import { nowPlaying } from "../scripts/now-playing";
import { when } from "../track";
import { ACHIEVEMENTS, progress, reset } from "../scripts/achievements";

export type Io = {
  print(html: string): void;
  sleep(ms: number): Promise<void>;
  clear(): void;
  cols(): number;
  printFetch(): Promise<void>;
  askPassword(label: string): Promise<string | null>;
  openVim(name: string, content: string | null): void;
  setTheme(name: string): void;
  theme(): string;
  play(): void;
  matrix(): void;
};

export type State = { cwd: string; prevCwd: string; history: string[]; startedAt: number };

export type Cmd = (args: string[], stdin?: string) => string | null | Promise<string | null>;

// commands that take paths, used by tab completion
export const PATH_COMMANDS = ["cat", "cd", "ls", "tree", "vim", "vi", "head", "grep"];

export const ALIASES: Record<string, string> = {
  art: "php artisan",
  ll: "ls -la",
  la: "ls -a",
  vi: "vim",
  neofetch: "fastfetch",
  cls: "clear",
  meow: "echo meow",
};

export const ARTISAN = ["about", "inspire", "list", "serve", "down", "up", "cache:clear", "migrate", "migrate:fresh", "route:list"];

const DATE = (() => {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${String(d.getDate()).padStart(2)} ${d.toTimeString().slice(0, 5)}`;
})();

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

/** Puts a small ascii face next to a few lines of text. */
const beside = (face: string[], lines: string[], gap = 4) =>
  Array.from({ length: Math.max(face.length, lines.length) }, (_, i) =>
    esc((face[i] ?? "").padEnd(8 + gap)) + (lines[i] ?? ""),
  ).join("\n");

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    if (line && (line + " " + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function bubble(text: string, width: number) {
  const lines = wrap(text || "meow.", width);
  const w = Math.max(...lines.map((l) => l.length));
  const pad = (l: string) => l.padEnd(w);
  const out = [` ${"_".repeat(w + 2)}`];
  if (lines.length === 1) out.push(`< ${pad(lines[0])} >`);
  else
    lines.forEach((l, i) => {
      const [a, b] = i === 0 ? ["/", "\\"] : i === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
      out.push(`${a} ${pad(l)} ${b}`);
    });
  out.push(` ${"-".repeat(w + 2)}`);
  return [...out, ...SAYCAT].join("\n");
}

export function createCommands(root: DirNode, notes: NoteRef[], state: State, io: Io) {
  const width = () => Math.min(64, io.cols() - 2);

  const name = (n: string, node: FsNode) =>
    node.type === "dir" ? span("ls-dir", esc(n)) : node.exec ? span("ls-exec", esc(n)) : esc(n);

  function longLine(n: string, node: FsNode, abs: string) {
    const mode = node.type === "dir" ? (node.locked ? "drwx------" : "drwxr-xr-x") : node.exec ? "-rwxr-xr-x" : "-rw-r--r--";
    const size = node.type === "dir" ? 4096 : node.exec ? 14232 : toText(node.read()).length;
    return `${dim(mode)} ${owner(abs).padEnd(12)} ${String(size).padStart(5)} ${dim(DATE)} ${name(n, node)}`;
  }

  const sorted = (d: DirNode, all: boolean) =>
    Object.entries(d.children)
      .filter(([n]) => all || !n.startsWith("."))
      .sort(([a], [b]) => a.replace(/^\./, "").localeCompare(b.replace(/^\./, "")));

  /** Reads a file's text for grep/head/vim; returns an error string on failure. */
  function readText(cmd: string, path: string): { text: string } | { error: string } {
    const node = lookup(root, resolve(state.cwd, path));
    if (node === "denied") return { error: `${cmd}: ${esc(path)}: Permission denied` };
    if (!node) return { error: `${cmd}: ${esc(path)}: No such file or directory` };
    if (node.type === "dir") return { error: `${cmd}: ${esc(path)}: Is a directory` };
    return { text: toText(node.read()) };
  }

  function artisan(args: string[]): string | null {
    const [sub = "list"] = args;
    const w = width();
    switch (sub) {
      case "list":
        return [
          `Laravel Framework ${green("12.x")}`,
          "",
          yellow("Usage:"),
          "  command [options] [arguments]",
          "",
          yellow("Available commands:"),
          ...[
            ["about", "Display basic information about this engineer"],
            ["inspire", "Display an inspiring quote"],
            ["serve", "Serve the application"],
            [" cache", ""],
            ["cache:clear", "Flush the application cache"],
            [" migrate", ""],
            ["migrate:fresh", "Drop all tables and re-run all migrations"],
            [" route", ""],
            ["route:list", "List all registered routes"],
          ].map(([c, d]) => (d ? `  ${green(c.padEnd(15))}${esc(d)}` : yellow(c))),
        ].join("\n");
      case "about":
        return [
          "",
          `  ${green("Environment")} ${dim(".".repeat(Math.max(2, w - 14)))}`,
          ...[
            ["Application Name", site.domain],
            ["Engineer", site.name],
            ["Role", site.role],
            ["Timezone", "America/Sao_Paulo"],
            ["Locale", "pt-BR"],
            ["Debug Mode", "OFF"],
            ["Maintenance Mode", "OFF (the cat is awake)"],
          ].map(([k, v]) => `  ${dots(k, v, w - 2)}`),
          "",
          `  ${green("Stack")} ${dim(".".repeat(Math.max(2, w - 8)))}`,
          ...[
            ["Main", stack.main.join(", ")],
            ["Also", stack.also.join(", ")],
            ["Shell", "zsh + oh-my-zsh"],
          ].map(([k, v]) => `  ${dots(k, v, w - 2)}`),
        ].join("\n");
      case "inspire": {
        const [quote, author] = pick(QUOTES);
        return `\n  ${esc(`“ ${quote} ”`)}\n  ${dim(esc(`— ${author}`))}\n`;
      }
      case "route:list": {
        const routes: [string, string][] = [
          ["/", "home"],
          ["notes/{slug}", "notes.show"],
          ["coffee", "teapot"],
          ["api/now-playing", "spotify.now"],
        ];
        return [
          "",
          ...routes.map(([uri, n]) => `  ${span("t-cyan", "GET|HEAD")}   ${dots(uri, n, w - 13)}`),
          "",
          dim(`Showing [${routes.length}] routes`.padStart(w)),
        ].join("\n");
      }
      case "serve":
        return `\n  ${badge("info")} Server running on [${link(`https://${site.domain}`, `https://${site.domain}`)}].\n\n  ${dim("Press Ctrl+C to stop the server")}\n`;
      case "down":
        return `\n  ${badge("warn")} Maintenance mode denied. The cat is already asleep on the server.\n`;
      case "up":
        return `\n  ${badge("info")} Application is now live. (It always was.)\n`;
      case "cache:clear":
        return `\n  ${badge("info")} Application cache cleared successfully. The cat knocked it off the table.\n`;
      case "migrate":
      case "migrate:fresh":
        return [
          "",
          `  ${badge("warn")} Application In Production.`,
          "",
          `  ${green("Are you sure you want to run this command?")} (yes/no) [${yellow("no")}]`,
          "  ❯ no",
          "",
          `  ${badge("warn")} Command cancelled. The cat stepped on the 'n' key.`,
          "",
        ].join("\n");
      default:
        return `\n  ${badge("error")} Command "${esc(sub)}" is not defined.\n`;
    }
  }

  const commands: Record<string, Cmd> = {
    help: (args) => {
      const essentials = rows(
        [
          ["about", "a few words about me"],
          ["projects", "things i made"],
          ["notes", "things i wrote"],
          ["contact", "where to find me"],
          ["play", "start the cat game"],
          ["lua", "meet my cat"],
        ],
        10,
      );
      if (!args.includes("--all") && !args.includes("-a"))
        return [essentials, "", dim(`more in ${green("help --all")}. there are a few secrets too.`)].join("\n");
      return [
        essentials,
        "",
        rows(
          [
            ["stack, now", "what i use, what i'm listening to"],
            ["achievements", "what you've found so far"],
            ["ls, cd, cat", "look around (try ls -la)"],
            ["tree", "the whole filesystem"],
            ["fastfetch", "system info, kind of"],
            ["php artisan", "you know this one"],
            ["fortune", "pipe it: fortune | catsay"],
            ["theme", "change the colors"],
            ["curl", "curl thaleslab.xyz"],
          ],
          12,
        ),
        "",
        dim("tab completes, ↑↓ history, ctrl+r search, ctrl+l clear."),
      ].join("\n");
    },

    about: () => esc(site.about),
    stack: () => rows([["main", esc(stack.main.join(", "))], ["also", esc(stack.also.join(", "))]], 6),
    projects: () => projects.map((p) => `${link(p.name, p.url)}  ${dim(esc(p.desc))}`).join("\n"),
    notes: () => (notes.length ? notes.map((n) => link(n.title, n.url)).join("\n") : dim("no notes yet.")),
    now: async () => {
      const t = await nowPlaying();
      if (!t) return `${esc(now.playing.title)} ${dim(`· ${esc(now.playing.artist)}`)}`;
      return rows(
        [
          [t.playing ? "playing" : "last played", `${link(t.title, t.url)} ${dim("by")} ${esc(t.artist)}`],
          [t.playing ? "at" : "when", `${esc(when(t))} ${dim("· on spotify")}`],
        ],
        13,
      );
    },
    achievements: ([flag]) => {
      if (flag === "--reset") {
        reset();
        return dim("achievements reset. go find them again.");
      }
      const { unlocked, counters } = progress();
      const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
      const width = Math.max(...ACHIEVEMENTS.map((a) => a.name.length)) + 2;
      const lines = ACHIEVEMENTS.map((a) => {
        if (unlocked[a.id]) return `  ${green("✓")} ${esc(a.name.padEnd(width))}${dim(esc(a.desc))}`;
        if (a.secret) return dim(`  · ${"???".padEnd(width)}secret`);
        const goal = a.goal ? ` (${Math.min(counters[a.goal.counter] ?? 0, a.goal.n)}/${a.goal.n})` : "";
        return dim(`  · ${esc(a.name.padEnd(width))}${esc(a.desc)}${goal}`);
      });
      return [`${green("achievements")} ${dim(`${got}/${ACHIEVEMENTS.length}`)}`, "", ...lines].join("\n");
    },
    contact: () => rows(contact.map((c) => [c.name, link(c.url.replace(/^mailto:|^https?:\/\/(www\.)?/, ""), c.url)])),
    play: () => {
      io.play();
      return dim("game started. press space or tap the game to jump.");
    },
    fastfetch: async () => {
      await io.printFetch();
      return null;
    },

    // --- filesystem -----------------------------------------------------
    pwd: () => esc(state.cwd),
    cd: ([target = "~"]) => {
      const abs = target === "-" ? state.prevCwd : resolve(state.cwd, target);
      const node = lookup(root, abs);
      if (node === "denied" || (node?.type === "dir" && node.locked)) return `cd: permission denied: ${esc(target)}`;
      if (!node) return `cd: no such file or directory: ${esc(target)}`;
      if (node.type !== "dir") return `cd: not a directory: ${esc(target)}`;
      state.prevCwd = state.cwd;
      state.cwd = abs;
      return null;
    },
    ls: (args) => {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const all = flags.includes("a");
      const long = flags.includes("l");
      const target = args.find((a) => !a.startsWith("-")) ?? ".";
      const abs = resolve(state.cwd, target);
      const node = lookup(root, abs);
      if (node === "denied") return `ls: cannot open directory '${esc(target)}': Permission denied`;
      if (!node) return `ls: cannot access '${esc(target)}': No such file or directory`;
      if (node.type === "file") return long ? longLine(basename(abs), node, abs) : name(basename(abs), node);
      if (node.locked) return `ls: cannot open directory '${esc(target)}': Permission denied`;

      const entries: [string, FsNode, string][] = sorted(node, all).map(([n, c]) => [n, c, `${abs}/${n}`]);
      if (all) {
        const parent = resolve(abs, "..");
        entries.unshift([".", node, abs], ["..", lookup(root, parent) as FsNode, parent]);
      }
      if (!long) return entries.map(([n, c]) => name(n, c)).join("  ");
      return [`total ${entries.length * 4}`, ...entries.map(([n, c, p]) => longLine(n, c, p))].join("\n");
    },
    tree: (args) => {
      const all = args.includes("-a");
      const target = args.find((a) => !a.startsWith("-")) ?? ".";
      const abs = resolve(state.cwd, target);
      const node = lookup(root, abs);
      if (node === "denied") return `${esc(target)} [error opening dir]`;
      if (!node || node.type !== "dir") return `${esc(target)} [error opening dir]`;
      const lines = [span("ls-dir", esc(target === "." ? display(abs) : target))];
      let dirs = 0;
      let files = 0;
      const walk = (d: DirNode, prefix: string) => {
        const entries = sorted(d, all);
        entries.forEach(([n, c], i) => {
          const last = i === entries.length - 1;
          lines.push(dim(prefix + (last ? "└── " : "├── ")) + name(n, c));
          if (c.type === "dir") {
            dirs++;
            if (!c.locked) walk(c, prefix + (last ? "    " : "│   "));
          } else files++;
        });
      };
      walk(node, "");
      return [...lines, "", `${dirs} directories, ${files} files`].join("\n");
    },
    cat: (args, stdin) => {
      if (!args.length) return stdin !== undefined ? esc(stdin) : esc([...CAT, "", "      meow."].join("\n"));
      return args
        .map((path) => {
          const node = lookup(root, resolve(state.cwd, path));
          if (node === "denied") return `cat: ${esc(path)}: Permission denied`;
          if (!node) return `cat: ${esc(path)}: No such file or directory`;
          if (node.type === "dir") return `cat: ${esc(path)}: Is a directory`;
          if (node.exec) return `cat: ${esc(path)}: binary file. the cat refuses to read it.`;
          return node.read();
        })
        .join("\n");
    },
    head: (args, stdin) => {
      const i = args.indexOf("-n");
      const n = i >= 0 ? Number(args[i + 1]) || 10 : 10;
      const path = args.filter((_, j) => j !== i && j !== i + 1)[0];
      let text = stdin ?? "";
      if (path) {
        const r = readText("head", path);
        if ("error" in r) return r.error;
        text = r.text;
      }
      return esc(text.split("\n").slice(0, n).join("\n"));
    },
    grep: (args, stdin) => {
      const insensitive = args.includes("-i");
      const [pattern, path] = args.filter((a) => a !== "-i");
      if (!pattern) return "usage: grep [-i] pattern [file]";
      let text = stdin ?? "";
      if (path) {
        const r = readText("grep", path);
        if ("error" in r) return r.error;
        text = r.text;
      }
      const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), insensitive ? "gi" : "g");
      return text
        .split("\n")
        .filter((l) => l.match(re))
        .map((l) => {
          let out = "";
          let last = 0;
          for (const m of l.matchAll(re)) {
            out += esc(l.slice(last, m.index)) + span("match", esc(m[0]));
            last = m.index! + m[0].length;
          }
          return out + esc(l.slice(last));
        })
        .join("\n");
    },

    // --- shell stuff ----------------------------------------------------
    echo: (args) =>
      esc(
        args
          .join(" ")
          .replace(/\$(USER|HOME|SHELL|PWD|HOSTNAME)/g, (_, v: string) =>
            ({ USER: shell.user, HOME, SHELL: "/bin/zsh", PWD: state.cwd, HOSTNAME: shell.host })[v]!,
          ),
      ),
    whoami: () => esc(shell.user),
    hostname: () => esc(shell.host),
    uname: (args) => (args.includes("-a") ? `catOS ${esc(shell.host)} 6.8.0-meow #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` : "catOS"),
    uptime: () => {
      const min = Math.floor((Date.now() - state.startedAt) / 60000);
      const time = new Date().toTimeString().slice(0, 8);
      return ` ${time} up ${min} min, 1 user (you), load average: 0.00, 0.00, 0.00 ${dim("(it's a static site)")}`;
    },
    date: () => esc(new Date().toString()),
    history: () =>
      [...PAST_HISTORY, ...state.history].map((h, i) => `${dim(String(i + 1).padStart(5))}  ${esc(h)}`).join("\n"),
    clear: () => {
      io.clear();
      return null;
    },
    exit: () => "there is no escape.",
    logout: () => "there is no escape.",
    theme: ([t]) => {
      if (!t)
        return [
          ...Object.keys(THEMES).map((n) => `${n === io.theme() ? green("*") : " "} ${esc(n)}`),
          "",
          dim("usage: theme <name>"),
        ].join("\n");
      if (!(t in THEMES)) return `theme: unknown theme '${esc(t)}'. run ${green("theme")} to see the list.`;
      io.setTheme(t);
      return dim(`theme set to ${esc(t)}.`);
    },

    // --- lua ------------------------------------------------------------
    lua: (args) => {
      const touch = !matchMedia("(pointer: fine)").matches;
      if (args.includes("--follow")) {
        if (touch) return dim("lua only follows mouse cursors. on touch screens she stays in bed.");
        document.dispatchEvent(new CustomEvent("lua:follow", { detail: { on: true } }));
        return `${esc(lua.name)} is now following your cursor. ${dim("lua --stay to make her stop.")}`;
      }
      if (args.includes("--stay")) {
        document.dispatchEvent(new CustomEvent("lua:follow", { detail: { on: false } }));
        return dim(`${lua.name} went back to bed.`);
      }
      const following = store.get("lua:follow") === "1" && !touch;
      const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }));
      const status = following ? "following your cursor" : hour < 7 || hour >= 23 ? "asleep. it's late in brazil." : "napping somewhere warm";
      return [
        beside(LUA_FACES.idle, [
          green(esc(lua.name)),
          dim("-".repeat(lua.name.length)),
          `${green("breed")}${dim(":")} ${esc(lua.breed)}`,
          `${green("eyes")}${dim(":")} ${esc(lua.eyes)}`,
          `${green("job")}${dim(":")} ${esc(lua.job)}`,
          `${green("status")}${dim(":")} ${esc(status)}`,
          `${green("pets")}${dim(":")} ${Number(store.get("lua:pets")) || 0}`,
        ]),
        "",
        dim(`try: pet${touch ? "" : ", lua --follow"}`),
      ].join("\n");
    },
    pet: () => {
      const pets = (Number(store.get("lua:pets")) || 0) + 1;
      store.set("lua:pets", String(pets));
      document.dispatchEvent(new CustomEvent("lua:pet"));
      const r = Math.random();
      const [face, line] =
        r < 0.1
          ? [LUA_FACES.bite, "chomp. lua bit you. she still likes you, probably."]
          : r < 0.2
            ? [LUA_FACES.ignore, "lua is ignoring you. try again later."]
            : [LUA_FACES.purr, pick(["purr purr purr", "prrrrrrr", "purr... *slow blink*", "purr. she headbutts your hand."])];
      return [beside(face, ["", esc(line)]), "", dim(`lua has been petted ${pets} time${pets === 1 ? "" : "s"} in this browser.`)].join("\n");
    },
    cmatrix: () => {
      io.matrix();
      return null;
    },

    // --- fun ------------------------------------------------------------
    fortune: () => esc(pick(FORTUNES)),
    catsay: (args, stdin) => esc(bubble(args.length ? args.join(" ") : (stdin ?? "").trim(), Math.min(36, width() - 8))),
    sudo: async (args) => {
      if (!args.length) return "usage: sudo command";
      const password = await io.askPassword(`[sudo] password for ${shell.user}: `);
      if (password === null) return null;
      await io.sleep(900);
      return `${esc(shell.user)} is not in the sudoers file. This incident will be reported.\n${dim("(to the cat.)")}`;
    },
    vim: ([path]) => {
      if (!path) {
        io.openVim("[No Name]", null);
        return null;
      }
      const r = readText("vim", path);
      if ("error" in r && !r.error.endsWith("No such file or directory")) return r.error;
      io.openVim(path, "text" in r ? r.text : null);
      return null;
    },
    brew: ([what]) =>
      what === "coffee" ? commands.coffee([]) : `brew: this is linux. ${dim("try: brew coffee")}`,
    coffee: () =>
      [
        `${dim("HTTP/1.1")} 418 I'm a teapot`,
        "",
        "error: i'm a cat. i don't make coffee.",
        dim(`(the real thing lives at ${link("/coffee", "/coffee")})`),
      ].join("\n"),
    nano: () => "this is a vim household.",
    emacs: () => "this is a vim household.",
    rm: (args) =>
      args.includes("-rf") && args.some((a) => ["/", "~", "/*", "~/"].includes(a))
        ? "nice try. the cat is guarding the filesystem."
        : `rm: cannot remove '${esc(args.filter((a) => !a.startsWith("-"))[0] ?? "")}': Read-only file system`,

    // --- the stack ------------------------------------------------------
    php: (args) => {
      if (args[0] === "artisan") return artisan(args.slice(1));
      if (args[0] === "-v" || args[0] === "--version")
        return "PHP 8.4.0 (cli) (NTS)\nCopyright (c) The PHP Group\nZend Engine v4.4.0, with a cat on the keyboard";
      return `${dim("interactive mode is disabled here. try:")} php artisan`;
    },
    composer: async (args) => {
      const [sub, pkg] = args;
      if (sub !== "require" || !pkg) return `Composer ${green("2.8.0")}\n${dim("try:")} composer require thales/engineer`;
      if (!pkg.startsWith("thales/"))
        return `\n  ${badge("error")} Could not find a matching version of package ${esc(pkg)}.\n  ${dim("try:")} composer require thales/engineer\n`;
      const lines = [
        `${green("./composer.json")} has been updated`,
        `Running composer update ${esc(pkg)}`,
        "Loading composer repositories with package information",
        "Updating dependencies",
        "Lock file operations: 1 install, 0 updates, 0 removals",
        `  - Locking ${green(esc(pkg))} (${yellow("v1.0.0")})`,
        "Package operations: 1 install, 0 updates, 0 removals",
        `  - Installing ${green(esc(pkg))} (${yellow("v1.0.0")}): Extracting archive`,
        "Generating optimized autoload files",
        "",
        `${green("1 package suggests:")} let's talk → ${link("email", contact.find((c) => c.name === "email")?.url ?? "#")}`,
      ];
      for (const l of lines) {
        io.print(l || " ");
        await io.sleep(l.startsWith("Loading") || l.startsWith("Updating") ? 450 : 120);
      }
      return null;
    },
    curl: async (args) => {
      const host = args.find((a) => !a.startsWith("-"));
      if (!host) return `curl: try 'curl ${esc(site.domain)}'`;
      if (!host.includes(site.domain))
        return `curl: (6) Could not resolve host: ${esc(host)}\n${dim("(this terminal only knows one website.)")}`;
      await io.printFetch();
      return dim(`works in your real terminal too: curl ${site.domain}`);
    },
  };

  return commands;
}
