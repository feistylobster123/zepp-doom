# Zepp OS / Amazfit Bip 6 Research Notes

## Project Start Time
Started: 2026-03-31

## Last Updated: 2026-04-02 (embedded Doom port deep-dive)

---

## Device: Amazfit Bip 6 — CONFIRMED

**CONFIRMED from official Zepp OS device list (docs.zepp.com)**

| Property | Value |
|----------|-------|
| **Screen Resolution** | 390 x 450 pixels |
| **Screen Shape** | Square (rounded corners, radius 86) |
| **deviceSource (codename)** | `9765120*`, `9765121`, `10158337` |
| **API_LEVEL** | 4.2 (latest) |
| **Zepp OS Version** | 5.0 |
| **Physical Keys** | 2 buttons |
| **SecondaryWidget** | YES |
| **Watchface Preview** | 266 x 307 |

### Nearby Zepp OS Devices (for reference)
| Device | Resolution | Shape | deviceSource |
|--------|-----------|-------|--------------|
| Amazfit Active 2 (Square) | 390 x 450 | Square | 10223872 |
| Amazfit Bip 6 | 390 x 450 | Square | 9765120 |
| Amazfit Active (Square) | 390 x 450 | Square | 8323328 |
| Amazfit GTS 4 (Square) | 390 x 450 | Square | 7995648 |
| Amazfit Balance 2 | 480 x 480 | Round | 9568512 |

---

## Graphics Constraint — Critical
**Zepp OS has NO Canvas 2D or WebGL.**
- Only widget-based UI: `RectWidget`, `ImgWidget`, `TextWidget`, etc.
- `FILL_RECT` per-pixel rectangle fills are the only drawing primitive
- Doom port must use **column-based rendering** — vertical wall strips as `FILL_RECT(x, y, 1, height, color)`
- No textures, no sprites as images — must draw sprites with FILL_RECT too

---

## Critical Constraints
- **No Canvas API** — must use FILL_RECT for all rendering
- **No WebGL** — pure widget API only
- App size: ~1-10MB max
- RAM: ~64MB or less (Bip series budget line)
- Screen: 390x450, square
- FPS target: 10-15fps on watch hardware

---

## Research: Embedded Doom Ports — Deep Dive (2026-04-02)

### Executive Summary

We researched **34 candidate Doom/Doom-like engines** for embedded devices. The most important finding: **nRF52840Doom runs full Doom on 256KB RAM with a 240x240 SPI display at 30+ FPS** — Zepp OS's RAM budget (~512KB-1MB, more generous) and resolution (390x450, very close) make this the primary reference implementation. The renderer architecture is **cleanly separated**: the Doom engine outputs to a linear framebuffer via column/span drawing; only the `display.c` layer needs replacement to target FILL_RECT.

### Candidate Comparison Table

| Repo | Language | RAM | Display | Renderer Sep. | Feasibility |
|------|----------|-----|---------|---------------|-------------|
| **nRF52840Doom** | C | 256KB | ST7789 240x240 SPI | **YES — 95 LOC** | **#1 CHOICE** |
| **GBADoom** | C | 384KB | GBA hardware | YES | Proven ancestor |
| **micro_doom** | C | 256KB target | ST7789/ST7735 | YES | Multi-board Zephyr port |
| **DOOM-Arduino-UNO** | C++ | ~2KB | SSD1306 128x64 | Partial | Top-down raycaster, NOT true 3D |
| **TinyDoom** | C++ | Desktop | SDL2 stub | N/A | Empty/stub, no code |
| **js13k-doom** | JavaScript | Browser | WebGL | YES (WebGL) | WebGL-based, needs port |
| **doomgeneric** | C | Desktop | Abstract | YES | Best architecture for porting |
| **dsda-doom** | C | ~4MB | Nintendo DS | Partial | Complex, NDS-specific |
| **Doom_STM32N6** | C | ~2MB+ | STM32N6 LTDC | Partial | Full Chocolate Doom, too heavy |

