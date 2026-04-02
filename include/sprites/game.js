// include/sprites/game.js — Shared game state for sprite-based approach
export const MAP_W = 16;
export const MAP_H = 16;

export const MAP = [
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,2,2,0,0,0,0,0,0,3,3,0,0,1,
  1,0,0,2,0,0,0,0,0,0,0,3,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,4,4,4,4,0,0,0,0,0,1,
  1,0,0,0,0,0,4,0,0,4,0,0,0,0,0,1,
  1,0,0,0,0,0,4,0,0,4,0,0,0,0,0,1,
  1,0,0,0,0,0,4,4,4,4,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,3,3,0,0,0,0,0,0,5,5,0,0,1,
  1,0,0,3,0,0,0,0,0,0,0,5,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
];

export function isSolid(x, y) {
  const mx = x|0, my = y|0;
  if (mx<0||mx>=MAP_W||my<0||my>=MAP_H) return true;
  return MAP[my*MAP_W+mx] > 0;
}

// Enemy definitions
export const ENEMY_TYPES = [
  { name: 'Imp',    color: 0xCC4422, w: 0.5, h: 0.5, health: 20, speed: 0.02 },
  { name: 'Baron',  color: 0x22AA44, w: 0.6, h: 0.6, health: 50, speed: 0.015 },
  { name: 'Cacodemon', color: 0xAA2244, w: 0.7, h: 0.7, health: 40, speed: 0.01 },
];

export function spawnEnemies() {
  return [
    { type: 0, x: 4.5, y: 2.5, health: 20, maxHealth: 20, lastAttack: 0 },
    { type: 1, x: 12.5, y: 4.5, health: 50, maxHealth: 50, lastAttack: 0 },
    { type: 2, x: 7.5, y: 7.5, health: 40, maxHealth: 40, lastAttack: 0 },
    { type: 0, x: 2.5, y: 11.5, health: 20, maxHealth: 20, lastAttack: 0 },
    { type: 1, x: 13.5, y: 11.5, health: 50, maxHealth: 50, lastAttack: 0 },
  ];
}

// World-to-screen projection
// viewW=480, viewH=480, focal=240
export function worldToScreen(wx, wy, px, py, pangle, viewW, viewH, focal) {
  const dx = wx - px;
  const dy = wy - py;
  const ca = Math.cos(-pangle);
  const sa = Math.sin(-pangle);
  // Rotate to camera space
  const rx = dx * ca - dy * sa;
  const ry = dx * sa + dy * ca;
  // ry is depth (negative = behind camera)
  if (ry <= 0.1) return null; // behind or too close
  const scale = focal / ry;
  const sx = (viewW / 2) + rx * scale;
  const sy = (viewH / 2); // sprite center at mid-screen
  return { sx, sy, scale, depth: ry };
}
