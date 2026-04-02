// page/raycaster/index.js — Approach 1: Column-based raycasting
// Uses widget pool: ceiling strips + floor strips + wall columns (all FILL_RECT)
// Each frame: updates y/h/color of each wall column, color of strips
import { Renderer } from '../../include/raycaster/renderer.js';
import { Player }   from '../../include/raycaster/player.js';

const VIEW_W = 480;
const VIEW_H = 480;
const NUM_RAYS = 120;
const FPS = 10;

const player = new Player();
let renderer = null;
let gameTimer = null;
let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 0;

let fpsText = null;
let posText = null;
let inputMode = 0;
let lastButtonTime = 0;

function updateFps(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    if (fpsText) fpsText.setProperty(hmUI.prop.TEXT, { text: `FPS:${currentFps}` });
    if (posText) posText.setProperty(hmUI.prop.TEXT, {
      text: `${player.x.toFixed(1)},${player.y.toFixed(1)} a:${((player.angle*180/Math.PI)|0)}`,
    });
  }
}

function readInput() {
  player.moveForward = player.moveBackward =
  player.turnLeft = player.turnRight =
  player.strafeLeft = player.strafeRight = false;

  switch (inputMode) {
    case 0: player.moveForward  = true; break;
    case 1: player.strafeLeft  = true; break;
    case 2: player.strafeRight = true; break;
    case 3: player.turnLeft    = true; break;
    case 4: player.turnRight   = true; break;
  }
  // Auto-demo: turn right periodically in forward mode
  if (inputMode === 0 && frameCount % 40 < 10) player.turnRight = true;
}

function gameTick(now) {
  readInput();
  player.update();
  renderer.render(player.x, player.y, player.angle);
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

    renderer = new Renderer({ viewWidth: VIEW_W, viewHeight: VIEW_H, numRays: NUM_RAYS });
    renderer.init();

    fpsText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: 64, h: 20,
      color: 0xFFFF00, text_size: 16, text: 'FPS:0',
    });
    posText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 380, y: 0, w: 100, h: 20,
      color: 0x00FF88, text_size: 14, text: '0,0 a:0', align: hmUI.align.right,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0, w: VIEW_W, h: 18,
      color: 0x888888, text_size: 11,
      text: 'APPROACH 1: RAYCASTER // 120 COLUMNS', align: hmUI.align.center,
    });
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 462, w: VIEW_W, h: 18,
      color: 0x555555, text_size: 11,
      text: 'BTN: FWD/SL/SR/TL/TR', align: hmUI.align.center,
    });

    setupButtons();

    lastFpsTime = Date.now();
    frameCount = 0;
    const interval = 1000 / FPS;
    gameTimer = timer.createTimer(0, interval, (now) => gameTick(now));
    console.log('Raycaster page started at ' + FPS + ' fps');
  },
  onInit() { console.log('Raycaster onInit'); },
  onDestroy() {
    if (gameTimer) { timer.stopTimer(gameTimer); gameTimer = null; }
    renderer = null;
  },
});
