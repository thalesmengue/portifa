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

All site and terminal content lives in `src/data.ts`.

## Structure

```
src/
  data.ts                 site content
  layouts/Base.astro      html shell
  pages/index.astro       home page
  components/Terminal.astro
  styles/global.css
public/                   static assets
```
