// Wires the terminal UI: input modes, history, completion, pipes and the intro.

import { site, shell as sh, stack } from "../data";
import { ALIASES, ARTISAN, PATH_COMMANDS, createCommands, type Io, type State } from "./commands";
import { CAT } from "./content";
import { HOME, basename, buildFs, lookup, resolve, type NoteRef } from "./fs";
import { dim, esc, span, toText } from "./html";
import { startMatrix } from "./matrix";
import { THEMES, applyTheme, savedTheme } from "./themes";

type Mode = "normal" | "password" | "vim" | "search";

function splitPipes(line: string) {
  const stages: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === "|") {
      stages.push(cur);
      cur = "";
    } else cur += ch;
  }
  stages.push(cur);
  return stages;
}

function tokenize(s: string) {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let quoted = false;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      quoted = true;
    } else if (/\s/.test(ch)) {
      if (cur || quoted) out.push(cur);
      cur = "";
      quoted = false;
    } else cur += ch;
  }
  if (cur || quoted) out.push(cur);
  return out;
}

function expandAlias(stage: string) {
  const t = stage.trim();
  const [first, ...rest] = t.split(/\s+/);
  return ALIASES[first] ? [ALIASES[first], ...rest].join(" ") : t;
}

const commonPrefix = (list: string[]) =>
  list.reduce((acc, s) => {
    let i = 0;
    while (i < acc.length && acc[i] === s[i]) i++;
    return acc.slice(0, i);
  });

