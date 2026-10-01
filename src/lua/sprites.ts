// Lua, a gray tabby with amber eyes, in pixel art.
// Each sprite is a grid of palette keys; "." is transparent.

export type Sprite = string[];

export const PALETTE: Record<string, string> = {
  O: "#1f2226", // outline
  D: "#4a4f57", // stripes
  B: "#8c939c", // base fur
  L: "#e4e6e8", // light fur
  P: "#e79a9a", // nose, inner ears
  E: "#e8a33a", // amber eyes
  K: "#141414", // pupils
  W: "#ffffff", // eye shine
};

export const SIT: Sprite = [
  "..O..........O....",
  ".OPO........OPO...",
  ".OBPOOOOOOOOPBO...",
  ".OBBDBBDDBBDBBO...",
  "OBBBBBBBBBBBBBBO..",
  "OBBWEBBBBBBWEBBO..",
  "OBBEKBBBBBBEKBBO..",
  "OLBBBBLPPLBBBBLO..",
  ".OLLBBLLLLBBLLO...",
  "..OOBBBBBBBBOO....",
  "...OBDLLLLDBO.....",
  "...OBDLLLLDBO.O...",
  "...OBBLLLLBBOODO..",
  "...OBDLLLLDBOOBO..",
  "...OBOLOOLOBOOBO..",
  "...OOOOOOOOOOOO...",
];

// blinking: same pose, eyes shut
export const SIT_BLINK: Sprite = SIT.map((row, i) =>
  i === 5 ? "OBBBBBBBBBBBBBBO.." : i === 6 ? "OBBKKBBBBBBKKBBO.." : row,
);

const HEAD_BODY: Sprite = [
  "..........O......O..",
  ".........OPO....OPO.",
  ".O.......OBPOOOOPBO.",
  "OBO.....OBDBBDDBBDBO",
  "OBO.....OBBBBBBBBBBO",
  ".OBO....OBWEBBBBWEBO",
  ".OBO....OBEKBBBBEKBO",
  "..OBOOOOOLBBBPPBBBLO",
  "..OBBDBBDOLLLLLLLLO.",
  "..OBBDBBDBOOOOOOOO..",
  "..OBBBBBBBBLLLBBO...",
  "..OBDBBDBBLLLLBBO...",
];

export const WALK_A: Sprite = [
  ...HEAD_BODY,
  "..OBBOOBBBOOBBBO....",
  "..OLLO.OLLOOLLO.....",
  "...OO...OO..OO......",
];

export const WALK_B: Sprite = [
  ...HEAD_BODY,
  "..OBBBOBBBBOBBBO....",
  "...OLLOOLLO.OLLO....",
  "....OO..OO...OO.....",
];

export const SCARED: Sprite = [
  "..........O......O..",
  ".OO......OPO....OPO.",
  "OBBO.....OBPOOOOPBO.",
  "ODBO....OBDBBDDBBDBO",
  "OBDO....OBBBBBBBBBBO",
  ".OBO....OBWWBBBBWWBO",
  ".OBO....OBWKBBBBWKBO",
  "..OBOOOOOLBBBOOBBBLO",
  "..OBBDBBDOLLLLLLLLO.",
  "..OBBDBBDBOOOOOOOO..",
  "..OBBBBBBBBLLLBBO...",
  "..OBDBBDBBLLLLBBO...",
  "...OBO..OBO.OBO.....",
  "...OBO..OBO.OBO.....",
  "...OLO..OLO.OLO.....",
  "....O....O...O......",
];

export const SLEEP: Sprite = [
  "............O....O..",
  "...........OPO..OPO.",
  "....OOOOOOOOBPOOPBO.",
  "...OBDBBDBBOBDBBDBBO",
  "..OBBDBBDBBOBBBBBBBO",
  ".OBBBBBBBBBOBKKBKKBO",
  ".ODBBDBBDBBOLBBPBBLO",
  "OBBBBBBBBBBBOLLLLLO.",
  "OBDDBBBBBBBBBOOOOOO.",
  "OBBBDDDDDDDDBBBBBO..",
  ".OOOOOOOOOOOOOOOO...",
];

export const size = (s: Sprite) => ({ w: s[0].length, h: s.length });

/** Draws a sprite with its bottom-left at (x, y + height). `flip` mirrors it horizontally. */
export function draw(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  scale: number,
  { flip = false, palette = PALETTE }: { flip?: boolean; palette?: Record<string, string> } = {},
) {
  const w = sprite[0].length;
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < w; c++) {
      const ch = sprite[r][c];
      if (ch === ".") continue;
      ctx.fillStyle = palette[ch];
      const col = flip ? w - 1 - c : c;
      ctx.fillRect(Math.round(x + col * scale), Math.round(y + r * scale), scale, scale);
    }
  }
}
