// Achievements, kept in this browser only. Anything on the site can unlock one; a toast
// announces it (src/components/AchievementToast.astro) and `achievements` lists them.

import { nowPlaying } from "./now-playing";

export type Achievement = {
  id: string;
  name: string;
  desc: string;
  secret?: boolean; // shown as ??? until unlocked
  goal?: { counter: string; n: number };
};

export const ACHIEVEMENTS: Achievement[] = [
  // terminal
  { id: "curious", name: "rtfm", desc: "ran help" },
  { id: "pipe", name: "plumber", desc: "piped one command into another" },
  { id: "search", name: "time traveler", desc: "reran an old command with ctrl+r" },
  { id: "vim", name: "vim survivor", desc: "escaped vim" },
  { id: "theme", name: "ricer", desc: "changed the terminal theme" },
  { id: "pets", name: "cat person", desc: "petted lua 10 times", goal: { counter: "pets", n: 10 } },
  { id: "follow", name: "shadow", desc: "let lua follow you around" },
  { id: "sudo", name: "not in sudoers", desc: "tried sudo 3 times", secret: true, goal: { counter: "sudo", n: 3 } },
  { id: "rm", name: "bold move", desc: "tried rm -rf /", secret: true },
  { id: "afk", name: "afk", desc: "let the screensaver run", secret: true },
  // pages
  { id: "reader", name: "reader", desc: "read a note" },
  { id: "teapot", name: "i'm a teapot", desc: "found /coffee", secret: true },
  { id: "lost", name: "lost", desc: "wandered into a 404", secret: true },
  // game
  { id: "run", name: "first steps", desc: "finished a run" },
  { id: "score", name: "four digits", desc: "scored 1000 in one run" },
  { id: "fish", name: "fishmonger", desc: "caught 100 fish", goal: { counter: "fish", n: 100 } },
  { id: "pigeons", name: "pigeon dodger", desc: "ducked 10 pigeons in one run" },
  { id: "night", name: "night owl", desc: "played after midnight in são paulo", secret: true },
  { id: "dj", name: "same playlist", desc: "played while thales was on spotify", secret: true },
  { id: "konami", name: "↑↑↓↓←→←→ba", desc: "knew the code", secret: true },
];

const KEY = "achievements";
type Saved = { unlocked: Record<string, number>; counters: Record<string, number> };

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "");
    return { unlocked: s.unlocked ?? {}, counters: s.counters ?? {} };
  } catch {
    return { unlocked: {}, counters: {} };
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export const progress = () => load();

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function unlock(id: string) {
  const s = load();
  if (s.unlocked[id] || !ACHIEVEMENTS.some((a) => a.id === id)) return;
  s.unlocked[id] = Date.now();
  save(s);
  window.umami?.track("achievement", { id });
  document.dispatchEvent(new CustomEvent("achievement", { detail: id }));
}

export function bump(counter: string, by = 1) {
  if (by <= 0) return;
  const s = load();
  const total = (s.counters[counter] ?? 0) + by;
  s.counters[counter] = total;
  save(s);
  for (const a of ACHIEVEMENTS) if (a.goal?.counter === counter && total >= a.goal.n) unlock(a.id);
}

// --- what the terminal reports --------------------------------------------

export function commandRan(stages: string[][]) {
  if (stages.length > 1) unlock("pipe");
  for (const [name, ...args] of stages) {
    if (name === "help") unlock("curious");
    if (name === "theme" && args.length) unlock("theme");
    if (name === "pet") bump("pets");
    if (name === "lua" && args.includes("--follow")) unlock("follow");
    if (name === "sudo" && args.length) bump("sudo");
    if (name === "rm" && args.some((a) => /^-\w*r/.test(a)) && args.some((a) => a === "/" || a === "/*")) unlock("rm");
  }
}

// --- the rest of the site ---------------------------------------------------

const spHour = () =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));

document.addEventListener("konami", () => unlock("konami"));

document.addEventListener("game:over", async (e) => {
  const { score, fish, pigeons } = (e as CustomEvent<{ score: number; fish: number; pigeons: number }>).detail;
  unlock("run");
  if (score >= 1000) unlock("score");
  if (pigeons >= 10) unlock("pigeons");
  bump("fish", fish);
  if (spHour() < 5) unlock("night");
  if ((await nowPlaying())?.playing) unlock("dj");
});