export function mountShell(root: HTMLElement) {
  const notes: NoteRef[] = JSON.parse(root.dataset.notes ?? "[]");
  const fsRoot = buildFs(notes);

  const screen = root.querySelector<HTMLElement>(".screen")!;
  const output = root.querySelector<HTMLElement>(".output")!;
  const form = root.querySelector<HTMLFormElement>(".prompt")!;
  const label = root.querySelector<HTMLElement>(".ps1-label")!;
  const input = root.querySelector<HTMLInputElement>(".cmd")!;
  const hint = root.querySelector<HTMLElement>(".hint")!;
  const clock = root.querySelector<HTMLElement>(".clock")!;

  const state: State = { cwd: HOME, prevCwd: HOME, history: [], startedAt: Date.now() };
  let mode: Mode = "normal";
  let busy = true;
  let cursor = 0;
  let themeName = savedTheme();
  applyTheme(root, themeName);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced ? 0 : ms));

  // --- output ---------------------------------------------------------------

  const scroll = () => (screen.scrollTop = screen.scrollHeight);

  function print(html: string, cls = "") {
    const line = document.createElement("div");
    if (cls) line.className = cls;
    line.innerHTML = html;
    output.appendChild(line);
    scroll();
    return line;
  }

  async function stream(lines: string[], delay: number) {
    for (const l of lines) {
      print(l || " ");
      if (delay) await sleep(delay);
    }
  }

  const dirLabel = () => (state.cwd === HOME ? "~" : basename(state.cwd));
  const ps1 = () => `<span class="ps1"><span class="arrow">➜</span>  <span class="dir">${esc(dirLabel())}</span></span>`;
  const promptLine = (cmd: string) => `${ps1()} ${esc(cmd)}`;
  const updatePrompt = () => (label.innerHTML = ps1());

  let charWidth = 0;
  function cols() {
    if (!charWidth) {
      const probe = print(span("dim", "0".repeat(20)));
      charWidth = (probe.firstElementChild as HTMLElement).getBoundingClientRect().width / 20 || 7.2;
      probe.remove();
    }
    return Math.floor((screen.clientWidth - 36) / charWidth);
  }

  async function printFetch() {
    const id = `${sh.user}@${sh.host}`;
    const info = [
      `<span class="key">${esc(sh.user)}</span>@<span class="key">${esc(sh.host)}</span>`,
      dim("-".repeat(id.length)),
      ...[
        ["name", site.name.toLowerCase()],
        ["role", site.role],
        ["stack", stack.main.join(", ")],
        ["also", stack.also.join(", ")],
        ["shell", "zsh"],
        ["locale", "pt-BR"],
      ].map(([k, v]) => `<span class="row"><span class="key">${k}${dim(":")}</span><span>${esc(v)}</span></span>`),
      "",
      Array.from({ length: 8 }, (_, i) => `<i class="swatch c${i}"></i>`).join(""),
    ];
    const block = print(`<pre class="art">${esc(CAT.join("\n"))}</pre><div class="info"></div>`, "fetch");
    const box = block.querySelector(".info")!;
    for (const l of info) {
      const row = document.createElement("div");
      row.innerHTML = l || " ";
      box.appendChild(row);
      scroll();
      await sleep(45);
    }
  }

  // --- modes: password ----------------------------------------------------

  let pendingPassword: ((v: string | null) => void) | null = null;

  function askPassword(text: string) {
    return new Promise<string | null>((resolvePw) => {
      mode = "password";
      label.textContent = text;
      input.type = "password";
      input.value = "";
      form.classList.remove("waiting");
      pendingPassword = resolvePw;
    });
  }

  function finishPassword(value: string | null) {
    print(esc(label.textContent ?? "") + (value === null ? "^C" : ""));
    input.type = "text";
    input.value = "";
    mode = "normal";
    form.classList.add("waiting");
    updatePrompt();
    pendingPassword?.(value);
    pendingPassword = null;
  }

  // --- modes: vim ---------------------------------------------------------

  let vimSaved = "";
  let vimFails = 0;

  function openVim(name: string, content: string | null) {
    vimSaved = output.innerHTML;
    vimFails = 0;
    mode = "vim";
    const lines = content === null ? [] : content.split("\n");
    const info = content === null ? `"${name}" [New]` : `"${name}" ${lines.length}L, ${content.length}B`;
    output.innerHTML = `<div class="vim"><div class="vim-buf">${lines.map(esc).join("\n")}</div><div class="vim-status">${esc(info)}</div></div>`;

    // fill the free space with tildes, measured after wrapping so nothing overflows
    const css = getComputedStyle(screen);
    const lineH = parseFloat(css.lineHeight) || 20;
    const padding = parseFloat(css.paddingTop) + parseFloat(css.paddingBottom);
    const free = screen.clientHeight - padding - output.offsetHeight - form.offsetHeight;
    const tildes = Math.max(0, Math.floor(free / lineH));
    const buf = output.querySelector(".vim-buf")!;
    buf.innerHTML += (lines.length ? "\n" : "") + Array(tildes).fill(span("vim-tilde", "~")).join("\n");
    label.textContent = "";
    input.value = "";
    root.classList.add("in-vim");
    screen.scrollTop = 0;
  }

  const vimStatus = (html: string) => (output.querySelector(".vim-status")!.innerHTML = html);

  function exitVim() {
    output.innerHTML = vimSaved;
    mode = "normal";
    root.classList.remove("in-vim");
    updatePrompt();
    print(dim("you escaped vim. most people never do."));
  }

  function handleVim(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (/^:(q|q!|wq|wq!|x|qa|qa!)$/.test(v) || v === "ZZ") return exitVim();
    vimFails++;
    const err = v.startsWith(":")
      ? `E492: Not an editor command: ${esc(v.slice(1))}`
      : "E21: Cannot make changes, 'modifiable' is off";
    vimStatus(span("vim-err", err) + (vimFails >= 3 ? dim("   hint: type :q and press enter") : ""));
  }

  // --- modes: reverse search ----------------------------------------------

  let search = { index: -1, match: "" };

  function findMatch(query: string, from: number) {
    if (!query) return -1;
    for (let i = from - 1; i >= 0; i--) if (state.history[i].includes(query)) return i;
    return -1;
  }

  function renderSearch() {
    search.match = search.index >= 0 ? state.history[search.index] : "";
    hint.innerHTML = `': ${esc(search.match)}`;
    input.style.width = `${Math.max(1, input.value.length) + 0.5}ch`;
  }

  function enterSearch() {
    mode = "search";
    search = { index: -1, match: "" };
    label.textContent = "(reverse-i-search)`";
    input.value = "";
    root.classList.add("searching");
    renderSearch();
  }

  function exitSearch(keep: boolean) {
    mode = "normal";
    root.classList.remove("searching");
    input.style.width = "";
    hint.textContent = "";
    updatePrompt();
    input.value = keep ? search.match : "";
  }

  // --- running commands ---------------------------------------------------

  const io: Io = {
    print: (html) => void print(html),
    sleep,
    clear: () => (output.innerHTML = ""),
    cols,
    printFetch,
    askPassword,
    openVim,
    setTheme: (name) => {
      themeName = name;
      applyTheme(root, name);
    },
    theme: () => themeName,
    play: () => document.dispatchEvent(new CustomEvent("cat:play")),
    matrix: () => void screensaver(),
  };

  const commands = createCommands(fsRoot, notes, state, io);

  async function run(line: string) {
    print(promptLine(line));
    if (!line.trim()) return;

    state.history.push(line);
    cursor = state.history.length;

    const stages = splitPipes(line).map((s) => tokenize(expandAlias(s)));
    // which commands visitors actually use (just the name, nothing they typed after it)
    const first = stages[0]?.[0] ?? "";
    window.umami?.track("terminal", { command: first in commands ? first : "unknown" });
    let stdin: string | undefined;
    let out: string | null = null;
    for (const [name, ...args] of stages) {
      if (!name) return void print("zsh: parse error near `|'");
      const cmd = commands[name];
      if (!cmd) return void print(`zsh: command not found: ${esc(name)}`);
      out = await cmd(args, stdin);
      stdin = out === null ? "" : toText(out);
    }
    if (out) {
      const lines = out.split("\n");
      await stream(lines, lines.length > 30 ? 0 : 14);
    }
  }

  function setBusy(v: boolean) {
    busy = v;
    form.classList.toggle("waiting", v);
  }

  async function exec(line: string) {
    if (busy || mode !== "normal") return;
    input.value = "";
    setBusy(true);
    await run(line);
    setBusy(false);
    if (mode === "normal") updatePrompt();
    scroll();
  }

  // --- completion ---------------------------------------------------------

  function complete() {
    const value = input.value;
    const tokens = value.split(/\s+/);
    const [cmd] = tokens;
    let candidates: string[] = [];
    let prefix = tokens[tokens.length - 1];
    let base = "";

    if (tokens.length === 1) {
      candidates = [...Object.keys(commands), ...Object.keys(ALIASES)].filter((c) => c.startsWith(prefix));
    } else if (cmd === "php" && tokens.length === 2) {
      candidates = ["artisan"].filter((c) => c.startsWith(prefix));
    } else if ((cmd === "php" && tokens[1] === "artisan" && tokens.length === 3) || (cmd === "art" && tokens.length === 2)) {
      candidates = ARTISAN.filter((c) => c.startsWith(prefix));
    } else if (cmd === "theme" && tokens.length === 2) {
      candidates = Object.keys(THEMES).filter((c) => c.startsWith(prefix));
    } else if (PATH_COMMANDS.includes(cmd)) {
      const slash = prefix.lastIndexOf("/");
      base = slash >= 0 ? prefix.slice(0, slash + 1) : "";
      prefix = prefix.slice(slash + 1);
      const node = lookup(fsRoot, resolve(state.cwd, base || "."));
      if (node && node !== "denied" && node.type === "dir" && !node.locked) {
        candidates = Object.entries(node.children)
          .filter(([n]) => n.startsWith(prefix) && (prefix.startsWith(".") || !n.startsWith(".")))
          .map(([n, c]) => (c.type === "dir" ? `${n}/` : n));
      }
    }

    candidates = [...new Set(candidates)].sort();
    if (!candidates.length) return;

    const lead = tokens.length > 1 ? `${tokens.slice(0, -1).join(" ")} ` : "";
    if (candidates.length === 1) {
      const c = candidates[0];
      input.value = lead + base + c + (c.endsWith("/") ? "" : " ");
      return;
    }
    const common = commonPrefix(candidates);
    if (common.length > prefix.length) {
      input.value = lead + base + common;
      return;
    }
    print(promptLine(value));
    print(candidates.map((c) => (c.endsWith("/") ? span("ls-dir", esc(c)) : esc(c))).join("  "));
  }

  // --- keyboard -----------------------------------------------------------

  function ctrlC() {
    if (mode === "password") return finishPassword(null);
    if (mode === "vim") return void vimStatus("Type  :qa!  and press &lt;Enter&gt; to abandon all changes and exit Vim");
    if (mode === "search") exitSearch(false);
    print(`${promptLine(input.value)}^C`);
    input.value = "";
  }

  input.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "c" && !window.getSelection()?.toString()) {
      e.preventDefault();
      return ctrlC();
    }

    if (mode === "search") {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        const i = findMatch(input.value, search.index);
        if (i >= 0) search.index = i;
        renderSearch();
      } else if (e.key === "Escape" || (e.ctrlKey && e.key === "g") || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        exitSearch(e.key !== "g");
      }
      return;
    }

    if (mode === "vim") {
      if (e.key === "Escape") input.value = "";
      return;
    }

    if (mode !== "normal") return;

    if (e.key === "ArrowUp" && cursor > 0) {
      input.value = state.history[--cursor];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      cursor = Math.min(cursor + 1, state.history.length);
      input.value = state.history[cursor] ?? "";
      e.preventDefault();
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      output.innerHTML = "";
    } else if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      enterSearch();
    }
  });

  input.addEventListener("input", () => {
    if (mode !== "search") return;
    search.index = findMatch(input.value, state.history.length);
    renderSearch();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value;
    if (mode === "password") return finishPassword(value);
    if (mode === "vim") {
      input.value = "";
      return handleVim(value);
    }
    if (mode === "search") {
      const match = search.match;
      exitSearch(false);
      return void (match ? exec(match) : print(promptLine("")));
    }
    exec(value);
  });

  screen.addEventListener("click", () => {
    if (!busy && !window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-run]").forEach((b) =>
    b.addEventListener("click", () => exec(b.dataset.run!)),
  );

  const tickClock = () => {
    clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };
  tickClock();
  setInterval(tickClock, 15_000);

  // --- screensaver --------------------------------------------------------

  const IDLE_MS = 60_000;
  let lastActivity = Date.now();
  let saverOn = false;
  let visible = false;

  function screensaver() {
    if (saverOn || reduced) return;
    saverOn = true;
    startMatrix(root, screen, () => {
      saverOn = false;
      lastActivity = Date.now();
    });
  }

  for (const ev of ["keydown", "pointermove", "pointerdown", "wheel", "touchstart", "scroll"]) {
    window.addEventListener(ev, () => (lastActivity = Date.now()), { passive: true, capture: true });
  }
  new IntersectionObserver(([e]) => (visible = e.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] }).observe(root);
  setInterval(() => {
    const idle = Date.now() - lastActivity > IDLE_MS;
    if (idle && visible && !busy && mode === "normal" && document.visibilityState === "visible") screensaver();
  }, 5000);

  // --- events from the rest of the page -----------------------------------

  document.addEventListener("konami", () => {
    if (busy || mode !== "normal") return;
    input.value = "";
    print(`${span("key", "achievement unlocked:")} you know the code. ${dim("zoomies mode on in the game.")}`);
  });

  // --- links to notes: type `cd` first, then navigate ----------------------

  document.addEventListener("click", async (e) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='/notes/']");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (busy || mode !== "normal" || reduced || !visible) return;
    e.preventDefault();
    setBusy(true);
    await typeCommand(`cd ${a.pathname.replace(/^\/|\/$/g, "")}`, { wait: 80, pace: 18, after: 180 });
    location.assign(a.href);
  });

  // --- intro --------------------------------------------------------------

  async function typeCommand(text: string, { wait = 500, pace = 60, after = 300 } = {}) {
    const line = print(`${ps1()} <span class="typed"></span><span class="caret"></span>`);
    const typed = line.querySelector(".typed")!;
    await sleep(wait);
    for (const ch of text) {
      typed.textContent += ch;
      await sleep(pace + Math.random() * pace);
    }
    await sleep(after);
    line.querySelector(".caret")?.remove();
  }

  (async () => {
    updatePrompt();
    await document.fonts?.ready;
    await typeCommand("fastfetch");
    await printFetch();
    await sleep(120);
    setBusy(false);
  })();
}
