# Zepp OS / Amazfit Bip 6 Research Notes

## Project Start Time
Started: 2026-03-31

## Last Updated: 2026-04-01 (evening research session)

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

### Sensors Available (API_LEVEL 4.2)

From `@zos/sensor`:
- **Accelerometer** — `{x, y, z}` in cm/s², `FREQ_MODE_LOW/NORMAL/HIGH`
- **Gyroscope** — `{x, y, z}` in DPS (degrees per second), `FREQ_MODE_LOW/NORMAL/HIGH`
- Permissions: `device:os.accelerometer`, `device:os.gyroscope`

From `@zos/interaction`:
- **Gestures** — `GESTURE_UP`, `GESTURE_DOWN`, `GESTURE_LEFT`, `GESTURE_RIGHT`
- **No tap/double-tap sensor** — must use double-tap on gesture or button

From `@zos/sensor`:
- **Vibrator** — `VIBRATOR_SCENE_SHORT_LIGHT/MIDDLE/STRONG`, `VIBRATOR_SCENE_DURATION`, `VIBRATOR_SCENE_STRONG_REMINDER`, `VIBRATOR_SCENE_NOTIFICATION`, `VIBRATOR_SCENE_CALL`

Health sensors (may need separate permissions):
- Heart rate, SpO2, PAI, sleep, steps, stress — available via `@zos/sensor`

### Screen Technology
- Bip series: **always-on LCD** (not AMOLED — important for power)
- Square shape with rounded corners

### Nearby Zepp OS Devices (for reference)
| Device | Resolution | Shape | deviceSource |
|--------|-----------|-------|--------------|
| Amazfit Active 2 (Square) | 390 x 450 | Square | 10223872 |
| Amazfit Bip 6 | 390 x 450 | Square | 9765120 |
| Amazfit Active (Square) | 390 x 450 | Square | 8323328 |
| Amazfit GTS 4 (Square) | 390 x 450 | Square | 7995648 |
| Amazfit T-Rex 3 Pro | 466 x 466 | Round | 10682624 |
| Amazfit Balance 2 | 480 x 480 | Round | 9568512 |

---

## Zepp OS Overview
- JavaScript/TypeScript development via **Zeus CLI**
- Mini Programs (apps) + Watch Faces
- **API_LEVEL 4.2** — class-based sensor APIs (`@zos/sensor`)
- NOT standard web — **no DOM, no Canvas 2D, no WebGL**
- Graphics: **FILL_RECT pixel-level drawing** via widget system

## Graphics Constraint — Critical
**Zepp OS has NO Canvas 2D or WebGL.**
- Only widget-based UI: `RectWidget`, `ImgWidget`, `TextWidget`, etc.
- `FILL_RECT` per-pixel rectangle fills are the only drawing primitive
- Doom port must use a **flat color rectangle** for each vertical wall strip
- No textures, no sprites as images — must draw sprites with FILL_RECT too
- Solution: Column raycaster + sprite billboard rendering via FILL_RECT

## Critical Constraints
- **No Canvas API** — must use FILL_RECT for all rendering
- **No WebGL** — pure widget API only
- App size: ~1-10MB max
- RAM: ~64MB or less (Bip series budget line)
- CPU: ARM (specific model TBD — likely 500MHz-1GHz single/dual-core)
- FPS target: 10-15fps on watch hardware

## Sensor Control Scheme
### Gyroscope (primary — for movement)
- `Gyroscope` from `@zos/sensor`
- `gyro.z` = yaw rate (DPS) — **twist watch left/right** → turn character
- `gyro.y` = pitch rate (DPS) — **tilt watch forward/back** → move forward/back
- **Auto-calibrates** at startup (30 frames to capture neutral offset)
- Frame-time scaling: `angle_delta = gyro_dps * gain * dt * 60`

### Accelerometer (optional — for alt movement)
- `Accelerometer` from `@zos/sensor`
- `{x, y, z}` in cm/s²
- Could detect specific gestures (shake to reload, etc.)

### Gestures
- `onGesture(GESTURE_LEFT/RIGHT)` — swipe left/right → change weapon
- No tap sensor — double-tap is a swipe-within-5px — not reliably usable
- **Buttons** are the reliable shoot trigger on Bip 6 (2 buttons)

### Button Mapping (Bip 6 — 2 buttons)
- Upper button: SELECT / confirm
- Lower button: BACK
- On watch: upper button = shoot (primary action)

---

## Architecture: Simulator vs Real Device

### sim-game.html
- Standalone browser file (open directly, no server)
- Uses `DeviceMotion` API as gyro/accel surrogate
- Canvas 2D API (browser) for rendering
- `ZeppOS` compatibility layer with same interface as real device
- No actual Zepp OS imports