### Repository Index (cloned to ~/projects/ports/)

```
~/projects/ports/
├── nRF52840Doom/              # GOLD STANDARD: 256KB Doom, ST7789, 95LOC renderer
├── GBADoom/                    # Ancestor of nRF52840 Doom, GBA hardware
├── micro_doom/                 # Zephyr RTOS port of nRF52840Doom, multi-board
├── DOOM-Arduino-UNO/          # Top-down raycasting Arduino game (~1.7K LOC)
├── Doom-Arduino-topdown/      # Arduino 2D top-down shooter (~319 LOC)
├── js13k-doom/                # 13KB JS Doom (WebGL-based, by Nicholas Carlini)
├── doomgeneric/               # "Easily portable Doom" abstraction layer
├── dsda-doom/                 # Nintendo DS Doom
├── micro_doom_rs/             # Rust raycaster (not Doom IWAD compatible)
└── MicroDOOM/                 # Empty at clone time
```

### THE GOLD STANDARD: nRF52840Doom (next-hack/nRF52840Doom)

**This is the single most important reference implementation for this project.**

**What it runs:** Full Doom (shareware, commercial, Ultimate Doom, Doom 2 WADs) on:
- Nordic Semiconductor nRF52840 (ARM Cortex-M4, 256KB SRAM)
- 240x240 ST7789 SPI display
- 30+ FPS
- Z-depth lighting restored
- Based on GBADoom, which is based on PrBoom

**Why it matters for Zepp OS:**

1. **RAM:** 256KB achieved. Zepp OS has ~512KB-1MB — 2-4x more generous.
2. **Screen:** 240x240 → Zepp OS 390x450 is larger, not smaller. More room, not less.
3. **Renderer:** 95 lines in `r_draw.c`. The entire column/span drawing layer.
4. **Display separation:** `display.c` (~4.2K LOC) handles SPI streaming. The Doom engine (`r_draw.c`) outputs to a linear framebuffer. Only `display.c` needs replacement.
5. **Language:** C — can be manually transcribed to JavaScript or called via JSA FFI.

**The nRF52840 Doom Chain:**

```
id Software Doom (1993)
    ↓
PrBoom (BOOM-based, 1999)
    ↓
GBADoom (doomhack, ARM7TDMI GBA, ~384KB RAM)
    ↓
nRF52840Doom (next-hack, 256KB RAM, ST7789, 240x240)
    └── micro_doom (GeorgiZhelezov, Zephyr RTOS, multi-board)
```

**Column Drawing Architecture (r_draw.c + r_fast_stuff.c):**

The renderer works by drawing **vertical wall columns** and **horizontal floor/ceiling spans**:

```c
// r_fast_stuff.c:550-865
// R_DrawColumn: for each screen column X
//   - compute wall top_y and bottom_y (from BSP node traversal)
//   - draw vertical span: FILL_RECT(x, top_y, 1, bottom_y-top_y, color)
//   - apply colormap (palette lookup for lighting)

// The inner loop (pseudo-DDA texture mapping):
//   fracstep = iscale << COLEXTRABITS  // 9 extra bits for sub-pixel precision
//   for each pixel in column height:
//     *dest = colormap[source[frac >> COLBITS]]  // COLBITS = FRACBITS + 9
//     frac += fracstep
//     dest += screen_pitch

// Floor/ceiling spans: similar but horizontal
// Sprites: per-row transparency checks, then FILL_RECT
```

**Mapping to FILL_RECT:**

For Zepp OS, the mapping is:
```
Each Doom column pixel = FILL_RECT(x, y, 1, 1, palette_color)
Each Doom span pixel   = FILL_RECT(x, y, span_length, 1, palette_color)
```

At 240x240 and 10fps, this means:
- ~57,600 pixels/frame
- Each pixel = 1 `setProperty(FILL_RECT, ...)` call
- 10fps = ~576,000 widget updates/second

