// renderer.js — Column-based raycasting renderer for Zepp OS
// viewWidth=480, viewHeight=480 on GTR3 Pro
// Screen layout:
//   Ceiling:  y=0 → y=CU_Y    (~134px, top ~28%)
//   Wall zone: y=CU_Y → y=WALL_BOT  (~360px, middle ~47%)
//   Floor:    y=WALL_BOT → y=480  (~120px, bottom ~25%)

import { MAP_DATA, MAP_WIDTH, MAP_HEIGHT, FLOOR_DATA } from './map.js';

// ---- Color palette (RGB888 -> hex) ----
export const C = {
  BLACK:       0x000000,
  DARK_GRAY:   0x404040,
  MID_GRAY:    0x808080,
  LIGHT_GRAY:  0xC0C0C0,
  WHITE:       0xFFFFFF,
  RED:         0xCC2222,
  DARK_RED:    0x661111,
  GREEN:       0x22CC22,
  DARK_GREEN:  0x116611,
  BLUE:        0x2255AA,
  DARK_BLUE:   0x112255,
  YELLOW:      0xCCCC22,
  CYAN:        0x22CCCC,
  ORANGE:      0xCC8822,
  BROWN:       0x664422,
  // Doom sky and floor
  SKY:         0x0D1020,
  SKY_HORIZON: 0x1A1840,
  FLOOR:       0x111010,
  FLOOR_LIGHT: 0x221810,
};

// Wall colors by type (RGB888 hex)
const WALL_COLORS = [
  0x404040, // type 1 — solid outer walls
  0x808080, // type 2 — interior lighter walls
  0x661111, // type 3 — red accent
  0x116611, // type 4 — green accent
  0x112255, // type 5 — blue accent
  0xCC8822, // type 6 — orange
];

function wallColor(type) {
  return WALL_COLORS[(type - 1) % WALL_COLORS.length] || 0x404040;
}

function floorColor(type) {
  const FLOOR_COLORS = [0x111010, 0x221810, 0x332211, 0x112233, 0x223322, 0x332222];
  return FLOOR_COLORS[type % FLOOR_COLORS.length] || 0x111010;
}

// ---- Precomputed trig tables ----
const NUM_RAYS  = 120;
const FOV       = Math.PI / 3;
const HALF_FOV  = FOV / 2;
const ANGLE_STEP = FOV / NUM_RAYS;
const TAU        = Math.PI * 2;
const PREC       = 360;

const SIN_TABLE = new Float32Array(PREC);
const COS_TABLE = new Float32Array(PREC);
for (let i = 0; i < PREC; i++) {
  SIN_TABLE[i] = Math.sin(i / PREC * TAU);
  COS_TABLE[i] = Math.cos(i / PREC * TAU);
}
function fastSin(a) { return SIN_TABLE[(((a % TAU) / TAU * PREC) | 0 + PREC * 10) % PREC]; }
function fastCos(a) { return COS_TABLE[(((a % TAU) / TAU * PREC) | 0 + PREC * 10) % PREC]; }

// ---- Renderer ----
export class Renderer {
  constructor(options = {}) {
    this.viewWidth  = options.viewWidth  || 480;
    this.viewHeight = options.viewHeight || 480;
    this.numRays    = options.numRays    || 120;

    // Layout — use full width/height
    this.ceilBot   = (this.viewHeight * 0.28) | 0;  // ~134px
    this.wallBot   = (this.viewHeight * 0.75) | 0;  // ~360px
    this.wallZoneH = this.wallBot - this.ceilBot;   // ~226px
    this.floorH    = this.viewHeight - this.wallBot; // ~120px

    this.colW = ((this.viewWidth / this.numRays) | 0) + 1; // ~5px per column

    this.widgets = [];  // wall columns
    this.ceilW  = [];  // ceiling strips
    this.flrW   = [];  // floor strips
    this.ready  = false;

    this.rayAngles = new Float32Array(this.numRays);

    // Precomputed strip depths
    this.stripDistFloor = new Float32Array(12);
    this.stripDistCeil  = new Float32Array(12);
    this.stripFloorDX   = new Float32Array(12);
    this.stripFloorDY   = new Float32Array(12);
    this.stripCeilDX    = new Float32Array(12);
    this.stripCeilDY    = new Float32Array(12);
  }

