// player.js — Player state and movement

import { canMove, START_X, START_Y } from './map.js';

// Movement constants (tuned for ~10fps Zepp OS timer)
const MOVE_SPEED  = 0.06;   // units per frame
const TURN_SPEED  = 0.08;   // radians per frame
const STRAFE_SPD  = 0.05;   // strafe speed (slightly slower)
const PLAYER_RAD  = 0.2;    // collision radius

export class Player {
  constructor() {
    this.x      = START_X;
    this.y      = START_Y;
    this.angle  = 0;         // facing east
    this.health = 100;
    this.ammo   = 50;
    this.score  = 0;
    this.weapon = 1;         // 1=pistol

    // Input state (set by input handler)
    this.moveForward  = false;
    this.moveBackward = false;
    this.turnLeft     = false;
    this.turnRight    = false;
    this.strafeLeft   = false;
    this.strafeRight  = false;
  }

  // Update position based on input state
  update() {
    // Turning
    if (this.turnLeft)  this.angle -= TURN_SPEED;
    if (this.turnRight) this.angle += TURN_SPEED;

    // Normalize angle to [0, 2π]
    const TAU = Math.PI * 2;
    while (this.angle < 0)      this.angle += TAU;
    while (this.angle >= TAU)   this.angle -= TAU;

    // Movement vectors
    const dx = Math.cos(this.angle) * MOVE_SPEED;
    const dy = Math.sin(this.angle) * MOVE_SPEED;

    // Forward / backward
    if (this.moveForward) {
      if (canMove(this.x + dx, this.y + dy, PLAYER_RAD)) {
        this.x += dx;
        this.y += dy;
      }
    }
    if (this.moveBackward) {
      const bdx = -dx * 0.5;
      const bdy = -dy * 0.5;
      if (canMove(this.x + bdx, this.y + bdy, PLAYER_RAD)) {
        this.x += bdx;
        this.y += bdy;
      }
    }

    // Strafe: perpendicular movement (no trig, just rotate vectors)
    if (this.strafeLeft) {
      const sdx =  Math.sin(this.angle) * STRAFE_SPD;  // perpendicular (CCW)
      const sdy = -Math.cos(this.angle) * STRAFE_SPD;
      if (canMove(this.x + sdx, this.y + sdy, PLAYER_RAD)) {
        this.x += sdx;
        this.y += sdy;
      }
    }
    if (this.strafeRight) {
      const sdx = -Math.sin(this.angle) * STRAFE_SPD;  // perpendicular (CW)
      const sdy =  Math.cos(this.angle) * STRAFE_SPD;
      if (canMove(this.x + sdx, this.y + sdy, PLAYER_RAD)) {
        this.x += sdx;
        this.y += sdy;
      }
    }
  }

  // Direct position set (for sync from external state)
  setPosition(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }
}
