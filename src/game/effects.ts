export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface FloatingText {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface SlashArc {
  x: number;
  y: number;
  z: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  width: number;
  life: number;
  maxLife: number;
}

export class EffectsManager {
  public particles: Particle[] = [];
  public texts: FloatingText[] = [];
  public slashes: SlashArc[] = [];
  public shakeTime = 0;
  public shakeMagnitude = 0;
  public flashAlpha = 0;
  public flashColor = '#ffffff';

  public reset(): void {
    this.particles = [];
    this.texts = [];
    this.slashes = [];
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.flashAlpha = 0;
  }

  public addShake(magnitude: number, duration: number): void {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  public addFlash(color: string, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    color: string,
    count: number,
    speed = 240,
    size = 5
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.85);
      const maxLife = 0.25 + Math.random() * 0.32;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.65,
        vz: 80 + Math.random() * 190,
        size: size * (0.65 + Math.random() * 0.7),
        color,
        alpha: 1,
        life: maxLife,
        maxLife,
        gravity: 650,
      });
    }
  }

  public spawnSlash(
    x: number,
    y: number,
    z: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
    width = 14,
    duration = 0.2
  ): void {
    this.slashes.push({
      x,
      y,
      z,
      radius,
      startAngle,
      endAngle,
      color,
      width,
      life: duration,
      maxLife: duration,
    });
  }

  public spawnText(
    x: number,
    y: number,
    z: number,
    text: string,
    color: string,
    scale = 1,
    duration = 0.85
  ): void {
    this.texts.push({
      x,
      y,
      z,
      text,
      color,
      scale,
      life: duration,
      maxLife: duration,
    });
  }

  public update(dt: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.shakeTime === 0) this.shakeMagnitude = 0;
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.8);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vz -= p.gravity * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      p.alpha = p.life / p.maxLife;
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.z += 58 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }
}
