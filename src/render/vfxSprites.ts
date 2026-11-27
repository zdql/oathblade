import { PixelCanvas } from './pixelCanvas';
import { VFX_ANIM_CLIPS, type VfxAnimEvent } from './spriteAnimator';

export interface ActivePixelVfx {
  event: VfxAnimEvent;
  x: number;
  y: number;
  z: number;
  color: string;
  scale: number;
  frame: number;
  elapsed: number;
  duration: number;
  flipX: boolean;
}

const vfxBuf = new PixelCanvas(56, 56);

export class PixelVfxManager {
  public effects: ActivePixelVfx[] = [];

  public reset(): void {
    this.effects = [];
  }

  public spawn(
    event: VfxAnimEvent,
    x: number,
    y: number,
    z: number,
    color: string,
    scale = 1,
    flipX = false
  ): void {
    const clip = VFX_ANIM_CLIPS[event];
    this.effects.push({
      event,
      x,
      y,
      z,
      color,
      scale,
      frame: 0,
      elapsed: 0,
      duration: clip.frames / clip.fps,
      flipX,
    });
  }

  public update(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      const clip = VFX_ANIM_CLIPS[fx.event];
      fx.elapsed += dt;
      fx.frame = Math.floor((fx.elapsed / fx.duration) * clip.frames);
      if (fx.frame >= clip.frames) {
        this.effects.splice(i, 1);
      }
    }
  }

  public render(
    dest: CanvasRenderingContext2D,
    project: (wx: number, wy: number) => { sx: number; sy: number; scale: number }
  ): void {
    for (const fx of this.effects) {
      const clip = VFX_ANIM_CLIPS[fx.event];
      const t = fx.frame / Math.max(1, clip.frames - 1);
      const proj = project(fx.x, fx.y);
      drawVfxFrame(vfxBuf, fx.event, t, fx.color);
      vfxBuf.blitTo(
        dest,
        proj.sx,
        proj.sy - fx.z * proj.scale + 24 * proj.scale * fx.scale,
        proj.scale * 2.1 * fx.scale,
        Math.max(0.15, 1 - t * 0.65),
        fx.flipX
      );
    }
  }
}

