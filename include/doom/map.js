// map.js — Doom-style map for Zepp OS raycaster
//
// Wall map: 1 = solid wall, 0 = empty
// Floor map: separate FLOOR_DATA array, values are floor type IDs (0-5)
//   0 = dark floor (default)
//   1 = lighter brown floor
//   2 = tan/brick floor
//   3 = blue-gray tech floor
//   4 = stone floor
//   5 = misc variant
//
// Original E1M1-inspired layout — open rooms connected by corridors,
// with colored accent walls and pillars. Scales to 16x16.

export const MAP_WIDTH  = 16;
export const MAP_HEIGHT = 16;

// ---- Wall map ----
// 1 = solid, higher = different color type
export const MAP_DATA = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 1,
  1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 1,
  1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

// ---- Floor texture map ----
// Values: 0=dark, 1=light-brown, 2=tan, 3=blue-gray, 4=stone, 5=greenish
// Layout mirrors wall map — room with corridors, center pillar, accent corners
export const FLOOR_DATA = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
  0, 1, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 1, 0,
  0, 1, 2, 0, 0, 2, 1, 1, 1, 1, 0, 0, 0, 2, 1, 0,
  0, 1, 2, 0, 0, 2, 1, 1, 1, 1, 0, 0, 0, 2, 1, 0,
  0, 1, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 1, 0,
  0, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 3, 0, 0, 3, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 3, 0, 0, 3, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1, 0,
  0, 1, 2, 2, 2, 2, 1, 1, 1, 1, 4, 4, 4, 4, 1, 0,
  0, 1, 2, 0, 0, 2, 1, 1, 1, 1, 4, 0, 0, 4, 1, 0,
  0, 1, 2, 0, 0, 2, 1, 1, 1, 1, 4, 0, 0, 4, 1, 0,
  0, 1, 2, 2, 2, 2, 1, 1, 1, 1, 4, 4, 4, 4, 1, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

// ---- Collision helpers ----
export function getWall(x, y) {
  const mx = x | 0;
  const my = y | 0;
  if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) return 1;
  return MAP_DATA[my * MAP_WIDTH + mx];
}

export function isSolid(x, y) {
  return getWall(x, y) > 0;
}

export function canMove(x, y, radius) {
  const r = radius || 0.2;
  return !isSolid(x - r, y - r) &&
         !isSolid(x + r, y - r) &&
         !isSolid(x - r, y + r) &&
         !isSolid(x + r, y + r);
}

// ---- Player start position ----
// Open area near entrance — facing into the main hall
export const START_X = 2.5;
export const START_Y = 8.5;
