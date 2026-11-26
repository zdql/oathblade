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

export interface HudPopup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  kind: 'gold' | 'xp' | 'heal' | 'damage';
}

export interface HudFlyer {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  arcHeight: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  kind: 'gold' | 'xp' | 'heal';
}

export class EffectsManager {
  public particles: Particle[] = [];
  public texts: FloatingText[] = [];
  public slashes: SlashArc[] = [];
  public hudPopups: HudPopup[] = [];
  public hudFlyers: HudFlyer[] = [];
  public shakeTime = 0;
  public shakeMagnitude = 0;
  public flashAlpha = 0;
  public flashColor = '#ffffff';
  public vignetteAlpha = 0;
  public vignetteColor = '#ff1744';

  // HUD animated reaction timers
  public goldPulse = 0;
  public xpPulse = 0;
  public hpShake = 0;
  public hpHealGlow = 0;
  public hpDamageFlash = 0;
  public recentGoldDelta = 0;
  public recentGoldTimer = 0;
  public recentXpDelta = 0;
  public recentXpTimer = 0;
  public levelUpBanner: { level: number; timer: number; maxTimer: number } | null = null;

  public reset(): void {
    this.particles = [];
    this.texts = [];
    this.slashes = [];
    this.hudPopups = [];
    this.hudFlyers = [];
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.flashAlpha = 0;
    this.vignetteAlpha = 0;
    this.goldPulse = 0;
    this.xpPulse = 0;
    this.hpShake = 0;
    this.hpHealGlow = 0;
    this.hpDamageFlash = 0;
    this.recentGoldDelta = 0;
    this.recentGoldTimer = 0;
    this.recentXpDelta = 0;
    this.recentXpTimer = 0;
    this.levelUpBanner = null;
  }

  public spawnLevelUp(newLevel: number): void {
    this.levelUpBanner = { level: newLevel, timer: 2.3, maxTimer: 2.3 };
    this.xpPulse = 1.4;
    this.addFlash('#7be3ff', 0.28);
    this.vignetteColor = '#ffd740';
    this.vignetteAlpha = Math.max(this.vignetteAlpha, 0.3);
    for (let i = 0; i < 14; i++) {
      const dur = 0.55 + Math.random() * 0.4;
      const angle = (i / 14) * Math.PI * 2;
      this.hudFlyers.push({
        startX: 640 + Math.cos(angle) * 40,
        startY: 240 + Math.sin(angle) * 20,
        targetX: 640 + Math.cos(angle) * (180 + Math.random() * 90),
        targetY: 220 + Math.sin(angle) * (90 + Math.random() * 60),
        arcHeight: 25 + Math.random() * 35,
        color: i % 2 === 0 ? '#ffd740' : '#7be3ff',
        size: 6,
        life: dur,
        maxLife: dur,
        kind: i % 2 === 0 ? 'gold' : 'xp',
      });
    }
  }

  public spawnGoldGain(amount: number, fromX = 640, fromY = 340): void {
    if (amount <= 0) return;
    this.goldPulse = 1;
    this.recentGoldDelta = this.recentGoldTimer > 0 ? this.recentGoldDelta + amount : amount;
    this.recentGoldTimer = 1.65;
    this.hudPopups.push({
      x: fromX + (Math.random() - 0.5) * 32,
      y: fromY,
      vx: (Math.random() - 0.5) * 24,
      vy: -64,
      text: `+${amount} Gold`,
      color: '#ffd740',
      scale: 1.05,
      life: 1.15,
      maxLife: 1.15,
      kind: 'gold',
    });
    const count = Math.min(8, Math.max(3, Math.ceil(amount / 18)));
    for (let i = 0; i < count; i++) {
      const dur = 0.45 + Math.random() * 0.28;
      this.hudFlyers.push({
        startX: fromX + (Math.random() - 0.5) * 50,
        startY: fromY + (Math.random() - 0.5) * 30,
        targetX: 1015,
        targetY: 642,
        arcHeight: 45 + Math.random() * 75,
        color: '#ffd740',
        size: 6,
        life: dur,
        maxLife: dur,
        kind: 'gold',
      });
    }
  }

