// Renders a sprite as a static SVG string, for pages that should work without JavaScript.

import { PALETTE, type Sprite } from "./sprites";

export function spriteSvg(sprite: Sprite, scale = 4, label = "") {
  const w = sprite[0].length;
  const h = sprite.length;
  const rects: string[] = [];
  sprite.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== ".") rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[ch]}"/>`);
    }),
  );
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" ${a11y}>${rects.join("")}</svg>`;
}
