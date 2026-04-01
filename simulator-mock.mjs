#!/usr/bin/env node
// simulator-mock.mjs — Node.js mock of the Zepp OS game renderer
// Shows exactly what the 12x12 minimap looks like at 10fps

import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Map data (must match map.js) ----
const MAP_DATA = [
  1,1,1,1,1,1,1,1,1,1,1,1,
  1,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,2,2,0,0,0,3,0,0,1,
  1,0,0,2,0,0,0,0,0,0,0,1,
  1,0,0,0,0,0,4,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,1,
  1,0,3,0,0,0,0,0,2,2,0,1,
  1,0,0,0,0,0,0,0,0,0,0,1,
  1,0,0,0,4,0,0,0,0,0,0,1,
  1,0,0,0,0,0,0,0,0,0,0,1,
  1,1,1,1,1,1,1,1,1,1,1,1,
];
const MAP_WIDTH = 12;
const MAP_HEIGHT = 12;

const C = {
  BLACK:       [0,   0,   0  ],
  DARK_GRAY:   [64,  64,  64 ],
  MID_GRAY:    [128, 128, 128],
  DARK_RED:    [128, 0,   0  ],
  DARK_GREEN:  [0,   64,  0  ],
  GREEN:       [0,   255, 0  ],
  WHITE:       [255, 255, 255],
};

const WALL_COLORS = {
  0: C.BLACK,
  1: C.DARK_GRAY,
  2: C.MID_GRAY,
  3: C.DARK_RED,
  4: C.DARK_GREEN,
};

function wallColor(type) {
  return WALL_COLORS[type] || C.DARK_GRAY;
}

// ---- Renderer ----
class MockRenderer {
  constructor({ viewWidth = 360, viewHeight = 360, gridSize = 12 } = {}) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.gridSize = gridSize;
    this.cellW = Math.floor(viewWidth / gridSize);
    this.cellH = Math.floor(viewHeight / gridSize);
  }

  renderTopDown(playerX, playerY, playerAngle, viewRange) {
    const half = viewRange / 2;
    const pixels = [];
    let idx = 0;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const wx = playerX - half + (col / this.gridSize) * viewRange;
        const wy = playerY - half + (row / this.gridSize) * viewRange;
        const mx = Math.floor(wx);
        const my = Math.floor(wy);

        let color = C.BLACK;
        if (mx >= 0 && mx < MAP_WIDTH && my >= 0 && my < MAP_HEIGHT) {
          const tile = MAP_DATA[my * MAP_WIDTH + mx];
          if (tile > 0) color = wallColor(tile);
        }

        // Player dot
        const dx = col / this.gridSize - 0.5;
        const dy = row / this.gridSize - 0.5;
        if (dx * dx + dy * dy < 0.005) color = C.GREEN;

        pixels.push({ row, col, color });
      }
    }
    return pixels;
  }
}

// ---- Canvas rendering ----
function renderToCanvas(renderer, playerX, playerY, playerAngle, viewRange) {
  const canvas = createCanvas(renderer.viewWidth, renderer.viewHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pixels = renderer.renderTopDown(playerX, playerY, playerAngle, viewRange);
  for (const { row, col, color } of pixels) {
    const x = col * renderer.cellW;
    const y = row * renderer.cellH;
    const [r, g, b] = color;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, renderer.cellW + 1, renderer.cellH + 1);
  }

  // HUD overlay
  ctx.fillStyle = '#FFFF00';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`FPS:${fps} x:${playerX.toFixed(1)} y:${playerY.toFixed(1)} ang:${(playerAngle*180/Math.PI).toFixed(0)}deg`, 4, 16);

  ctx.fillStyle = '#808080';
  ctx.font = '10px monospace';
  ctx.fillText('Zepp DOOM - Alpha (Mock Simulator)', 4, canvas.height - 6);

  return canvas;
}

// ---- Game state ----
const player = { x: 5.5, y: 5.5, angle: 0, moveForward: true, turnLeft: false, turnRight: false };
const renderer = new MockRenderer({ viewWidth: 360, viewHeight: 360, gridSize: 12 });
let fps = 0, frameCount = 0, lastFpsTime = Date.now();

// ---- Auto-walk demo (matches page/doom/index.js logic) ----
function readInput() {
  player.moveForward = true;
  player.turnLeft = false;
  player.turnRight = (frameCount % 60 < 10);
}

function updatePlayer() {
  const speed = 0.05;
  const turnSpeed = 0.08;
  if (player.moveForward) {
    player.x += Math.cos(player.angle) * speed;
    player.y += Math.sin(player.angle) * speed;
  }
  if (player.turnLeft)  player.angle -= turnSpeed;
  if (player.turnRight) player.angle += turnSpeed;
}

// ---- Render loop ----
const FPS = 10;
const interval = 1000 / FPS;
let lastTime = Date.now();
let frameNum = 0;

function gameTick() {
  const now = Date.now();
  readInput();
  updatePlayer();
  const canvas = renderToCanvas(renderer, player.x, player.y, player.angle, 12);

  frameCount++;
  if (now - lastFpsTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
  }

  const outPath = join(__dirname, `sim-output-frame${String(frameNum).padStart(4,'0')}.png`);
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`Frame ${frameNum} -> ${outPath}  (x=${player.x.toFixed(2)} y=${player.y.toFixed(2)} ang=${(player.angle*180/Math.PI).toFixed(0)}deg)`);
  frameNum++;
}

// Run N frames
const FRAMES = 20;
for (let i = 0; i < FRAMES; i++) {
  await gameTick();
  await new Promise(r => setTimeout(r, interval));
}

console.log(`\nDone. ${FRAMES} frames rendered to ${__dirname}/sim-output-frame*.png`);
console.log('To view: open sim-output-frame0000.png in an image viewer');
