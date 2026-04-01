# Zepp OS / Amazfit Bip 6 Research Notes

## Project Start Time
Started: 2026-03-31

## Last Updated: 2026-04-01

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

## To Research Further
1. Bip 6 CPU/RAM/storage specs (not in device table)
2. Real-world rendering performance of FILL_RECT on Bip 6
3. How to render sprites (billboard via FILL_RECT rectangles)?
4. Audio support on Zepp OS (sound effects?)
5. How to build/deploy to device (Zeus CLI workflow)
6. Actual FPS achievable with column raycaster on Bip 6 hardware

## Simulator Download
- v2.1.0: https://docs.zepp.com/docs/guides/tools/simulator/download/
- Linux AMD64: `simulator-2.1.0_amd64.deb`
- Linux ARM64: `simulator-2.1.0_arm64.deb`
