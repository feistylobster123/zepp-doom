# Zepp OS / Amazfit Bip 6 Research Notes

## Project Start Time
Started: 2026-03-31 (12-hour development session)

## Sources
- Main docs: https://docs.zepp.com/docs/intro/
- Simulator: https://docs.zepp.com/docs/guides/tools/simulator/
- GitHub org: https://github.com/zepp-health
- Developer site: https://developer.zepp.com/os/home

## Device: Amazfit Bip 6
- Part of Zepp OS ecosystem (Zepp Health, formerly Huami/Amazfit)
- The Bip series is the budget line with always-on LCD display
- Bip 6 likely uses Zepp OS 5 (based on 2025 release timeline)

## Zepp OS Overview
- JavaScript/TypeScript based development (Zeus CLI)
- Mini Programs (like mini-apps) + Watch Faces
- Framework: Proprietary but similar to WeChat Mini Program / Flipper Zero dev style
- API_LEVEL system (current: 4.2 per docs)
- NOT a standard web environment — no DOM, no WebGL, no standard Canvas API

## Simulator Downloads (v2.1.0)
- macOS ARM64: simulator-2.1.0-macos-arm64.dmg
- macOS x64: simulator-2.1.0-macos-x64.dmg
- Windows x64: simulator_2.1.0_x64.exe
- Linux AMD64: simulator_2.1.0_amd64.deb
- Linux ARM64: simulator_2.1.0_arm64.deb
- Download URL base: https://upload-cdn.zepp.com/zepp-applet-and-wechat-applet/

## Key Tools
- Zeus CLI: https://docs.zepp.com/docs/guides/tools/cli/
- Device Simulator: separate download from within the Zepp App
- Console: https://console.zepp.com/ (for app signing/deployment)

## Graphics APIs in Zepp OS
- The framework uses a proprietary widget/UI system
- Likely NO Canvas 2D API (unlike web)
- Screen drawing through declarative UI widgets
- Need to research exact graphics capabilities

## Critical Constraints (estimated)
- App size: Likely 1-10MB max
- RAM: Watch has 64MB or less (Bip series is budget)
- CPU: ARM Cortex-A series, likely single-core or dual-core at 500MHz-1GHz
- Display: ~360x360 to 416x416 pixels (square or rectangle)
- No hardware graphics acceleration expected

## To Research Further
1. Exact Bip 6 hardware specs (CPU, RAM, display)
2. Zepp OS graphics API — can you draw arbitrary pixels?
3. Is there a Canvas-like API for game rendering?
4. Maximum app size limit
5. Existing game ports on Zepp OS
6. How does the Zepp OS framework compare to Squarp OS or other watch OS

## Risks
- If Zepp OS has no pixel-level drawing API, Doom port may be impossible without native code
- The Bip series may not have enough RAM to hold a Doom WAD
- Rendering at 30+ FPS on a ~500MHz ARM with no GPU will be extremely challenging
