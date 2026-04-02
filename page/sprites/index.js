// page/sprites/index.js — Approach 2: Sprite-based pseudo-3D
// Uses FILL_RECT pool, projects sprites to screen with perspective scaling
// Z-sorted back-to-front by destroying/recreating in render order
import { MAP, MAP_W, MAP_H, ENEMY_TYPES, spawnEnemies, worldToScreen, isSolid } from '../../include/sprites/game.js';

const VIEW_W = 480;
const VIEW_H = 480;
const FOCAL  = 240;   // focal length for perspective
const FPS    = 10;
const NUM_SPRITES = 20;

const player = { x: 2.5, y: 8.5, angle: 0, health: 100 };
let enemies = [];
let spritePool = [];  // pool of FILL_RECT widgets
let usedSprites = 0;
let gameTimer = null;
let frameCount = 0;
let lastFpsTime = 0;
let inputMode = 0;
let lastButtonTime = 0;

let fpsText = null;
let enemyText = null;

// ---- Sprite widget management ----
function acquireSprite() {
  if (usedSprites < spritePool.length) {
    const w = spritePool[usedSprites];
    usedSprites++;
    return w;
  }
  // Create new sprite widget
  const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: 0, y: 0, w: 1, h: 1, color: 0xFF0000,
  });
  spritePool.push(w);
  usedSprites++;
  return w;
}

function releaseSprites() {
  for (let i = 0; i < usedSprites; i++) {
    // Hide by moving off-screen
    spritePool[i].setProperty(hmUI.prop.Y, { y: -500 });
    spritePool[i].setProperty(hmUI.prop.H, { h: 0 });
  }
  usedSprites = 0;
}

// ---- Floor grid: render visible tiles as projected rectangles ----
// Map is 16x16 world units. Player at (px,py) facing pangle.
// FOV = 60deg. We'll render a top-down map with perspective foreshortening.
function renderFloorAndWalls() {
  // Render floor grid — 8x8 projected tiles
  // Each world tile = 1 unit. Visible range = ~12 units around player.
  const RANGE = 8;
  const NUM_STRIPS = 12;
  const ceilBot = (VIEW_H * 0.28) | 0;
  const wallBot = (VIEW_H * 0.75) | 0;
  const wallH = wallBot - ceilBot;
  const floorH = VIEW_H - wallBot;

  // Floor strips (simple depth gradient, no raycasting)
  const floorBase = 0x111010;
  for (let i = 0; i < 8; i++) {
    const depth = 1 + i * 1.5;
    const dim = Math.max(0.1, 1.0 / (depth * 0.8));
    const r = (floorBase >> 16) & 0xFF;
    const g = (floorBase >> 8) & 0xFF;
    const b = (floorBase >> 0) & 0xFF;
    const nr = (r * dim) | 0;
    const ng = (g * dim) | 0;
    const nb = (b * dim) | 0;
    const color = ((nr << 16) | (ng << 8) | nb) & 0xFFFFFF;
    const y = wallBot + ((i / 8) * floorH) | 0;
    const h = ((floorH / 8) | 0) + 1;
    // These are pre-created strips at init; just update color
  }

  // Ceiling strips
  const skyBase = 0x0D1020;
  for (let i = 0; i < 8; i++) {
    const depth = 1 + i * 1.5;
    const dim = Math.max(0.1, 1.0 / (depth * 0.8));
    const r = (skyBase >> 16) & 0xFF;
    const g = (skyBase >> 8) & 0xFF;
    const b = (skyBase >> 0) & 0xFF;
    const nr = (r * dim) | 0;
    const ng = (g * dim) | 0;
    const nb = (b * dim) | 0;
    const color = ((nr << 16) | (ng << 8) | nb) & 0xFFFFFF;
    const h = ((ceilBot / 8) | 0) + 1;
    const y = i * h;
  }
}

// ---- Project and render enemies ----
function renderEnemies() {
  usedSprites = 0;

  const ceilBot = (VIEW_H * 0.28) | 0;
  const wallBot = (VIEW_H * 0.75) | 0;
  const wallH = wallBot - ceilBot;

  // Sort enemies by depth (far to near)
  const sorted = enemies.slice().sort((a, b) => {
    const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
    const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
    return db - da;
  });

  for (const enemy of sorted) {
    const proj = worldToScreen(enemy.x, enemy.y, player.x, player.y, player.angle, VIEW_W, VIEW_H, FOCAL);
    if (!proj) continue;

    const type = ENEMY_TYPES[enemy.type];
    const sw = (type.w * proj.scale) | 0;
    const sh = (type.h * proj.scale) | 0;
    if (sw < 2 || sh < 2 || sw > VIEW_W || sh > VIEW_H) continue;

    // Depth shading
    const fog = Math.min(1.0, 1.5 / Math.sqrt(proj.depth));
    const er = (type.color >> 16) & 0xFF;
    const eg = (type.color >> 8) & 0xFF;
    const eb = (type.color >> 0) & 0xFF;
    const nr = (er * fog) | 0;
    const ng = (eg * fog) | 0;
    const nb = (eb * fog) | 0;
    const color = ((nr << 16) | (ng << 8) | nb) & 0xFFFFFF;

    const sx = (proj.sx - sw / 2) | 0;
    const sy = (proj.sy - sh) | 0; // bottom-anchor sprites

    const w = acquireSprite();
    w.setProperty(hmUI.prop.X, { x: sx });
    w.setProperty(hmUI.prop.Y, { y: sy });
    w.setProperty(hmUI.prop.W, { w: sw });
    w.setProperty(hmUI.prop.H, { h: sh });
    w.setProperty(hmUI.prop.COLOR, { color });
  }
}