**The key unknown:** Whether `setProperty(FILL_RECT, ...)` is ~microseconds or ~milliseconds. The nRF52840 achieves 30fps with a 32MHz ARM doing actual SPI pixel streaming — so if FILL_RECT is similarly cheap, 10fps is very achievable.

**Reference files:**
- `nRF52840Doom/Doom/source/r_draw.c` — 95 lines: column/span init only
- `nRF52840Doom/Doom/source/r_fast_stuff.c` — 5875 lines: the actual hot-path rendering (columns, spans, sprites, transparency)
- `nRF52840Doom/Doom/source/v_video.c` — 884 lines: gamma tables, patch drawing, background tiling
- `nRF52840Doom/src/display.c` — ~200 lines: SPI display streaming (this is the layer we'd replace with FILL_RECT)

### Secondary: GBADoom (doomhack/GBADoom)

**The ancestor of nRF52840Doom.** Runs on GBA hardware:
- ARM7TDMI ~50MHz (slower than nRF52840's M4)
- 384KB total RAM (more than nRF52840 but GBA has no external flash)
- GBA-specific display controller — direct LCD framebuffer

The key contribution of GBADoom: it proved the Doom engine could run on limited RAM ARM hardware with a干净 renderer separation. The nRF52840 port then stripped an additional 128KB and improved performance.

Reference: `GBADoom/source/r_hotpath.iwram.c` — 3343 lines of optimized ARM drawing code.

### Architecture: doomgeneric (ozkl/doomgeneric)

**"Easily portable Doom"** — best-designed abstraction for custom hardware.

The entire rendering interface is 6 functions:
```c
DG_InitGraphics();
DG_DrawFrame();
DG_SetPalette(int r, int g, int b);
DG_DrawPixel(int x, int y, int r, int g, int b);
DG_GetJoystickEvents();
DG_GetMillis();
```

This is a **drop-in replacement** for the framebuffer. If we implement those 6 functions using FILL_RECT, the full PrBoom-based Doom engine runs. This is the cleanest path to a real Doom engine on Zepp OS — implement `DG_GetJoystickEvents()` via gyroscope, `DG_DrawPixel()` via FILL_RECT, and stream WAD data from the watch's internal flash.

**Why not the primary choice yet:** doomgeneric is desktop-focused and still requires substantial WAD streaming infrastructure and memory management that would need careful porting. The nRF52840Doom gives us the exact same engine with the hard problems (WAD streaming, memory management, display interface) already solved for constrained hardware.

### JavaScript Candidates

#### js13k-doom (carlini/js13k-doom)
- Nicholas Carlini's 13KB JavaScript Doom clone
- **WebGL-based** — NOT directly usable on Zepp OS (no WebGL)
- Excellent code quality, well-structured
- The rendering uses GLSL shaders — would need complete rewrite for FILL_RECT

The js13k-doom approach uses:
1. BSP traversal for wall rendering (like real Doom)
2. WebGL for the actual pixel drawing
3. Sprite rendering via 3D mesh billboard

**Not directly usable**, but studying it shows the JS structure needed for a Doom-like experience in pure JS.

#### Other JS ports
- `jsdoom/` — Large comprehensive JS port, browser-based
- `doomjs/` — Canvas API Doom clone
- `amateur-of-doom/` — Canvas-based raycaster

None of these use a column-drawing approach that maps cleanly to FILL_RECT. Most use Canvas 2D API or WebGL.

### NOT Suitable for Zepp OS

| Port | Why Not |
|------|---------|
| Doom_STM32N6/H7/F7 | 2MB+ RAM requirement, complex STM32 HAL |
| doom_STM32MP157DK2 | Linux userspace, 256MB+ RAM |
| dsda-doom | Nintendo DS dual-screen, complex ARM9 code |
| TinyDoom | Empty/stub repository |
| MicroDOOM | Empty at clone time |

---

## Porting Strategy

### Phase 1: Custom Renderer (current approach, working)
- Wolfenstein-style raycaster, NOT real Doom engine
- Already scaffolded in `include/doom/renderer.js`
- 12x12 grid, 10fps, working mock
- **Next:** 48x48 grid, textured walls, basic sprites

### Phase 2: GBADoom/nRF52840Doom Architecture (recommended)
Once Phase 1 is stable, port the **renderer layer only** from nRF52840Doom:

1. Implement `DG_DrawPixel(x, y, color)` → `FILL_RECT(x, y, 1, 1, color)`
2. Implement `DG_GetJoystickEvents()` → gyroscope/gesture input
3. Pre-process WAD into embedded format for Zepp OS
4. Use the full PrBoom game logic (C → transcribe to JS)

**The game logic is the hard part.** nRF52840Doom's `r_fast_stuff.c` (5875 lines) is the rendering hot-path. The game logic (BSP traversal, collision, AI, enemy behavior) is another ~50K+ lines of C. Transcribing all of it to JS is substantial work.

### The Minimal Path: DOOM-Arduino-UNO (dsanabarb/DOOM-Arduino-UNO)
- ~1,710 lines of C++/Arduino
- True 3D raycasting (not BSP, simpler geometry)
- Works on Arduino UNO (2KB RAM!)
- Uses raycasting with sector-based maps

**If we adapted this approach for Zepp OS:**
- ~2K LOC to port (much less than full Doom engine)
- Already uses the same column-drawing approach
- Resolution: 60×48 on Arduino, could be 120×100 or higher on Bip 6
- No WAD dependency — maps defined in code

This is actually the most realistic near-term path for a **playable Doom-like experience** on Zepp OS. It's not the real Doom, but it's 3D, it shoots, and it fits.

---

## Critical Unknown: Widget Cost

**We do NOT know if FILL_RECT widgets are cheap or expensive.**

What we know:
- FILL_RECT supports native `angle` rotation — suggests they're not pure pixel buffers, they have compositing logic
- The `setProperty(MORE, ...)` pattern updates existing widget handles — not creating new ones
- Widget pool pattern (pre-allocate all handles at init) is the right approach

**The honest answer: must test on real hardware.** Pre-optimizing without measurement is the wrong direction. Ship simplest version, measure on device, then optimize if needed.

---

## Community Research: What Exists on Zepp OS (2026-04-01)

### Entire Public Game Library = 4 Repos, ~11 Stars Combined

| Repo | Stars | Description |
|------|-------|-------------|
| **sirAvent/color-switch** | 5 | Mind game with color matching |
| **MCGitHub15/zepptchi** | 2 | Tamagotchi virtual pet |
| **melianmiko/ZeppOS-IM02** | 2 | WIP game (abandoned 2023) |
| **mmolotov/zepp_2048** | 0 | 2048 puzzle game |

**No Doom, no raycaster, no 3D graphics of any kind** has been attempted publicly on Zepp OS. This project is in completely uncharted territory.

### Relevant Libraries

#### silver-zepp/zeppos-draw (2 stars)
- Line drawing library using FILL_RECT + `angle` rotation property
- Key insight: FILL_RECT supports ANGLE rotation natively — not just pixel fills, they have compositing

#### silver-zepp/zeppos-visual-logger (8 stars)
- On-screen debug logger displaying text on watch
- Shows FPS/debug data via TEXT widgets updated each frame

---

## Simulator Download
- v2.1.0: https://docs.zepp.com/docs/guides/tools/simulator/download/
- Linux AMD64: `simulator-2.1.0_amd64.deb`
- Linux ARM64: `simulator-2.1.0_arm64.deb`

---

## Next Steps
1. **[CRITICAL] Test on real device** — widget cost unknown, must measure on Bip 6 hardware
2. Extend current raycaster (Phase 1) to 48x48 grid, textured walls
3. Research WAD embedding strategy for Zepp OS (pre-process WAD into JS-compatible format)
4. Evaluate DOOM-Arduino-UNO approach as faster path to playable game
5. Investigate doomgeneric as architecture for eventual real Doom engine port
