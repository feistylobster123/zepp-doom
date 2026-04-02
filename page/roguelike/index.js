// page/roguelike/index.js — Approach 3: Grid-based roguelike
// Pre-allocated FILL_RECT tile pool, updates colors per-frame for visibility
import { GRID_W, GRID_H, T, generateDungeon, isSolid } from '../../include/roguelike/game.js';

const CELL_W  = 24;   // 480/20
const CELL_H  = 24;   // 480/20
const VIEW_W  = 480;
const VIEW_H  = 480;
const VIS_R   = 5;     // visibility radius in tiles
const FPS     = 10;

const TILE_COLORS = {
  [T.WALL]:    0x404040,
  [T.FLOOR]:   0x222222,
  [T.DOOR]:    0x664422,
  [T.STAIRS]:  0x888822,
  [T.POTION]:  0x22AA22,
  [T.AMMO]:    0xCCAA22,
  HIDDEN:      0x080808,
  SEEN:        0x111111,
};

// Convert world tile coords to color with distance fog
function tileColor(tileType, dist) {
  if (dist > VIS_R) return TILE_COLORS.HIDDEN;
  if (dist > VIS_R - 1) return TILE_COLORS.SEEN;

  const fog = Math.max(0.15, 1.0 - (dist / VIS_R) * 0.7);
  const base = TILE_COLORS[tileType] || 0x222222;
  const r = (base >> 16) & 0xFF;
  const g = (base >> 8) & 0xFF;
  const b = base & 0xFF;
  return (((r * fog) | 0) << 16) | (((g * fog) | 0) << 8) | ((b * fog) | 0);
}

const player = { x: 2, y: 2, health: 100, ammo: 50 };
let dungeon = null;
let tilePool = [];    // all grid tile widgets
let entityPool = [];  // item/enemy widgets
let visible = new Set();
let seen = new Set();
let gameTimer = null;
let frameCount = 0;
let lastFpsTime = 0;
let inputMode = 0;
let lastButtonTime = 0;

let fpsText = null;
let hudText = null;
let messageText = null;
let messageTimer = 0;
let score = 0;

function showMessage(msg) {
  messageTimer = FPS * 2;
  if (messageText) messageText.setProperty(hmUI.prop.TEXT, { text: msg });
}

function buildTilePool() {
  tilePool = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: x * CELL_W,
        y: y * CELL_H,
        w: CELL_W,
        h: CELL_H,
        color: TILE_COLORS.HIDDEN,
      });
      tilePool.push({ w, x, y });
    }
  }
}

function buildEntityPool() {
  entityPool = [];
  // Items
  for (const item of dungeon.items) {
    const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: item.x * CELL_W + 4,
      y: item.y * CELL_H + 4,
      w: CELL_W - 8,
      h: CELL_H - 8,
      color: TILE_COLORS[item.type],
    });
    entityPool.push({ w, type: 'item', data: item });
  }
  // Enemies
  for (let i = 0; i < 5; i++) {
    const ex = ((i * 3 + 5) % (GRID_W - 2)) + 1;
    const ey = ((i * 4 + 3) % (GRID_H - 2)) + 1;
    const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: ex * CELL_W + 2,
      y: ey * CELL_H + 2,
      w: CELL_W - 4,
      h: CELL_H - 4,
      color: 0xCC2222,
    });
    entityPool.push({ w, type: 'enemy', x: ex, y: ey, health: 30 });
  }
}

function computeVisibility() {
  visible.clear();
  const px = player.x | 0;
  const py = player.y | 0;
  for (let dy = -VIS_R; dy <= VIS_R; dy++) {
    for (let dx = -VIS_R; dx <= VIS_R; dx++) {
      const tx = px + dx;
      const ty = py + dy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > VIS_R) continue;
      if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) continue;
      // Ray march to check LOS
      let hit = false;
      for (let t = 0.1; t < dist; t += 0.1) {
        const mx = (px + dx * t / dist) | 0;
        const my = (py + dy * t / dist) | 0;
        if (dungeon.map[my][mx] === T.WALL) { hit = true; break; }
      }
      if (!hit) visible.add(`${tx},${ty}`);
      seen.add(`${tx},${ty}`);
    }
  }
}

function renderTiles() {
  for (const tile of tilePool) {
    const key = `${tile.x},${tile.y}`;
    const dist = Math.sqrt((tile.x - player.x) ** 2 + (tile.y - player.y) ** 2);
    const tileType = dungeon.map[tile.y][tile.x];
    const color = tileColor(tileType, dist);
    tile.w.setProperty(hmUI.prop.COLOR, { color });
  }
}

function renderEntities() {
  for (const entity of entityPool) {
    const key = `${entity.data.x},${entity.data.y}`;
    const isVis = visible.has(key);
    if (entity.type === 'item') {
      entity.w.setProperty(hmUI.prop.COLOR, {
        color: isVis ? TILE_COLORS[entity.data.type] : TILE_COLORS.HIDDEN,
      });
    } else if (entity.type === 'enemy') {
      entity.w.setProperty(hmUI.prop.COLOR, {
        color: isVis ? 0xCC2222 : TILE_COLORS.HIDDEN,
      });
      if (isVis) {
        // Move to enemy position
        entity.w.setProperty(hmUI.prop.X, { x: entity.x * CELL_W + 2 });
        entity.w.setProperty(hmUI.prop.Y, { y: entity.y * CELL_H + 2 });
      }
    }
  }
}

