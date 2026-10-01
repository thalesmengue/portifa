# portifa

Minimal personal portfolio with a tiny fake Linux terminal, built with [Astro](https://astro.build).

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev      # http://localhost:4321
bun run build    # static output in dist/
bun run preview
```

## Editing content

- Site, terminal and "now" card content: `src/data.ts`
- Notes: add a Markdown file to `src/content/notes/` (`title` and `date` in the frontmatter, `draft: true` to hide it)

## Structure

```
src/
  data.ts                 site content
  content/notes/          notes in markdown
  layouts/Base.astro      html shell
  pages/index.astro       home page
  pages/notes/[slug].astro
  components/             Terminal, CatGame, NotesList, Now, Footer
  styles/global.css
public/                   static assets
```
