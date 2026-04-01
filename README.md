# Zepp DOOM

A classic Doom engine port for Zepp OS smartwatches (Amazfit Bip 6, GTR, GTS, and compatible devices).

**Status:** Early development — proof of concept phase

![Zepp OS](https://img.shields.io/badge/Zepp%20OS-4.2-blue)
![Platform](https://img.shields.io/badge/Platform-Amazfit%20Bip%206-gree)

## What Is This?

This project ports the classic Doom raycasting engine to run as a Mini Program on Zepp OS watches. The watch's limited hardware (ARM CPU, 64MB RAM, no GPU) means we need to make significant compromises:

- **Very low resolution** (starts at 12x12 grid, potentially up to 30x30)
- **Fewer colors** (8-16 color palette)
- **Lower framerate** (starts at 10fps, optimizing toward 20-30fps)
- **Simplified maps** (no BSP, hand-crafted test levels)
- **No textures** (solid wall colors only initially)

## Quick Start

### Prerequisites

```bash
npm install -g @zeppos/zeus-cli
```

### Simulator

Download the Zepp OS Device Simulator from the [official docs](https://docs.zepp.com/docs/guides/tools/simulator/download/).

Linux AMD64: `simulator_2.1.0_amd64.deb`

### Dev Commands

```bash
zeus dev          # Compile + connect to simulator (live reload)
zeus build        # Production build
zeus clean        # Clean build artifacts
```

### Project Structure

```
zepp-doom/
├── app.js              # App entry point
├── app.json            # App manifest (appId, permissions, pages)
├── page/
│   └── doom/
│       └── index.js    # Main game page
├── include/
│   └── doom/
│       ├── map.js      # Test map data + collision
│       ├── player.js   # Player state + movement
│       ├── renderer.js # Widget-pool renderer
│       └── input.js    # Button/touch input
└── assets/
    └── icon.png        # App icon
```

## Technical Approach

### Why No Canvas?

Zepp OS does **not** provide a Canvas 2D or WebGL API. The only graphics primitives available are widgets:
- `FILL_RECT` — filled rectangle
- `TEXT` — text label
- `IMAGE` — pre-loaded PNG image
- `CIRCLE`, `LINE`, `POLYLINE`, `ARC`

To render Doom's 3D view, we cast rays into a small internal grid (e.g., 20x20), then draw each cell as a `FILL_RECT` widget, updating widget colors each frame.

**Critical insight from the [easy-draw](https://github.com/zepp-health/easy-draw) library:** arbitrary lines can be drawn using `FILL_RECT` with Bresenham-style math. This is how we'll approach wall rendering.

### Rendering Pipeline

```
Game Loop (10-20fps)
  → Read Input
  → Update Player Position
  → Cast Rays (one per grid column)
  → Compute wall heights per column
  → Update FILL_RECT widget colors
  → Update HUD (FPS, position)
```

### Performance Targets

| Metric | Proof of Concept | Optimized |
|--------|-----------------|-----------|
| FPS | 5-10 | 20-30 |
| Resolution | 12x12 grid | 20x20 or 30x30 |
| Colors | 8 | 16-32 |
| Ray count | 12 | 20-30 |

### Bottlenecks (in order)

1. **FILL_RECT per-pixel rendering** — hundreds of widget property updates per frame
2. **JS raycasting math** — no SIMD, interpreted
3. **Widget property update overhead** — each `setProperty` call has JS→native bridge cost

### Optimization Strategies

- Pre-allocate all widgets at startup, never create/destroy during gameplay
- Use a dirty-rect approach: only update cells that changed
- Reduce effective resolution (larger "pixels" = fewer widgets)
- Use integer math and lookup tables for trig
- Consider a 2D minimap instead of 3D raycasting for first playable build

## Inspiration & Related Projects

- [zepp-pong](https://github.com/Berezza98/zepp-pong) — Reference game at 30fps
- [easy-draw](https://github.com/zepp-health/easy-draw) — Arbitrary line drawing on Zepp OS
- [autogui](https://github.com/zepp-health/autogui) — Widget wrapper library
- [DOOM on Fitbit Ionic](https://github.com/codykrichevsky/doom-fitbit) — Similar constraint-level port
- [DOOM on Apple Watch](https://github.com/oct这种情况下/doom-arm) — Another watch port reference

## Resources

- [Zepp OS Docs](https://docs.zepp.com/docs/intro/)
- [Zepp OS Discord](https://t.zepp.com/t/b6e70)
- [awesome-zeppos](https://github.com/zepp-health/awesome-zeppos)

## License

MIT
