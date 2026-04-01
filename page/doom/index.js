// page/doom/index.js — Main Doom game page
//
// Zepp OS page lifecycle:
//   onInit()    — page entering, called once
//   build()     — page UI build, called once after onInit
//   onDestroy() — page exit cleanup

import { Renderer } from '../../include/doom/renderer.js';
import { Player }   from '../../include/doom/player.js';

// ---- HUD constants ----
const HUD_X = 0;
const HUD_Y = 0;

// ---- Game state ----
const player = new Player();
let renderer = null;
let gameTimer = null;
let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 0;

// ---- FPS counter HUD widgets ----
let fpsText = null;
let posText = null;

function updateFps(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
    if (fpsText) {
      fpsText.setProperty(hmUI.prop.TEXT, {
        text: `FPS:${currentFps}`,
      });
    }
    if (posText) {
      posText.setProperty(hmUI.prop.TEXT, {
        text: `${player.x.toFixed(1)},${player.y.toFixed(1)} a:${(player.angle*180/Math.PI).toFixed(0)}`,
      });
    }
  }
}

// ---- Main game loop ----
function gameTick(now) {
  // 1. Read input state
  readInput();

  // 2. Update player
  player.update();

  // 3. Render 3D view
  renderer.render(player.x, player.y, player.angle);

  // 4. Update FPS counter
  updateFps(now);
}

// ---- Input: state machine for 1-button device ----
// Bip 6: single physical button below screen
// Tap cycles: forward → strafe left → strafe right → turn left → turn right → forward
let inputMode = 0;
// 0=forward, 1=strafe L, 2=strafe R, 3=turn L, 4=turn R
const MODE_NAMES = ['FWD', 'SL', 'SR', 'TL', 'TR'];
let lastButtonTime = 0;

function readInput() {
  player.moveForward  = false;
  player.moveBackward = false;
  player.turnLeft     = false;
  player.turnRight    = false;
  player.strafeLeft   = false;
  player.strafeRight  = false;

  switch (inputMode) {
    case 0: player.moveForward  = true; break;
    case 1: player.strafeLeft  = true; break;
    case 2: player.strafeRight = true; break;
    case 3: player.turnLeft    = true; break;
    case 4: player.turnRight   = true; break;
  }

  // Auto-turn for demo when in forward mode
  if (inputMode === 0 && frameCount % 40 < 20) {
    player.turnRight = true;
  }
}

// ---- Register button handler ----
function setupButtons() {
  try {
    hmUI.onGlobalButtonDown(hmUI.button.MENU, () => {
      const now = Date.now();
      if (now - lastButtonTime < 300) return;  // debounce
      lastButtonTime = now;
      inputMode = (inputMode + 1) % 5;
      hmUI.showToast({ text: MODE_NAMES[inputMode], duration: 200 });
    });
  } catch (e) {
    console.log('Button setup error: ' + e);
  }
}

// ---- Build the page UI ----
Page({
  build() {
    // Disable scrolling — fullscreen game
    hmUI.setLayerScrolling(false);

    // Create raycasting renderer
    renderer = new Renderer({
      viewWidth:  360,
      viewHeight: 360,
      numRays:    120,   // 120 rays × 3px each = 360px wide
    });
    renderer.init();

    // HUD: FPS counter (top-left)
    fpsText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0,
      w: 64, h: 20,
      color: 0xFFFF00,
      text_size: 16,
      text: 'FPS:0',
    });

    // HUD: position/angle (top-right)
    posText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 260, y: 0,
      w: 100, h: 20,
      color: 0x00FF88,
      text_size: 14,
      text: '0.0,0.0 a:0',
      align: hmUI.align.right,
    });

    // HUD: game title (top-center)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 0,
      w: 360, h: 18,
      color: 0x888888,
      text_size: 11,
      text: 'ZEPP DOOM // 3D RAYCASTER',
      align: hmUI.align.center,
    });

    // HUD: controls hint (bottom)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 342,
      w: 360, h: 18,
      color: 0x555555,
      text_size: 11,
      text: 'BTN: FWD/SL/SR/TL/TR',
      align: hmUI.align.center,
    });

    // Setup button handlers
    setupButtons();

    // Start game loop at target fps
    const FPS = 10;
    const interval = 1000 / FPS;

    lastFpsTime = Date.now();
    frameCount = 0;

    gameTimer = timer.createTimer(0, interval, (now) => {
      gameTick(now || Date.now());
    });

    console.log('Zepp DOOM 3D raycaster started at ' + FPS + ' fps');
  },

  onInit() {
    console.log('Zepp DOOM page onInit');
  },

  onDestroy() {
    console.log('Zepp DOOM page onDestroy');
    if (gameTimer) {
      timer.stopTimer(gameTimer);
      gameTimer = null;
    }
    renderer = null;
  },
});
