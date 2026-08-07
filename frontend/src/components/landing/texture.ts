/**
 * The reference template lays a faint tiled ASCII-halftone image behind its hero
 * (grayscaled, radially masked, tiled at ~242px). We generate the equivalent tile
 * as an inline SVG data URI instead of shipping a bitmap — same texture, no asset,
 * and it stays crisp at any density.
 *
 * The character choice is deterministic (seeded LCG) so the tile is identical on
 * every render and every machine.
 */

const COLS = 84;
const ROWS = 68;
const CELL_W = 5.8;
const CELL_H = 7.2;
const GLYPHS = "xxxxxxxx++··--x×+·";

function buildTile(): string {
  let seed = 20260806;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  let rows = "";
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) line += GLYPHS[Math.floor(rand() * GLYPHS.length)];
    rows += `<text x="0" y="${((r + 1) * CELL_H).toFixed(1)}" >${line}</text>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(COLS * CELL_W).toFixed(0)}" height="${(
      ROWS * CELL_H
    ).toFixed(0)}">` +
    `<g font-family="monospace" font-size="${CELL_H}" fill="#f1f1f1" letter-spacing="0.35">${rows}</g>` +
    `</svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const ASCII_TEXTURE = buildTile();
