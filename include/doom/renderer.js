// renderer.js — Column-based raycasting renderer for Zepp OS
//
// Screen layout (360x360):
//   Ceiling:  y=0   → y=CU_Y    (~100px, top ~28%)
//   Wall zone: y=CU_Y → y=WALL_BOT  (~160px, middle ~44%)
//   Floor:    y=WALL_BOT → y=360  (~100px, bottom ~28%)

import { MAP_DATA, MAP_WIDTH, MAP_HEIGHT, FLOOR_DATA } from './map.js';

// ---- Color palette (RGB565) ----
export const C = {
  BLACK:       0x000000,
  DARK_GRAY:   0x404040,
  MID_GRAY:    0x808080,
  LIGHT_GRAY:  0xC0C0C0,
  WHITE:       0xFFFFFF,
  RED:         0xCC22,
  DARK_RED:    0x6611,
  GREEN:       0x22C2,
  DARK_GREEN:  0x1661,
  BLUE:        0x225A,
  DARK_BLUE:   0x1225,
  YELLOW:      0xCCC2,
  CYAN:        0x2CC,
  ORANGE:      0xC82,
  BROWN:       0x642,
  // Doom-ish sky (dark blue-purple gradient) and floor
  SKY:         0x0D20,    // very dark blue-purple
  SKY_HORIZON: 0x1A18,    // lighter at horizon
  FLOOR:       0x11108,   // dark brown
  FLOOR_LIGHT: 0x22110,   // lighter brown variant
};

// Wall colors by type (RGB565)
const WALL_COLORS = [
  C.DARK_GRAY,   // type 1 — solid outer walls
  C.MID_GRAY,    // type 2 — interior lighter walls
  C.DARK_RED,    // type 3 — accent walls
  C.DARK_GREEN,  // type 4 — accent walls
  C.DARK_BLUE,   // type 5
  C.ORANGE,      // type 6
];

// Floor/ceiling colors by type
const FLOOR_COLORS = [
  C.FLOOR,       // type 0 — default dark floor
  C.FLOOR_LIGHT, // type 1 — lighter floor
  0x2211,        // type 2 — tan
  0x1142,        // type 3 — blue-gray
  0x2211,        // type 4 — tan variant
  0x2211,        // type 5 — tan variant
];

function wallColor(type) {
  return WALL_COLORS[(type - 1) % WALL_COLORS.length] || C.DARK_GRAY;
}
function floorColor(type) {
  return FLOOR_COLORS[type % FLOOR_COLORS.length] || C.FLOOR;
}

// ---- Precomputed trig tables ----
const NUM_RAYS  = 120;
const FOV       = Math.PI / 3;
const HALF_FOV  = FOV / 2;
const ANGLE_STEP = FOV / NUM_RAYS;
const TAU        = Math.PI * 2;
const PREC       = 64;

const SIN_TABLE = new Float32Array(360 * PREC);
const COS_TABLE = new Float32Array(360 * PREC);

(function buildTables() {
  for (let i = 0; i < 360 * PREC; i++) {
    const a = (i / PREC) % TAU;
    SIN_TABLE[i] = Math.sin(a);
    COS_TABLE[i] = Math.cos(a);
  }
})();

function fastSin(a) {
  const idx = ((a % TAU) * PREC) | 0;
  return SIN_TABLE[idx < 0 ? idx + SIN_TABLE.length : idx];
}
function fastCos(a) {
  const idx = ((a % TAU) * PREC) | 0;
  return COS_TABLE[idx < 0 ? idx + COS_TABLE.length : idx];
}

// ---- Renderer ----
export class Renderer {
  constructor(options = {}) {
    this.viewWidth   = options.viewWidth  || 360;
    this.viewHeight  = options.viewHeight || 360;
    this.numRays     = options.numRays   || NUM_RAYS;

    // Layout
    this.cuY       = 0;
    this.ceilBot   = Math.floor(this.viewHeight * 0.28);   // ~100px
    this.wallBot   = Math.floor(this.viewHeight * 0.72);   // ~259px
    this.wallZoneH = this.wallBot - this.ceilBot;           // ~159px
    this.floorH    = this.viewHeight - this.wallBot;        // ~101px

    this.colW = Math.ceil(this.viewWidth / this.numRays);   // ~3px/column

    this.widgets = [];   // wall columns
    this.ceilW   = [];    // ceiling strips
    this.flrW    = [];    // floor strips
    this.ready   = false;

    // Per-frame data
    this.rayAngles      = new Float32Array(this.numRays);
    this.stripDistFloor = null;  // precomputed floor strip distances
    this.stripDistCeil  = null;  // precomputed ceiling strip distances
    this.stripFloorDX   = null;  // floor ray dir X components
    this.stripFloorDY   = null;  // floor ray dir Y components
    this.stripCeilDX    = null;
    this.stripCeilDY    = null;
  }

