# portifa

Minimal personal portfolio with a tiny fake Linux terminal, built with [Astro](https://astro.build).

## Development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview
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
