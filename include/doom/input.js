// input.js — Zepp OS button/input handling for Doom

// Supported buttons on Zepp OS watches:
// Crown/dial: Used for scrolling and page navigation
// Button(s): Physical button(s) below screen
// Touch gestures: tap, swipe on screen

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
    };
    this._registered = false;
  }

  // Register all button and touch handlers
  register() {
    if (this._registered) return;

    // D-pad / Crown — for movement (this depends on device)
    // GTS/GTR series: crown rotation, button press
    // Bip series: single button + touch

    try {
      // Crown/dial rotation — used as up/down (scroll through menus by default)
      hmSetting.setDialHomeButton({
        longpress: () => {
          // Long press crown = open app list
          console.log('Crown longpress');
        }
      });

      // Physical button (single button on Bip)
      hmUI.showToast({
        text: 'BTN REG',
        duration: 500,
      });
    } catch (e) {
      console.log('Button reg error: ' + e);
    }

    this._registered = true;
  }

  // Check current key state
  isPressed(key) {
    return !!this.keys[key];
  }
}

// Simple key polling interface for game loop
export function createInputState() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  };
}