  // ---- Init: pre-allocate all widget pools ----
  init() {
    if (this.ready) return;

    // Ceiling strips
    const NUM_CEIL = 16;
    const ceilH = Math.ceil(this.ceilBot / NUM_CEIL);
    for (let i = 0; i < NUM_CEIL; i++) {
      const y = this.cuY + i * ceilH;
      const h = (i === NUM_CEIL - 1) ? this.ceilBot - y : ceilH;
      this.ceilW.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0, y, w: this.viewWidth, h,
        color: C.SKY,
      }));
    }

    // Floor strips
    const NUM_FLR = 16;
    const flrH = Math.ceil(this.floorH / NUM_FLR);
    for (let i = 0; i < NUM_FLR; i++) {
      const y = this.wallBot + i * flrH;
      const h = (i === NUM_FLR - 1) ? (this.viewHeight - y) : flrH;
      this.flrW.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0, y, w: this.viewWidth, h,
        color: C.FLOOR,
      }));
    }

    // Wall columns
    for (let i = 0; i < this.numRays; i++) {
      const x = Math.floor(i * this.colW);
      this.widgets.push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x, y: this.ceilBot,
        w: this.colW + 1,
        h: 1,
        color: C.BLACK,
      }));
    }

    // Precompute floor/ceiling strip distances (static — only depends on strip index)
    this._precomputeStripDepths();

    this.ready = true;
    console.log(`Raycaster ready: ${this.numRays} cols, ${this.ceilW.length} ceil, ${this.flrW.length} flr strips`);
    console.log(`Zones: ceil=0-${this.ceilBot} wall=${this.ceilBot}-${this.wallBot} floor=${this.wallBot}-${this.viewHeight}`);
  }

  // Precompute the perpendicular distance to each floor/ceiling strip.
  // This is static — doesn't change with player position.
  _precomputeStripDepths() {
    const NUM_CEIL = this.ceilW.length;
    const NUM_FLR  = this.flrW.length;
    const halfWallZone = this.wallZoneH / 2;

    this.stripDistFloor = new Float32Array(NUM_FLR);
    this.stripDistCeil  = new Float32Array(NUM_CEIL);
    this.stripFloorDX   = new Float32Array(NUM_FLR);
    this.stripFloorDY   = new Float32Array(NUM_FLR);
    this.stripCeilDX    = new Float32Array(NUM_CEIL);
    this.stripCeilDY    = new Float32Array(NUM_CEIL);

    // Floor: rows 0..NUM_FLR-1 map to distances from WALL_BOT+epsilon to infinity
    for (let i = 0; i < NUM_FLR; i++) {
      // Strip i covers the range [i/NUM_FLR, (i+1)/NUM_FLR) of the floor zone
      // Use midpoint of strip for distance
      const rowMid = (i + 0.5) / NUM_FLR;  // 0.5/NUM_FLR .. (NUM_FLR-0.5)/NUM_FLR
      // rowMid=0 → very close (just below wall), rowMid=1 → horizon/far
      // Distance formula (similar triangles): d = halfWallZone / (rowMid - 0.5)
      // But we need rowMid offset from the horizon line
      // rowRel = rowMid * floorH (pixel offset from WALL_BOT)
      // For floor at depth z: tan(theta) = rowRel / z
      // z = rowRel / tan(theta_max) where theta_max = angle to bottom of screen
      // Use: z = halfWallZone / (rowMid - 0.5 + epsilon)
      const offset = rowMid - 0.5;  // -0.5..+0.5
      this.stripDistFloor[i] = halfWallZone / (offset + 0.001);
    }

    // Ceiling: symmetric, but reversed (strip 0 = top of ceiling = far, strip N-1 = near)
    for (let i = 0; i < NUM_CEIL; i++) {
      // Strip i covers range [(NUM_CEIL-1-i)/NUM_CEIL, ...] of ceiling zone
      // From the player's POV looking up: strip 0 is far (horizon), strip N-1 is near
      const rowMid = (NUM_CEIL - i - 0.5) / NUM_CEIL;  // 0.5/NUM_CEIL .. (NUM_CEIL-0.5)/NUM_CEIL
      const offset = rowMid - 0.5;
      this.stripDistCeil[i] = halfWallZone / (offset + 0.001);
    }
  }

  // ---- Cast a single ray using DDA ----
  _castRay(px, py, rayAngle) {
    let a = rayAngle % TAU;
    if (a < 0) a += TAU;

    const rdx = fastCos(a);
    const rdy = fastSin(a);

    let mx = Math.floor(px);
    let my = Math.floor(py);

    const ddX = Math.abs(1 / rdx);
    const ddY = Math.abs(1 / rdy);
    let sX, sY, sdX, sdY;

    if (rdx < 0) { sX = -1; sdX = (px - mx) * ddX; }
    else          { sX =  1; sdX = (mx + 1 - px) * ddX; }
    if (rdy < 0) { sY = -1; sdY = (py - my) * ddY; }
    else          { sY =  1; sdY = (my + 1 - py) * ddY; }

    let hit = 0, side = 0, wallType = 0;
    while (!hit) {
      if (sdX < sdY) { sdX += ddX; mx += sX; side = 0; }
      else            { sdY += ddY; my += sY; side = 1; }
      if (mx < 0 || mx >= MAP_WIDTH || my < 0 || my >= MAP_HEIGHT) { hit = 1; wallType = 1; }
      else if (MAP_DATA[my * MAP_WIDTH + mx] > 0) { hit = 1; wallType = MAP_DATA[my * MAP_WIDTH + mx]; }
    }

    const perpDist = side === 0
      ? Math.abs((mx - px + (1 - sX) / 2) / rdx)
      : Math.abs((my - py + (1 - sY) / 2) / rdy);

    let wallX;
    if (side === 0) { wallX = py + perpDist * rdy; }
    else            { wallX = px + perpDist * rdx; }
    wallX -= Math.floor(wallX);

    return { dist: perpDist, wallType, side, wallX };
  }

  // ---- Shading (RGB565) ----
  // dist: perpendicular world distance
  // baseColor: RGB565 color
  // sideDim: 1.0 for facing walls, <1.0 for side-grazed walls
  _shade(baseColor, dist, sideDim) {
    const sideF = sideDim !== undefined ? sideDim : 1.0;
    const fog = 1.0 / Math.sqrt(dist + 0.5);
    const dim = Math.min(1.0, fog * 1.2) * sideF;

    const r = (baseColor >> 11) & 0x1F;
    const g = (baseColor >>  6) & 0x1F;
    const b = (baseColor >>  1) & 0x1F;

    const nr = (r * dim) | 0;
    const ng = (g * dim) | 0;
    const nb = (b * dim) | 0;

    return ((nr << 11) | (ng << 6) | (nb << 1) | 0x01) & 0xFFFF;
  }

  // Floor/ceiling shade — no side dimming, just distance fog
  _shadeFC(baseColor, dist) {
    const fog = 1.0 / Math.sqrt(dist + 1.0);
    const dim = Math.min(0.95, fog * 1.3);

    const r = (baseColor >> 11) & 0x1F;
    const g = (baseColor >>  6) & 0x1F;
    const b = (baseColor >>  1) & 0x1F;

    const nr = (r * dim) | 0;
    const ng = (g * dim) | 0;
    const nb = (b * dim) | 0;

    return ((nr << 11) | (ng << 6) | (nb << 1) | 0x01) & 0xFFFF;
  }

  // ---- Main render ----
  render(px, py, angle) {
    if (!this.ready) return;

    // Precompute ray angles
    const startAngle = angle - HALF_FOV;
    for (let i = 0; i < this.numRays; i++) {
      this.rayAngles[i] = startAngle + i * ANGLE_STEP;
    }

    // --- Floor & Ceiling strips ---
    // Sample floor/ceiling texture per strip using center-ray direction
    const NUM_CEIL = this.ceilW.length;
    const NUM_FLR  = this.flrW.length;

    // Left and right ray directions for floor interpolation
    const leftAngle  = angle - HALF_FOV;
    const rightAngle = angle + HALF_FOV;
    const lrdx = fastCos(rightAngle);   // right ray dir X
    const lrdy = fastSin(rightAngle);   // right ray dir Y
    const fldx = fastCos(leftAngle);    // left ray dir X (note: left, not right)
    const fldy = fastSin(leftAngle);    // left ray dir Y

    // Floor: interpolate between left-ray floor hit and right-ray floor hit per strip
    for (let i = 0; i < NUM_FLR; i++) {
      const dist = this.stripDistFloor[i];

      // World position of floor hit at this distance along left and right rays
      const lfx = px + fldx * dist;
      const lfy = py + fldy * dist;
      const rfx = px + lrdx * dist;
      const rfy = py + lrdy * dist;

      // Interpolate across screen width to get center world position
      const cfmx = (lfx + rfx) * 0.5;
      const cfmy = (lfy + rfy) * 0.5;

      // Sample floor type from map
      const fmx = Math.floor(cfmx);
      const fmy = Math.floor(cfmy);
      let floorType = 0;
      if (fmx >= 0 && fmx < MAP_WIDTH && fmy >= 0 && fmy < MAP_HEIGHT) {
        if (FLOOR_DATA) {
          floorType = FLOOR_DATA[fmy * MAP_WIDTH + fmx] || 0;
        }
      }

      const baseColor = floorColor(floorType);
      const color = this._shadeFC(baseColor, dist);

      this.flrW[i].setProperty(hmUI.prop.FILL_COLOR, { color });
    }

    // Ceiling: interpolate between left-ray ceiling hit and right-ray ceiling hit
    for (let i = 0; i < NUM_CEIL; i++) {
      const dist = this.stripDistCeil[i];

      const lcx = px + fldx * dist;
      const lcy = py + fldy * dist;
      const rcx = px + lrdx * dist;
      const rcy = py + lrdy * dist;

      const ccx = (lcx + rcx) * 0.5;
      const ccy = (lcy + rcy) * 0.5;

      // Ceiling color: sky gradient based on distance
      // Closer = darker sky, farther = lighter at horizon
      const nearSkyColor  = C.SKY;
      const farSkyColor   = C.SKY_HORIZON;
      // Interpolate sky color by distance
      const skyT = Math.min(1.0, dist / 20.0);
      const skyBase = this._lerp565(nearSkyColor, farSkyColor, skyT);
      const color = this._shadeFC(skyBase, dist);

      this.ceilW[i].setProperty(hmUI.prop.FILL_COLOR, { color });
    }

    // --- Wall columns ---
    for (let i = 0; i < this.numRays; i++) {
      const { dist, wallType, side } = this._castRay(px, py, this.rayAngles[i]);

      let wallH = (this.wallZoneH / dist) | 0;
      if (wallH > this.wallZoneH) wallH = this.wallZoneH;
      if (wallH < 1) wallH = 1;

      let wallY = this.ceilBot + ((this.wallZoneH - wallH) >> 1);
      if (wallY < this.ceilBot) wallY = this.ceilBot;

      const sideDim = side === 1 ? 0.65 : 1.0;
      const baseColor = wallColor(wallType);
      const color = this._shade(baseColor, dist, sideDim);

      this.widgets[i].setProperty(hmUI.prop.MORE, {
        y: wallY,
        h: wallH,
        color,
      });
    }
  }

  // Linear interpolate two RGB565 colors
  _lerp565(c1, c2, t) {
    const r1 = (c1 >> 11) & 0x1F, g1 = (c1 >> 6) & 0x1F, b1 = (c1 >> 1) & 0x1F;
    const r2 = (c2 >> 11) & 0x1F, g2 = (c2 >> 6) & 0x1F, b2 = (c2 >> 1) & 0x1F;
    const nr = (r1 + (r2 - r1) * t) | 0;
    const ng = (g1 + (g2 - g1) * t) | 0;
    const nb = (b1 + (b2 - b1) * t) | 0;
    return ((nr << 11) | (ng << 6) | (nb << 1) | 0x01) & 0xFFFF;
  }

  clear() {
    if (!this.ready) return;
    for (let i = 0; i < this.widgets.length; i++) {
      this.widgets[i].setProperty(hmUI.prop.FILL_COLOR, { color: C.BLACK });
    }
  }
}