### Real device (page/doom/index.js)
```javascript
import { Gyroscope, Accelerometer, FREQ_MODE_NORMAL } from '@zos/sensor';
import { Vibrator } from '@zos/sensor';
import { onGesture } from '@zos/interaction';
// FILL_RECT-based rendering (no Canvas)
```

### Build targets (app.json)
- `bip-6`: deviceSource `9765120`, designWidth 390
- `gtr3-pro`: deviceSource `229/230`, designWidth 480
- `gtr3`: deviceSource `226/227`, designWidth 454
- `gts4`: deviceSource `7995648/7995649`, designWidth 390

---

## To Research Further / Next Steps
1. **[CRITICAL] Test on real device** — widget cost unknown, must measure on Bip 6 hardware
2. Fix Zeus CLI build pipeline (missing `fetchDevices` and `getDeviceConf` stubs) to enable `zeus dev`
3. Get `zeus dev` working with bip-6 target (currently warns "unsupported target")
4. Deploy to actual Bip 6 hardware and measure real FPS with 152 widget updates/frame
5. Explore WAD data storage on Bip 6 (internal flash vs. streaming) for real Doom engine path
6. Audio support on Zepp OS (sound effects?) — not yet investigated
7. Sprite rendering: billboard approach via FILL_RECT (same as wall columns, scaled by distance)

---

## Community Research: What Exists on Zepp OS (2026-04-01)

### Entire Public Game Library = 4 Repos, ~11 Stars Combined

Searched entire GitHub for `zeppos game` — found only 4 public game repos:

| Repo | Stars | Description | Notes |
|------|-------|-------------|-------|
| **sirAvent/color-switch** | 5 | Mind game with color matching | Published on Zepp App Store |
| **MCGitHub15/zepptchi** | 2 | Tamagotchi virtual pet | CalHacks 10 hackathon project |
| **melianmiko/ZeppOS-IM02** | 2 | WIP game | Abandoned 2023, repo deleted |
| **mmolotov/zepp_2048** | 0 | 2048 puzzle game | Very recent (2026-03), full game |

**No Doom, no raycaster, no 3D graphics of any kind** has been attempted publicly on Zepp OS. This project is in completely uncharted territory.

### Relevant Libraries Found

#### silver-zepp/zeppos-draw (2 stars)
- **Line drawing library** using FILL_RECT + `angle` rotation property
- Viewport limited to ~150px before positioning bugs appear
- Multi-color lines require separate group widgets per color
- Author note: *"lines won't be pixel-perfect — expected behavior"*
- Key insight: FILL_RECT supports ANGLE rotation natively — these aren't just pixel fills, they have compositing capability
- URL: github.com/silver-zepp/zeppos-draw

#### silver-zepp/zeppos-visual-logger (8 stars)
- On-screen debug logger displaying text on watch
- Shows FPS/debug data via TEXT widgets updated each frame
- Works in AppSide + AppSettings + page contexts
- URL: github.com/silver-zepp/zeppos-visual-logger

#### melianmiko/ZeppOS-Libraries (14 stars)
- Custom dev libs for Zepp OS (no docs)
- Author is the most active Zepp OS community dev

### Key Unknown: Widget Cost

**We do NOT know if FILL_RECT widgets are cheap or expensive.**
152 widget updates per frame at 10fps = ~1,520 ops/second. Is this fine or a disaster?

What we know:
- FILL_RECT supports native `angle` rotation — suggests they're not pure pixel buffers, they have compositing logic
- The `setProperty(MORE, ...)` pattern updates existing widget handles — not creating new ones
- Widget pool pattern (pre-allocate all handles at init) is the right approach but may not be necessary

**The honest answer: must test on real hardware.** Pre-optimizing without measurement is wrong direction. Ship simplest version, measure, then optimize if needed.

### Zeus CLI Target Status

The bip-6 target IS correctly configured in app.json (deviceSource 9765120) but Zeus CLI v1.8.2 has an internal device list that doesn't include it — hence "unsupported targets" warnings. Workaround: build with `gtr3-pro` target for CLI compatibility, but bip-6 config in app.json produces correct output.

---

## Open Microcontroller Doom Ports (for reference if FILL_RECT is cheap)

These are the record-holder ports for running Doom on absurdly constrained hardware. If Zepp OS FILL_RECT proves to be cheap per-call (which is plausible — they may just be native rectangle blits), these ports provide reference approaches and WAD data strategies.

### The Hard-Mode Record: ATmega328p (Arduino Uno/Nano)