function movePlayer(dx, dy) {
  const nx = (player.x | 0) + dx;
  const ny = (player.y | 0) + dy;
  if (!isSolid(dungeon.map, nx, ny)) {
    player.x = nx + 0.5;
    player.y = ny + 0.5;
    // Pick up items
    for (let i = entityPool.length - 1; i >= 0; i--) {
      const e = entityPool[i];
      if (e.type === 'item' && e.data.x === nx && e.data.y === ny) {
        if (e.data.type === T.POTION) { player.health = Math.min(100, player.health + 20); showMessage('Potion +20 HP'); }
        if (e.data.type === T.AMMO)   { player.ammo += 10; showMessage('Ammo +10'); }
        score += 10;
        e.w.setProperty(hmUI.prop.COLOR, { color: TILE_COLORS.HIDDEN });
        entityPool.splice(i, 1);
      }
    }
  }
}

function updateEnemies() {
  for (const e of entityPool) {
    if (e.type !== 'enemy') continue;
    const key = `${e.x},${e.y}`;
    if (!visible.has(key)) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1.5) {
      // Attack player
      if (frameCount % 30 === 0) {
        player.health -= 5;
        showMessage(`Hit! HP:${player.health}`);
      }
    } else if (dist < VIS_R) {
      // Move toward player
      const nx = e.x + (dx / dist) * 0.5;
      const ny = e.y + (dy / dist) * 0.5;
      if (!isSolid(dungeon.map, nx | 0, ny | 0)) {
        e.x = nx;
        e.y = ny;
      }
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
    if (hudText) hudText.setProperty(hmUI.prop.TEXT, {
      text: `HP:${player.health} AM:${player.ammo} SC:${score}`,
    });
  }
  if (messageTimer > 0) {
    messageTimer--;
    if (messageTimer === 0 && messageText) messageText.setProperty(hmUI.prop.TEXT, { text: '' });
  }
}

function readInput() {
  switch (inputMode) {
    case 0: /* auto-move handled in tick */ break;
    case 3: movePlayer(-1, 0); break;  // turn left = go left
    case 4: movePlayer(1, 0);  break;  // turn right = go right
    case 1: movePlayer(0, -1); break;  // strafe left = up
    case 2: movePlayer(0, 1);  break;  // strafe right = down
  }
  if (inputMode === 0 && frameCount % 20 === 0) movePlayer(1, 0); // auto-explore right
}

function gameTick(now) {
  readInput();
  computeVisibility();
  renderTiles();
  renderEntities();
  updateEnemies();
  updateFps(now || Date.now());
}

function setupButtons() {
  try {
    hmUI.onGlobalButtonDown(hmUI.button.MENU, () => {
      const now = Date.now();
      if (now - lastButtonTime < 300) return;
      lastButtonTime = now;
      inputMode = (inputMode + 1) % 5;
      hmUI.showToast({ text: ['AUTO','UP','DN','L','R'][inputMode], duration: 200 });
    });
  } catch (e) { console.log('Button err: ' + e); }
}

Page({
  build() {
    hmUI.setLayerScrolling(false);

    dungeon = generateDungeon(Date.now() | 0);
    buildTilePool();
    buildEntityPool();

    // Pre-create entity pool
    for (let i = 0; i < 20; i++) {
      const ex = ((i * 3 + 7) % (GRID_W - 2)) + 1;
      const ey = ((i * 5 + 2) % (GRID_H - 2)) + 1;
      const w = hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: ex * CELL_W + 2, y: ey * CELL_H + 2,
        w: CELL_W - 4, h: CELL_H - 4, color: 0xCC2222,
      });
      entityPool.push({ w, type: 'enemy', x: ex, y: ey, health: 30 });
    }

    fpsText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: 64, h: 20,
      color: 0xFFFF00, text_size: 16, text: 'FPS:0',
    });
    hudText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 200, y: 0, w: 280, h: 20,
      color: 0x00FF88, text_size: 14, text: 'HP:100 AM:50 SC:0', align: hmUI.align.right,
    });
    messageText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 220, w: VIEW_W, h: 24,
      color: 0xFFFF00, text_size: 16, text: '',
      align: hmUI.align.center,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: VIEW_W, h: 18,
      color: 0x888888, text_size: 11,
      text: 'APPROACH 3: ROGUELIKE // DUNGEON CRAWLER', align: hmUI.align.center,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 462, w: VIEW_W, h: 18,
      color: 0x555555, text_size: 11,
      text: 'BTN: AUTO/UP/DN/L/R', align: hmUI.align.center,
    });

    setupButtons();
    lastFpsTime = Date.now();
    frameCount = 0;
    gameTimer = timer.createTimer(0, 1000 / FPS, (now) => gameTick(now));
    showMessage('Find the potions! Enemies attack on contact.');
    console.log('Roguelike page started');
  },
  onInit() {},
  onDestroy() {
    if (gameTimer) { timer.stopTimer(gameTimer); gameTimer = null; }
    tilePool = [];
    entityPool = [];
  },
});