// ---- Render weapon ----
let weaponW = null;
function renderWeapon() {
  if (!weaponW) {
    weaponW = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: VIEW_W - 80, y: VIEW_H - 120, w: 60, h: 100,
      color: 0x444444,
    });
  }
  // Bob weapon with walking
  const bob = (Math.sin(frameCount * 0.3) * 5) | 0;
  weaponW.setProperty(hmUI.prop.Y, { y: VIEW_H - 120 + bob });
}

// ---- Simple enemy AI ----
function updateEnemies() {
  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const type = ENEMY_TYPES[enemy.type];

    // Move toward player if far
    if (dist > 1.0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const nx2 = enemy.x + nx * type.speed;
      const ny2 = enemy.y + ny * type.speed;
      if (!isSolid(nx2, enemy.y)) enemy.x = nx2;
      if (!isSolid(enemy.x, ny2)) enemy.y = ny2;
    }
  }
}

function readInput() {
  const MOVE_SPEED = 0.06;
  const TURN_SPEED = 0.08;
  player.moveForward = player.moveBackward =
  player.turnLeft = player.turnRight = false;

  switch (inputMode) {
    case 0: player.moveForward  = true; break;
    case 1: player.strafeLeft  = true; break;
    case 2: player.strafeRight = true; break;
    case 3: player.turnLeft    = true; break;
    case 4: player.turnRight   = true; break;
  }
  if (inputMode === 0 && frameCount % 40 < 10) player.turnRight = true;
}

function updatePlayer() {
  const MOVE_SPEED = 0.06;
  const TURN_SPEED = 0.08;
  const TAU = Math.PI * 2;
  if (player.turnLeft)  player.angle = ((player.angle - TURN_SPEED) % TAU + TAU) % TAU;
  if (player.turnRight) player.angle = ((player.angle + TURN_SPEED) % TAU + TAU) % TAU;

  const dx = Math.cos(player.angle) * MOVE_SPEED;
  const dy = Math.sin(player.angle) * MOVE_SPEED;
  if (player.moveForward) {
    if (!isSolid(player.x + dx, player.y + dy)) {
      player.x += dx; player.y += dy;
    }
  }
}

function updateFps(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    const fps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    if (fpsText) fpsText.setProperty(hmUI.prop.TEXT, { text: `FPS:${fps}` });
    if (enemyText) enemyText.setProperty(hmUI.prop.TEXT, {
      text: `E:${enemies.length} x:${player.x.toFixed(1)} y:${player.y.toFixed(1)}`,
    });
  }
}

function gameTick(now) {
  readInput();
  updatePlayer();
  updateEnemies();
  releaseSprites();
  renderEnemies();
  updateFps(now || Date.now());
}

function setupButtons() {
  try {
    hmUI.onGlobalButtonDown(hmUI.button.MENU, () => {
      const now = Date.now();
      if (now - lastButtonTime < 300) return;
      lastButtonTime = now;
      inputMode = (inputMode + 1) % 5;
      hmUI.showToast({ text: ['FWD','SL','SR','TL','TR'][inputMode], duration: 200 });
    });
  } catch (e) { console.log('Button err: ' + e); }
}

Page({
  build() {
    hmUI.setLayerScrolling(false);

    enemies = spawnEnemies();
    console.log(`Sprites: spawned ${enemies.length} enemies`);

    // Pre-create sprite pool
    for (let i = 0; i < NUM_SPRITES; i++) {
      const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0, y: -500, w: 1, h: 0, color: 0xFF0000,
      });
      spritePool.push(w);
    }

    fpsText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: 64, h: 20,
      color: 0xFFFF00, text_size: 16, text: 'FPS:0',
    });
    enemyText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 280, y: 0, w: 200, h: 20,
      color: 0x00FF88, text_size: 14, text: 'E:0', align: hmUI.align.right,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: VIEW_W, h: 18,
      color: 0x888888, text_size: 11,
      text: 'APPROACH 2: SPRITES // PSEUDO-3D', align: hmUI.align.center,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 462, w: VIEW_W, h: 18,
      color: 0x555555, text_size: 11,
      text: 'BTN: FWD/SL/SR/TL/TR', align: hmUI.align.center,
    });

    // Floor/ceiling background
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 134, w: VIEW_W, h: 346, color: 0x111010,
    });
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: VIEW_W, h: 134, color: 0x0D1020,
    });

    setupButtons();
    lastFpsTime = Date.now();
    frameCount = 0;
    gameTimer = timer.createTimer(0, 1000 / FPS, (now) => gameTick(now));
    console.log('Sprite page started at ' + FPS + ' fps');
  },
  onInit() {},
  onDestroy() {
    if (gameTimer) { timer.stopTimer(gameTimer); gameTimer = null; }
    spritePool = [];
  },
});
