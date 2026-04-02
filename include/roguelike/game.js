// include/roguelike/game.js — Shared roguelike state
// Grid-based dungeon crawler
export const GRID_W = 20;
export const GRID_H = 20;

// Tile types
export const T = { WALL: 1, FLOOR: 0, DOOR: 2, STAIRS: 3, POTION: 4, AMMO: 5 };

// Procedural dungeon
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

export function generateDungeon(seed) {
  const r = rng(seed || 42);
  const map = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(T.FLOOR));

  // Outer walls
  for (let x = 0; x < GRID_W; x++) { map[0][x] = T.WALL; map[GRID_H-1][x] = T.WALL; }
  for (let y = 0; y < GRID_H; y++) { map[y][0] = T.WALL; map[y][GRID_W-1] = T.WALL; }

  // Rooms
  for (let i = 0; i < 5; i++) {
    const rw = (r() * 4 + 2) | 0;
    const rh = (r() * 4 + 2) | 0;
    const rx = (r() * (GRID_W - rw - 2) + 1) | 0;
    const ry = (r() * (GRID_H - rh - 2) + 1) | 0;
    for (let y = ry; y < ry + rh && y < GRID_H-1; y++)
      for (let x = rx; x < rx + rw && x < GRID_W-1; x++)
        map[y][x] = T.FLOOR;
  }

  // Corridors
  for (let i = 0; i < 4; i++) {
    const x = ((r() * (GRID_W - 2)) + 1) | 0;
    const y = ((r() * (GRID_H - 2)) + 1) | 0;
    const len = (r() * 6 + 3) | 0;
    const horiz = r() > 0.5;
    for (let j = 0; j < len; j++) {
      const nx = horiz ? x + j : x;
      const ny = horiz ? y : y + j;
      if (nx > 0 && nx < GRID_W-1 && ny > 0 && ny < GRID_H-1)
        map[ny][nx] = T.FLOOR;
    }
  }

  // Items
  const items = [];
  for (let i = 0; i < 5; i++) {
    let x, y;
    do { x = (r() * (GRID_W-2) + 1) | 0; y = (r() * (GRID_H-2) + 1) | 0; }
    while (map[y][x] !== T.FLOOR);
    items.push({ type: T.POTION, x, y });
  }
  for (let i = 0; i < 3; i++) {
    let x, y;
    do { x = (r() * (GRID_W-2) + 1) | 0; y = (r() * (GRID_H-2) + 1) | 0; }
    while (map[y][x] !== T.FLOOR);
    items.push({ type: T.AMMO, x, y });
  }

  return { map, items };
}

export function isSolid(map, x, y) {
  const mx = x | 0, my = y | 0;
  if (mx < 0 || mx >= GRID_W || my < 0 || my >= GRID_H) return true;
  return map[my][mx] === T.WALL;
}
