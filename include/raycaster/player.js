// player.js — Player movement for raycaster
import { canMove, START_X, START_Y } from './map.js';

const MOVE_SPEED = 0.06;
const TURN_SPEED = 0.08;
const STRAFE_SPD = 0.05;
const PLAYER_RAD = 0.2;
const TAU = Math.PI * 2;

export class Player {
  constructor() {
    this.x = START_X;
    this.y = START_Y;
    this.angle = 0;
    this.health = 100;
    this.ammo = 50;
    this.score = 0;
    this.weapon = 1;
    this.moveForward = false;
    this.moveBackward = false;
    this.turnLeft = false;
    this.turnRight = false;
    this.strafeLeft = false;
    this.strafeRight = false;
  }

  update() {
    if (this.turnLeft)  this.angle -= TURN_SPEED;
    if (this.turnRight) this.angle += TURN_SPEED;
    this.angle = ((this.angle % TAU) + TAU) % TAU;

    const dx = Math.cos(this.angle) * MOVE_SPEED;
    const dy = Math.sin(this.angle) * MOVE_SPEED;

    if (this.moveForward) {
      if (canMove(this.x + dx, this.y + dy, PLAYER_RAD)) {
        this.x += dx;
        this.y += dy;
      }
    }
    if (this.moveBackward) {
      const bdx = -dx * 0.5, bdy = -dy * 0.5;
      if (canMove(this.x + bdx, this.y + bdy, PLAYER_RAD)) {
        this.x += bdx;
        this.y += bdy;
      }
    }
    if (this.strafeLeft) {
      const sdx =  Math.sin(this.angle) * STRAFE_SPD;
      const sdy = -Math.cos(this.angle) * STRAFE_SPD;
      if (canMove(this.x + sdx, this.y + sdy, PLAYER_RAD)) {
        this.x += sdx;
        this.y += sdy;
      }
    }
    if (this.strafeRight) {
      const sdx = -Math.sin(this.angle) * STRAFE_SPD;
      const sdy =  Math.cos(this.angle) * STRAFE_SPD;
      if (canMove(this.x + sdx, this.y + sdy, PLAYER_RAD)) {
        this.x += sdx;
        this.y += sdy;
      }
    }
  }
}
