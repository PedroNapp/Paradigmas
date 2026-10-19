/* Mede a viagem entre extremos, independentemente da frequência do ponteiro. */
export class ShakeGesture {
  constructor({ distance = 22, maxInterval = 650, cooldown = 1200 } = {}) {
    this.distance = distance;
    this.maxInterval = maxInterval;
    this.cooldown = cooldown;
    this.lastShake = -Infinity;
    this.engaged = false;
  }

  begin(x, now) {
    this.engaged = true;
    this.anchor = this.extreme = x;
    this.direction = 0;
    this.turns = 0;
    this.lastTurn = now;
  }

  move(x, now) {
    if (!this.engaged || !Number.isFinite(x) || !Number.isFinite(now)) return false;
    if (!this.direction) {
      const displacement = x - this.anchor;
      if (Math.abs(displacement) < this.distance) return false;
      this.direction = Math.sign(displacement);
      this.extreme = x;
      this.lastTurn = now;
      return false;
    }

    const displacement = (x - this.extreme) * this.direction;
    if (displacement >= 0) {
      this.extreme = x;
      return false;
    }
    // Uma oscilação pequena não conta como nova direção.
    if (-displacement < this.distance) return false;
    this.direction *= -1;
    this.extreme = x;
    this.turns = now - this.lastTurn <= this.maxInterval ? this.turns + 1 : 1;
    this.lastTurn = now;

    if (this.turns < 3 || now - this.lastShake < this.cooldown) return false;
    this.lastShake = now;
    this.turns = 0;
    return true;
  }

  end() { this.engaged = false; }
}