function drawVfxFrame(p: PixelCanvas, event: VfxAnimEvent, t: number, color: string): void {
  p.clear();
  const cx = 28;
  const cy = 28;

  switch (event) {
    case 'slash_arc': {
      // 12-frame sweeping pixel crescent with custom accents based on blade color!
      const startA = -2.2 + t * 1.4;
      const endA = startA + 1.8 * (1 - t * 0.5);
      const r = 16 + t * 5;
      for (let a = startA; a <= endA; a += 0.14) {
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.72;
        p.rect(x - 1, y - 1, 3, 3, color);
        p.px(x, y, '#ffffff');
      }
      // Color-driven signature accents
      const cLow = color.toLowerCase();
      const tipX = cx + Math.cos(endA) * r;
      const tipY = cy + Math.sin(endA) * r * 0.72;
      if (cLow.includes('ff6d') || cLow.includes('ff52') || cLow.includes('ff17')) {
        // Flame / Crimson: trailing ember sparks
        p.sparkle(tipX, tipY, Math.max(1, Math.round(4 * (1 - t))), '#fff59d', '#ff1744');
        p.rect(Math.round(tipX) - 4, Math.round(tipY) - 4, 2, 2, '#ffab00');
      } else if (cLow.includes('00e5') || cLow.includes('b3e5') || cLow.includes('29b6') || cLow.includes('80de')) {
        // Frost / Gale Cyan: crystalline diamond shards
        p.sparkle(tipX, tipY, Math.max(1, Math.round(4 * (1 - t))), '#ffffff', '#00e5ff');
        p.rect(Math.round(cx + Math.cos(startA) * r), Math.round(cy + Math.sin(startA) * r * 0.72), 2, 2, '#e0f7fa');
      } else if (cLow.includes('d500') || cLow.includes('e040') || cLow.includes('ea80') || cLow.includes('ce93')) {
        // Phantom Violet: secondary ghost crescent
        const rGhost = r - 5;
        for (let a = startA; a <= endA; a += 0.22) {
          p.px(cx + Math.cos(a) * rGhost, cy + Math.sin(a) * rGhost * 0.72, '#ea80fc');
        }
      } else if (cLow.includes('ffd') || cLow.includes('fff5') || cLow.includes('ffb')) {
        // Sun-Gold: twin radiant star glints
        p.sparkle(tipX, tipY, Math.max(1, Math.round(5 * (1 - t))), '#ffffff', '#ffd54f');
      }
      break;
    }

    case 'heavy_cleave': {
      // 16-frame blazing wide cleave + color-driven shockwave sparks
      const r = 14 + t * 10;
      for (let a = -2.4; a <= 0.8; a += 0.1) {
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.78;
        p.rect(x - 2, y - 2, 4, 4, color);
        p.rect(x - 1, y - 1, 2, 2, '#ffffff');
      }
      // Secondary outer aura wave tinted by sword color
      const r2 = r + 4;
      for (let a = -2.1; a <= 0.5; a += 0.25) {
        p.px(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.78, color);
      }
      p.sparkle(cx + Math.round((t - 0.5) * 20), cy - 6, Math.round(5 * (1 - t)), '#ffffff', color);
      p.sparkle(cx - Math.round((t - 0.5) * 16), cy + 4, Math.max(1, Math.round(3 * (1 - t))), '#ffffff', color);
      break;
    }

    case 'combo_burst': {
      // 20-frame anime/Pokémon multi-slash cross + starburst ring!
      const r = Math.round(6 + t * 20);
      p.ellipse(cx, cy, r, Math.round(r * 0.65), 'rgba(0,0,0,0)', color);
      if (t < 0.7) {
        p.outlinedLine(cx - 18, cy - 14, cx + 18, cy + 14, '#ffffff', color, 2);
        p.outlinedLine(cx + 18, cy - 14, cx - 18, cy + 14, '#ffffff', color, 2);
      }
      for (let i = 0; i < 6; i++) {
        const ang = t * 4 + (i * Math.PI) / 3;
        p.sparkle(
          cx + Math.round(Math.cos(ang) * r),
          cy + Math.round(Math.sin(ang) * r * 0.7),
          Math.max(1, Math.round(4 * (1 - t))),
          '#ffffff',
          color
        );
      }
      break;
    }

    case 'parry_spark': {
      // 16-frame golden steel-clash star + concentric pixel rings
      const r1 = Math.round(4 + t * 21);
      const r2 = Math.round(2 + t * 13);
      p.ellipse(cx, cy, r1, r1, 'rgba(0,0,0,0)', '#ffd54f');
      if (t < 0.65) p.ellipse(cx, cy, r2, r2, 'rgba(0,0,0,0)', '#ffffff');
      p.sparkle(cx, cy, Math.round(14 * (1 - t * 0.6)), '#ffffff', '#ffd54f');
      break;
    }

    case 'dodge_afterimage': {
      // 12-frame wind-gust speed lines
      for (let i = -2; i <= 2; i++) {
        const lx = cx - 16 + Math.round(t * 24);
        const ly = cy + i * 5;
        p.line(lx, ly, lx + 12, ly, i % 2 === 0 ? '#ffffff' : color, 1);
      }
      break;
    }

    case 'impact_hit': {
      // 12-frame comic/Pokémon hit-star burst
      const r = Math.round(4 + t * 15);
      p.sparkle(cx, cy, Math.round(9 * (1 - t * 0.5)), '#ffffff', color);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        p.rect(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r), 2, 2, color);
      }
      break;
    }

    case 'guard_clang': {
      // 14-frame hexagonal shield deflection pulse
      const r = Math.round(6 + t * 14);
      p.ellipse(cx, cy, r, r, 'rgba(0,0,0,0)', '#ffd54f');
      p.sparkle(cx, cy, Math.round(8 * (1 - t)), '#ffffff', '#ffab00');
      break;
    }

    case 'stagger_burst': {
      // 16-frame dizzy shockwave ring + floating stars
      const r = Math.round(8 + t * 18);
      p.ellipse(cx, cy, r, Math.round(r * 0.5), 'rgba(0,0,0,0)', '#ffd740');
      for (let i = 0; i < 4; i++) {
        const a = t * 5 + (i * Math.PI) / 2;
        p.sparkle(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r * 0.5), 3, '#ffffff', '#ffd740');
      }
      break;
    }

    case 'dash_stun': {
      // 18-frame electric-cyan dash impact shockwave + golden orbiting stun stars!
      const rOuter = Math.round(6 + t * 21);
      const rInner = Math.round(3 + t * 14);
      p.ellipse(cx, cy, rOuter, Math.round(rOuter * 0.58), 'rgba(0,0,0,0)', '#00e5ff');
      if (t < 0.72) {
        p.ellipse(cx, cy, rInner, Math.round(rInner * 0.58), 'rgba(0,0,0,0)', '#ffffff');
      }
      // Radial impact lines
      if (t < 0.55) {
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3 + t * 1.4;
          p.line(
            cx + Math.round(Math.cos(ang) * 4),
            cy + Math.round(Math.sin(ang) * 3),
            cx + Math.round(Math.cos(ang) * rOuter),
            cy + Math.round(Math.sin(ang) * rOuter * 0.65),
            '#ffd740',
            1
          );
        }
      }
      // Orbiting bright yellow stun stars above impact point
      for (let i = 0; i < 4; i++) {
        const ang = t * 7.5 + (i * Math.PI) / 2;
        const sx = cx + Math.round(Math.cos(ang) * 14);
        const sy = cy - 10 + Math.round(Math.sin(ang) * 5);
        p.sparkle(sx, sy, 3, '#ffffff', '#ffea00');
      }
      break;
    }

    case 'phase_nova': {
      // 22-frame massive Phase II eruption wave
      const r = Math.round(4 + t * 24);
      p.ellipse(cx, cy, r, Math.round(r * 0.7), 'rgba(0,0,0,0)', color);
      p.ellipse(cx, cy, Math.max(2, r - 4), Math.max(2, Math.round((r - 4) * 0.7)), 'rgba(0,0,0,0)', '#ffffff');
      for (let i = 0; i < 8; i++) {
        const a = t * 3 + (i * Math.PI) / 4;
        p.line(cx, cy, cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r * 0.7), color, 1);
      }
      break;
    }

    case 'shrine_heal': {
      // 18-frame emerald healing sparkles rising upward
      for (let i = 0; i < 6; i++) {
        const sx = cx + Math.round(Math.sin(i * 1.9 + t * 4) * 14);
        const sy = 48 - Math.round(((t * 42 + i * 7) % 44));
        p.sparkle(sx, sy, 2, '#ffffff', '#69f0ae');
      }
      break;
    }
  }
}
