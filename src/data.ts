// All site content lives here.

export type Link = { name: string; url: string };
export type Project = Link & { desc: string };

export const site = {
  name: "Thales Machado",
  role: "software developer",
  whoami: "thales machado — software developer.",
  about: "I build web applications. I like simple software and quiet tools.",
};

export const projects: Project[] = [
  { name: "portifa", url: "https://github.com/thalesmengue/portifa", desc: "this site" },
];

export const contact: Link[] = [
  { name: "github", url: "https://github.com/thalesmengue" },
  { name: "linkedin", url: "https://www.linkedin.com/in/thalesmengue" },
  { name: "email", url: "mailto:thalesmmachado@gmail.com" },
];
