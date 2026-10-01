// Builds one achievement toast card. Shared by the real toasts (AchievementToast.astro)
// and the dev-only preview page, so both always look the same.

import { ACHIEVEMENTS, type Achievement } from "./achievements";
import { iconSvg } from "./achievement-icons";

export type Item = { a: Achievement; n: number };

const total = ACHIEVEMENTS.length;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function toastCard(items: Item[]) {
  const el = document.createElement("div");
  el.className = "toast";
  const last = items[items.length - 1];
  if (items.length >= 3) {
    // a pile of them at once: one toast, icons stacked
    el.classList.add("many");
    el.innerHTML = `
      <div class="stack">${items
        .slice(-3)
        .map(({ a }, i) => `<span class="tile" style="--i:${i}">${iconSvg(a.id, 32)}</span>`)
        .join("")}</div>
      <div class="text">
        <p class="eyebrow"><span>achievements unlocked ×${items.length}</span><span class="count">${last.n}/${total}</span></p>
        <p class="desc">${esc(items.map(({ a }) => a.name).join(" · "))}</p>
      </div>`;
  } else {
    const { a, n } = items[0];
    el.innerHTML = `
      <span class="tile">${iconSvg(a.id, 40)}</span>
      <div class="text">
        <p class="eyebrow"><span>achievement unlocked</span><span class="count">${n}/${total}</span></p>
        <p class="name">${esc(a.name)}</p>
        <p class="desc">${esc(a.desc)}</p>
        ${n === 1 ? `<p class="tip">type <b>achievements</b> in the terminal to see them all</p>` : ""}
      </div>`;
  }
  return el;
}
