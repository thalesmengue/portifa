// Terminal color themes, applied as CSS custom properties on the terminal card.

type Theme = Record<string, string>;

export const THEMES: Record<string, Theme | null> = {
  default: null,
  gruvbox: {
    "--dark": "#282828",
    "--on-dark": "#ebdbb2",
    "--on-dark-muted": "#928374",
    "--on-dark-line": "#3c3836",
    "--term-bar": "#1d2021",
    "--t-green": "#b8bb26",
    "--t-cyan": "#8ec07c",
  },
  dracula: {
    "--dark": "#282a36",
    "--on-dark": "#f8f8f2",
    "--on-dark-muted": "#6272a4",
    "--on-dark-line": "#44475a",
    "--term-bar": "#21222c",
    "--t-green": "#50fa7b",
    "--t-cyan": "#8be9fd",
  },
  nord: {
    "--dark": "#2e3440",
    "--on-dark": "#eceff4",
    "--on-dark-muted": "#7b88a1",
    "--on-dark-line": "#3b4252",
    "--term-bar": "#272c36",
    "--t-green": "#a3be8c",
    "--t-cyan": "#88c0d0",
  },
  catppuccin: {
    "--dark": "#1e1e2e",
    "--on-dark": "#cdd6f4",
    "--on-dark-muted": "#7f849c",
    "--on-dark-line": "#313244",
    "--term-bar": "#181825",
    "--t-green": "#a6e3a1",
    "--t-cyan": "#89dceb",
  },
};

const STORAGE_KEY = "terminal:theme";
const VARS = Object.keys(THEMES.gruvbox!);

export function applyTheme(el: HTMLElement, name: string) {
  const theme = THEMES[name];
  for (const v of VARS) el.style.removeProperty(v);
  if (theme) for (const [k, v] of Object.entries(theme)) el.style.setProperty(k, v);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {}
}

export function savedTheme() {
  try {
    const name = localStorage.getItem(STORAGE_KEY);
    return name && name in THEMES ? name : "default";
  } catch {
    return "default";
  }
}