  public spawnXpGain(amount: number, fromX = 640, fromY = 372): void {
    if (amount <= 0) return;
    this.xpPulse = 1;
    this.recentXpDelta = this.recentXpTimer > 0 ? this.recentXpDelta + amount : amount;
    this.recentXpTimer = 1.65;
    this.hudPopups.push({
      x: fromX + (Math.random() - 0.5) * 32,
      y: fromY,
      vx: (Math.random() - 0.5) * 24,
      vy: -56,
      text: `+${amount} XP`,
      color: '#7be3ff',
      scale: 1.0,
      life: 1.15,
      maxLife: 1.15,
      kind: 'xp',
    });
    const count = Math.min(7, Math.max(3, Math.ceil(amount / 25)));
    for (let i = 0; i < count; i++) {
      const dur = 0.48 + Math.random() * 0.28;
      this.hudFlyers.push({
        startX: fromX + (Math.random() - 0.5) * 50,
        startY: fromY + (Math.random() - 0.5) * 30,
        targetX: 1185,
        targetY: 642,
        arcHeight: 35 + Math.random() * 65,
        color: '#7be3ff',
        size: 5,
        life: dur,
        maxLife: dur,
        kind: 'xp',
      });
    }
  }

  public spawnHealFeedback(amount: number, fromX = 186, fromY = 602): void {
    if (amount <= 0) return;
    this.hpHealGlow = 1;
    this.vignetteColor = '#69f0ae';
    this.vignetteAlpha = Math.max(this.vignetteAlpha, 0.26);
    this.hudPopups.push({
      x: fromX + (Math.random() - 0.5) * 26,
      y: fromY,
      vx: (Math.random() - 0.5) * 16,
      vy: -58,
      text: `+${amount} HP`,
      color: '#69f0ae',
      scale: 1.08,
      life: 1.1,
      maxLife: 1.1,
      kind: 'heal',
    });
    for (let i = 0; i < 6; i++) {
      const dur = 0.42 + Math.random() * 0.24;
      this.hudFlyers.push({
        startX: 60 + Math.random() * 250,
        startY: 660 + Math.random() * 30,
        targetX: 140 + Math.random() * 140,
        targetY: 590,
        arcHeight: 20 + Math.random() * 25,
        color: '#69f0ae',
        size: 5,
        life: dur,
        maxLife: dur,
        kind: 'heal',
      });
    }
  }

  public spawnDamageFeedback(amount: number, fromX = 186, fromY = 602): void {
    if (amount <= 0) return;
    this.hpShake = 1;
    this.hpDamageFlash = 1;
    this.vignetteColor = '#ff1744';
    this.vignetteAlpha = Math.max(this.vignetteAlpha, 0.36);
    this.hudPopups.push({
      x: fromX + (Math.random() - 0.5) * 28,
      y: fromY,
      vx: (Math.random() - 0.5) * 34,
      vy: -70,
      text: `-${amount} HP`,
      color: '#ff5252',
      scale: 1.12,
      life: 0.95,
      maxLife: 0.95,
      kind: 'damage',
    });
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
    if (this.vignetteAlpha > 0) {
      this.vignetteAlpha = Math.max(0, this.vignetteAlpha - dt * 1.4);
    }
    if (this.goldPulse > 0) this.goldPulse = Math.max(0, this.goldPulse - dt * 2.6);
    if (this.xpPulse > 0) this.xpPulse = Math.max(0, this.xpPulse - dt * 2.6);
    if (this.hpShake > 0) this.hpShake = Math.max(0, this.hpShake - dt * 3.4);
    if (this.hpHealGlow > 0) this.hpHealGlow = Math.max(0, this.hpHealGlow - dt * 2.1);
    if (this.hpDamageFlash > 0) this.hpDamageFlash = Math.max(0, this.hpDamageFlash - dt * 3.0);
    if (this.recentGoldTimer > 0) {
      this.recentGoldTimer = Math.max(0, this.recentGoldTimer - dt);
      if (this.recentGoldTimer === 0) this.recentGoldDelta = 0;
    }
    if (this.recentXpTimer > 0) {
      this.recentXpTimer = Math.max(0, this.recentXpTimer - dt);
      if (this.recentXpTimer === 0) this.recentXpDelta = 0;
    }
    if (this.levelUpBanner) {
      this.levelUpBanner.timer -= dt;
      if (this.levelUpBanner.timer <= 0) this.levelUpBanner = null;
    }

    for (let i = this.hudPopups.length - 1; i >= 0; i--) {
      const hp = this.hudPopups[i];
      hp.life -= dt;
      if (hp.life <= 0) {
        this.hudPopups.splice(i, 1);
        continue;
      }
      hp.x += hp.vx * dt;
      hp.y += hp.vy * dt;
      hp.vy *= 0.94;
    }

    for (let i = this.hudFlyers.length - 1; i >= 0; i--) {
      const f = this.hudFlyers[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.hudFlyers.splice(i, 1);
      }
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