  // ---- Init: pre-allocate widget pools ----
  init() {
    if (this.ready) return;

    const NUM_CEIL = 12;
    const NUM_FLR  = 12;
    const ceilH    = (this.ceilBot / NUM_CEIL) | 0;
    const flrH     = (this.floorH / NUM_FLR) | 0;

    // Ceiling strips
    for (let i = 0; i < NUM_CEIL; i++) {
      const y = i * ceilH;
      const h = (i === NUM_CEIL - 1) ? this.ceilBot - y : ceilH;
      this.ceilW.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0, y, w: this.viewWidth, h,
        color: C.SKY,
      }));
    }

    // Floor strips
    for (let i = 0; i < NUM_FLR; i++) {
      const y = this.wallBot + i * flrH;
      const h = (i === NUM_FLR - 1) ? this.viewHeight - y : flrH;
      this.flrW.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0, y, w: this.viewWidth, h,
        color: C.FLOOR,
      }));
    }

    // Wall columns
    for (let i = 0; i < this.numRays; i++) {
      const x = (i * this.colW) | 0;
      this.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x, y: this.ceilBot,
        w: this.colW,
        h: 1,
        color: C.BLACK,
      }));
    }

    this._precomputeStripDepths();
    this.ready = true;
    console.log(`Raycaster ready: ${this.numRays} cols, ${NUM_CEIL} ceil, ${NUM_FLR} flr strips`);
  }

  _precomputeStripDepths() {
    const NUM_CEIL = this.ceilW.length;
    const NUM_FLR  = this.flrW.length;
    const halfWall = this.wallZoneH / 2;
    for (let i = 0; i < NUM_FLR; i++) {
      const rowMid = (i + 0.5) / NUM_FLR;
      const offset = rowMid - 0.5;
      this.stripDistFloor[i] = halfWall / (offset + 0.001);
    }
    for (let i = 0; i < NUM_CEIL; i++) {
      const rowMid = (NUM_CEIL - i - 0.5) / NUM_CEIL;
      const offset = rowMid - 0.5;
      this.stripDistCeil[i] = halfWall / (offset + 0.001);
    }
  }

  // ---- Cast a single ray using DDA ----
  _castRay(px, py, rayAngle) {
    let a = rayAngle % TAU;
    if (a < 0) a += TAU;
    const rdx = fastCos(a);
    const rdy = fastSin(a);
    let mx = px | 0;
    let my = py | 0;
    const ddX = Math.abs(1 / rdx) || 1e10;
    const ddY = Math.abs(1 / rdy) || 1e10;
    let sX, sY, sdX, sdY;
    if (rdx < 0) { sX = -1; sdX = (px - mx) * ddX; }
    else          { sX =  1; sdX = (mx + 1 - px) * ddX; }
    if (rdy < 0) { sY = -1; sdY = (py - my) * ddY; }
    else          { sY =  1; sdY = (my + 1 - py) * ddY; }
    let hit = 0, side = 0, wallType = 1;
    while (!hit) {
      if (sdX < sdY) { sdX += ddX; mx += sX; side = 0; }
      else            { sdY += ddY; my += sY; side = 1; }
      if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) { hit = 1; wallType = 1; break; }
      const t = MAP_DATA[my * MAP_WIDTH + mx];
      if (t > 0) { hit = 1; wallType = t; }
    }
    const perpDist = side === 0
      ? Math.abs((mx - px + (1 - sX) / 2) / rdx)
      : Math.abs((my - py + (1 - sY) / 2) / rdy);
    return perpDist;
  }

  // ---- Shade RGB888 color by distance ----
  _shade888(baseColor, dist, sideDim) {
    const sideF = sideDim !== undefined ? sideDim : 1.0;
    const fog = Math.min(1.0, 1.2 / Math.sqrt(dist + 0.5));
    const dim = fog * sideF;
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >>  8) & 0xFF;
    const b = (baseColor >>  0) & 0xFF;
    const nr = (r * dim) | 0;
    const ng = (g * dim) | 0;
    const nb = (b * dim) | 0;
    return ((nr << 16) | (ng << 8) | nb) & 0xFFFFFF;
  }

  // ---- Main render ----
  render(px, py, angle) {
    if (!this.ready) return;

    // Precompute ray angles
    const startAngle = angle - HALF_FOV;
    for (let i = 0; i < this.numRays; i++) {
      this.rayAngles[i] = startAngle + i * ANGLE_STEP;
    }

    const NUM_CEIL = this.ceilW.length;
    const NUM_FLR  = this.flrW.length;
    const leftAngle  = angle - HALF_FOV;
    const rightAngle = angle + HALF_FOV;
    const lrdx = fastCos(rightAngle);
    const lrdy = fastSin(rightAngle);
    const fldx = fastCos(leftAngle);
    const fldy = fastSin(leftAngle);

    // Floor strips
    for (let i = 0; i < NUM_FLR; i++) {
      const dist = this.stripDistFloor[i];
      const cfmx = (px + (fldx + lrdx) * 0.5 * dist);
      const cfmy = (py + (fldy + lrdy) * 0.5 * dist);
      const fmx = cfmx | 0;
      const fmy = cfmy | 0;
      let floorType = 0;
      if (fmx >= 0 && fmx < MAP_WIDTH && fmy >= 0 && fmy < MAP_HEIGHT) {
        if (FLOOR_DATA) floorType = FLOOR_DATA[fmy * MAP_WIDTH + fmx] || 0;
      }
      const color = this._shade888(floorColor(floorType), dist, 1.0);
      this.flrW[i].setProperty(hmUI.prop.FILL_COLOR, { color });
    }

    // Ceiling strips
    for (let i = 0; i < NUM_CEIL; i++) {
      const dist = this.stripDistCeil[i];
      const skyBase = dist < 8 ? C.SKY : C.SKY_HORIZON;
      const color = this._shade888(skyBase, dist, 1.0);
      this.ceilW[i].setProperty(hmUI.prop.FILL_COLOR, { color });
    }

    // Wall columns
    for (let i = 0; i < this.numRays; i++) {
      const dist = this._castRay(px, py, this.rayAngles[i]);
      const side = 0; // simplified
      let wallH = ((this.wallZoneH / dist) | 0);
      if (wallH > this.wallZoneH) wallH = this.wallZoneH;
      if (wallH < 1) wallH = 1;
      const wallY = this.ceilBot + (((this.wallZoneH - wallH) >> 1) | 0);
      const sideDim = side === 1 ? 0.65 : 1.0;
      const color = this._shade888(wallColor(1), dist, sideDim);
      this.widgets[i].setProperty(hmUI.prop.Y, { y: wallY });
      this.widgets[i].setProperty(hmUI.prop.H, { h: wallH });
      this.widgets[i].setProperty(hmUI.prop.COLOR, { color });
    }
  }
}