**Specs: 2KB RAM, 32KB flash, 16MHz**

This is the legendary extreme port. Because Doom (~640KB WAD) can't fit in 2KB RAM, these ports use a **from-scratch Doom-clone** (not the actual id Software engine) with:
- Custom pseudo-3D renderer (raycaster, not BSP engine)
- WAD data streamed from external SPI flash or SD card, one sector at a time
- Resolution: 60×48 or lower
- 1-bit or 4-color output
- Frame rate: ~5-10 fps

**This is NOT the real Doom engine** — it's a lookalike written from scratch to run on the world's cheapest microcontroller.

### Actual Doom Engine Ports (requiring ~256KB+ RAM)

#### TI-84 Plus CE: Best True Doom Port on Small Hardware
- **Specs: eZ80 at 48MHz, 256KB RAM, 320×240 color screen**
- **Port: "Doom CE"** — full id Software Doom engine, WAD loaded from calculator flash
- Hero trick: E8-compatible memory banking loads only current level into RAM
- Resolution effectively 160×120 internally, status bar rendered separately
- Everything (code + level) fits in 256KB via banking — an engineering marvel

#### ESP32 (with PSRAM): Most Accessible Port
- **Specs: dual-core 240MHz, 520KB+ PSRAM available**
- **Port: PrBoom-plus variant** with streaming WAD from SD card
- PSRAM allows holding the full WAD data externally, streaming sectors into internal RAM
- Runs full Doom engine at good frame rates with extra RAM headroom

#### STM32F746 Discovery: Cortex-M7 Native
- **Specs: 216MHz Cortex-M7, 320KB RAM, external SDRAM needed for WAD**
- Native on-chip RAM insufficient for full WAD — SDRAM expansion required
- Full engine, proper frame buffer

#### Game Boy Advance
- **Specs: ARM7 16MHz, 264KB RAM**
- Stripped but actual Doom engine
- Low-res frame buffer approach

#### Nintendo DS
- **Specs: ARM9 67MHz, 4MB RAM**
- Full Doom engine, dual screen (game uses top screen)

#### MIPS Router (antonKirpich/doom-on-router)
- MediaTek MT76xx, ~64MB RAM, OpenWrt
- Full engine, WAD streamed from SD card
- Runs as userspace Linux process

### Key Pattern Across All Tiny Ports

The WAD data problem (Doom needs ~2.5MB for full game data) is solved identically everywhere:
1. **Load WAD from external storage** (SD card, flash, network)
2. **Stream one level/sector at a time** into a ring buffer
3. Keep only the **current level** in RAM

For Zepp OS, this is very relevant: if we can store the WAD on the watch's internal flash (vs. streaming from network), we have the storage. The question is whether streaming sectors from flash into JS RAM is fast enough for the engine.

### Most Relevant Ports for Zepp OS

| Port | Why Relevant |
|------|-------------|
| **doomgeneric** (ozkl/github) | "Easily portable Doom" — abstraction layer over rendering/input, designed for custom hardware. Our FILL_RECT widget system IS the abstraction layer. Good reference architecture. |
| **doom-on-router** | MIPS processor, streaming WAD from SD, full engine |
| **TI-84 CE Doom** | Worst-case memory budgeting — proves Doom can be split across banking |
| **doom-on-arduino** (search GitHub) | Pseudo-3D clone for AVR — reference for writing a Doom-style game from scratch if native engine proves impossible |

### If FILL_RECT is Cheap: Native Doom Engine Path

If widget updates turn out to be sub-millisecond (likely given the Apollo 3's clock speed and the native widget layer), the path would be:

1. Port **doomgeneric** architecture — it already abstracts rendering behind a `draw_pixel(x, y, color)` interface
2. Replace that interface with FILL_RECT calls
3. Stream WAD from Bip 6's onboard flash (~2MB free for app data)
4. Target 10fps, 160×120 effective resolution (scaled to 360×360 or 390×390)

This is a 2-4 week project for one person who knows the Doom engine internals.

### If FILL_RECT is Expensive: Custom Renderer Path

If 152 `setProperty` calls per frame chokes the device, we fall back to:
1. Custom Doom-style pseudo-3D engine (Wolfenstein-style raycaster)
2. Sprites drawn as FILL_RECT billboards (sized rectangles at sprite positions)
3. This is what we have now — already scaffolded and working

---

## Simulator Download
- v2.1.0: https://docs.zepp.com/docs/guides/tools/simulator/download/
- Linux AMD64: `simulator-2.1.0_amd64.deb`
- Linux ARM64: `simulator-2.1.0_arm64.deb`
