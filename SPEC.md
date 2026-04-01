# SPEC.md — zepp-doom

**Project:** Doom port for Zepp OS watches (Amazfit Bip 6 and compatible)
**Started:** 2026-03-31
**Status:** Early research phase

---

## 1. Project Overview

Port the classic Doom engine (id Tech 1) to run as a Mini Program on Zepp OS watches.
Goal: Playable Doom on a watch screen (~360x360), highly optimized, starting from a proof-of-concept that runs slowly and iteratively improving.

---

## 2. Target Hardware

### Amazfit Bip 6 (assumed specs based on Bip series)
- **CPU:** ARM Cortex-A55 (64-bit) — dual-core ~1GHz (estimated)
- **RAM:** 64MB (Bip series is budget — may be 32-64MB)
- **Display:** ~360x360 or 416x416 pixels, square LCD
- **OS:** Zepp OS 5 (API_LEVEL 4.2)
- **Battery:** ~300mAh (not relevant for dev)

### Other Zepp OS devices we can target later:
- Amazfit GTR/GTS series (higher res, more RAM)
- Amazfit T-Rex (rugged, larger display)
- Amazfit Balance (premium)

---

## 3. Zepp OS Development Environment

### Languages & Framework
- **Language:** JavaScript/TypeScript
- **Framework:** Zepp OS Mini Program framework (NOT web — no DOM, no Canvas 2D)
- **Build tool:** Zeus CLI (`npm i -g @zeppos/zeus-cli`)
- **Dev flow:** `zeus dev` compiles + connects to Device Simulator for live preview
- **UI system:** Widget-based declarative UI (no HTML/CSS equivalents)
- **API_LEVEL:** 4.2 (current)

### Simulator
- Separate desktop app (not bundled with CLI)
- Download: https://docs.zepp.com/docs/guides/tools/simulator/download/
- Linux AMD64 DEB: `simulator_2.1.0_amd64.deb`
- Runs on macOS/Windows/Linux
- Requires virtual network card configuration on Windows/Linux

### Key APIs for Game Dev
- `timer.createTimer` — game loop (Pong runs at 30fps using this)
- `hmUI` — widget system for UI
- Widget types: `TEXT`, `IMAGE`, `CIRCLE`, `RECT`, `FILL_RECT`, `STROKE_RECT`, `LINE`, `POLYLINE`
- No WebGL, no Canvas 2D
- Images must be pre-loaded assets (.png)

### Sound
- `AudioPlayer` for audio playback (MP3/OGG)
- Can preload sounds as assets

### Storage
- App assets bundled at compile time
- `hmFS` for file system access
- LocalStorage API for small key-value data

---

## 4. Graphics Architecture: The Hard Constraint

**CRITICAL:** Zepp OS has NO Canvas 2D API and NO WebGL.

The framework uses **widgets** — declarative UI elements:
- `TEXT` — display text
- `IMAGE` — display pre-loaded PNG images
- `CIRCLE` — circle outline or filled
- `RECT` / `FILL_RECT` / `STROKE_RECT` — rectangles
- `LINE` — single line
- `POLYLINE` — connected line segments (viewport limited to ~150px)
- `ARC` — arc shapes

**easy-draw library** (community): Extends capabilities using `FILL_RECT` to draw arbitrary lines by treating pixels as tiny rectangles. This is what we'd use for Doom's raycasting.

**Key insight from easy-draw:**
- Lines are drawn by computing Bresenham-style line algorithms
- Each "pixel" is actually a FILL_RECT widget
- The viewport issue with POLYLINE can be bypassed
- Lines are NOT pixel-perfect (expected behavior)
- Drawing arbitrary pixels at scale will be VERY slow

**Approach for Doom:**
1. Raycast the view into a small internal buffer (maybe 90x90 or 45x45)
2. Use easy-draw's `draw.line()` or direct FILL_RECT to render each "pixel" as a small rectangle
3. At 90x90 @ 30fps = 243,000 FILL_RECT operations per second — likely too slow
4. Need to reduce to maybe 10-15fps with smaller resolution

---

## 5. DOOM Engine Analysis

### Original DOOM (id Tech 1) Requirements
- **CPU:** 386SX @ 25MHz (original 1993)
- **RAM:** 4MB (DOS)
- **Display:** 320x200 (and 640x480 for VGA mode)
- **FPS:** ~35fps on recommended spec

### What must change for watch
| Component | Original | Watch Target |
|-----------|----------|--------------|
| Resolution | 320x200 | 45x45 to 90x90 (raycast buffer) |
| Color depth | 256 color palette | 32-color palette (or less) |
| Raycasting | Full 320 rays/frame | 45-90 rays/frame |
| Sprites | Full resolution | Scaled down or eliminated |
| Sound | SoundBlaster | Zepp OS AudioPlayer |
| WAD data | ~2-20MB | Must be embedded or minimized |
| FPS | 35fps target | 10-15fps target (acceptable) |
| Map format | BSP + nodes | Simplified or eliminated BSP |

### Rendering Pipeline for Watch
1. **Input** — D-pad/button input for movement
2. **Player update** — Move player, check collisions (simplified)
3. **Raycast** — Cast N rays (one per column of our buffer)
4. **Wall rendering** — Draw wall slices as vertical strips
5. **Floor/ceiling** — Skip or solid color (huge simplification)
6. **Sprite rendering** — Skip or 2D minimap only
7. **HUD** — Weapon (text), health/ammo (numbers)

