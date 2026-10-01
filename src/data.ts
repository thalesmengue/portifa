// All site content lives here.

export type Link = { name: string; url: string };
export type Project = Link & { desc: string };

export const site = {
  name: "Thales Machado",
  role: "software engineer",
  domain: "thaleslab.xyz",
  whoami: "thales machado — software engineer.",
  about:
    "Software engineer working mostly with PHP, Laravel and Livewire. " +
    "I also build with JavaScript, TypeScript and React Native, " +
    "and take care of the Linux servers it all runs on.",
};

export const shell = {
  user: "thalesmengue",
  host: "catlover",
};

export const stack = {
  main: ["php", "laravel", "livewire"],
  also: ["javascript", "typescript", "react native", "linux"],
};

export const projects: Project[] = [
  { name: "portifa", url: "https://github.com/thalesmengue/portifa", desc: "this site" },
];

export const contact: Link[] = [
  { name: "github", url: "https://github.com/thalesmengue" },
  { name: "linkedin", url: "https://www.linkedin.com/in/thales-machado-mengue" },
  { name: "email", url: "mailto:thalesmmachado@gmail.com" },
];

// "now" card — update whenever you feel like it.
export const now = {
  playing: { title: "Song title", artist: "Artist" },
  setup: [
    ["os", "windows + wsl2"],
    ["shell", "zsh"],
    ["editor", "?"],
    ["keyboard", "?"],
  ],
};