### Data Size Reduction
- WAD file is too large — need a minimal test level
- Can embed a tiny hand-crafted map in JS
- No texture support initially (solid colors only)
- No music initially (sound effects optional)

---

## 6. Existing Game Ports for Reference

On Zepp OS, games already exist:
- **zepp-pong** (Berezza98) — Pong clone, 30fps, uses images for ball and walls
- **color-switch** — Color Switch clone
- **Zepp-CircleWars** — Another game

These use image-based rendering, NOT pixel-by-pixel drawing.

**No one has attempted Doom on Zepp OS** (to our knowledge).

---

## 7. Implementation Plan

### Phase 1: Foundation (NOW)
- [x] Set up project structure with Zeus CLI
- [x] Download and set up simulator
- [x] Create minimal app that renders to screen
- [ ] Implement 45x45 raycasted view using FILL_RECT
- [ ] Get player movement working (up/down/turn)
- [ ] Basic wall collision

### Phase 2: Proof of Concept
- [ ] Render at 5fps minimum
- [ ] 8-color palette
- [ ] Simple test map (no BSP, no nodes)
- [ ] Basic HUD (health, ammo as numbers)
- [ ] Sound effects (optional)

### Phase 3: Optimization (iterative)
- [ ] Increase resolution if possible
- [ ] Increase framerate if possible
- [ ] Profiling to find bottlenecks
- [ ] Optimize raycasting algorithm
- [ ] Reduce FILL_RECT overhead

### Phase 4: Features
- [ ] Enemies (simplified: shooting + basic AI)
- [ ] Weapons
- [ ] Multiple levels (data in JS)
- [ ] Save/load state

---

## 8. Project Structure

```
zepp-doom/
├── SPEC.md                    # This file
├── README.md                  # Project overview
├── RESEARCH.md                # Technical research notes
├── package.json
├── app.json                   # Zepp OS app config
├── jsconfig.json
├── app.js                     # App entry point
├── page/                      # Pages (Zepp OS uses page-based navigation)
│   └── doom/
│       ├── index.js           # Main game page
│       └── index.layout.js    # Layout (widgets defined declaratively)
├── include/                   # Shared code
│   ├── doom/                  # Doom engine
│   │   ├── engine.js          # Core raycasting engine
│   │   ├── player.js          # Player state + movement
│   │   ├── input.js           # Input handling
│   │   ├── renderer.js        # Widget-based renderer
│   │   ├── map.js             # Map data + collision
│   │   └── hud.js             # Heads-up display
│   ├── utils/
│   │   └── helpers.js
│   └── assets/
│       └── palette.js         # Color definitions
└── assets/                    # Preloaded images (minimal initially)
    └── icon.png
```

---

## 9. Key Technical Decisions

### Resolution
Start at 45x45 raycast buffer. Each "pixel" = 1 FILL_RECT.
At 45x45 @ 10fps = 20,250 FILL_RECTs/sec (might be manageable).

If too slow, drop to 30x30.
If fast enough, try 60x60 or 90x90.

### Map Format
Hand-crafted JS object, no external files:
```js
const MAP = {
  width: 16,
  height: 16,
  data: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
          1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
          ...]
};
```

### Color Palette
8-32 colors max. Use Zepp OS constants.
```js
const COLORS = {
  BLACK: 0x000000,
  DARK_GRAY: 0x404040,
  LIGHT_GRAY: 0x808080,
  WHITE: 0xFFFFFF,
  RED: 0xFF0000,
  GREEN: 0x00FF00,
  BLUE: 0x0000FF,
  YELLOW: 0xFFFF00,
};
```

### Game Loop
```js
const FPS = 10; // Start slow, increase if possible
timer.createTimer(0, 1000 / FPS, () => {
  processInput();
  updatePlayer();
  render();
});
```

---

## 10. Bottleneck Analysis

**Expected bottlenecks (in order):**
1. FILL_RECT widget creation — each frame requires hundreds of widget creates
2. Raycasting math — JS is slower than C
3. Memory — 64MB is very tight
4. No hardware acceleration — everything is software

**Mitigation strategies:**
- Pre-create all widgets, reuse them (update position/color)
- Use bitwise operations where possible
- Reduce ray count to minimum
- Use integer math (avoid floats)
- Consider precomputed lookup tables for trigonometry

---

## 11. Inspirations & Related Ports

- **DOOM on Fitbit Ionic** — Fitbit OS is similar constraint level
- **DOOM on Apple Watch** — Series 2 could run ~10fps
- **Wolfenstein on Pebble** — Very constrained, similar approach
- **zepp-pong** — Reference implementation for game loop

---

## 12. External Resources

- [Zepp OS Docs](https://docs.zepp.com/docs/intro/)
- [Zeus CLI Guide](https://docs.zepp.com/docs/guides/tools/cli/)
- [Simulator Download](https://docs.zepp.com/docs/guides/tools/simulator/download/)
- [easy-draw library](https://github.com/zepp-health/easy-draw) — Arbitrary line drawing
- [autogui library](https://github.com/zepp-health/autogui) — Widget wrapper
- [zepp-pong](https://github.com/Berezza98/zepp-pong) — Reference game
- [awesome-zeppos](https://github.com/zepp-health/awesome-zeppos) — Community resources
- [Zepp OS Discord](https://t.zepp.com/t/b6e70)
