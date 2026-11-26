import type { BossAreaSpec } from '../bosses';

export interface ActiveBossAreaAttack {
  id: string;
  spec: BossAreaSpec;
  phase: 'telegraph' | 'active';
  elapsed: number;
  windupDuration: number;
  activeDuration: number;
  /** World-space target coordinates for zones/lanes/cross/ring */
  targets: Array<{ x: number; y: number; radius: number }>;
  damage: number;
  knockback: number;
  parryable: boolean;
  detonated: boolean;
}

/**
 * Renders detailed 20-frame bespoke pixel-art animations for all 30 unique boss area attacks!
 */
export function renderBossAreaAttacks(
  ctx: CanvasRenderingContext2D,
  attacks: ActiveBossAreaAttack[],
  project: (wx: number, wy: number) => { sx: number; sy: number; scale: number },
  time: number
): void {
  for (const atk of attacks) {
    const { spec, phase, targets } = atk;
    const t =
      phase === 'telegraph'
        ? Math.min(1, atk.elapsed / Math.max(0.05, atk.windupDuration))
        : Math.min(1, atk.elapsed / Math.max(0.05, atk.activeDuration));
    const frame = Math.floor(t * 19); // 20 discrete animation frames per stage!

    ctx.save();
    for (let i = 0; i < targets.length; i++) {
      const tgt = targets[i];
      const proj = project(tgt.x, tgt.y);
      const rx = tgt.radius * proj.scale;
      const ry = tgt.radius * 0.4 * proj.scale;

      if (phase === 'telegraph') {
        // Pulsing danger zone telegraph on the 2.5D arena floor
        ctx.fillStyle = spec.color;
        ctx.globalAlpha = 0.12 + t * 0.24;
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // Filling inner ring showing exact detonation timing!
        ctx.strokeStyle = spec.secondaryColor;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, rx * t, ry * t, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Outer crisp warning border
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      // DETONATION PHASE — bespoke detailed multi-frame pixel animations!
      const vis = spec.visual;
      const fade = Math.max(0, 1 - Math.max(0, t - 0.6) / 0.4);
      ctx.globalAlpha = fade;

      if (spec.shape === 'ring') {
        // Expanding concentric shockwave rings + orbiting shards
        const curRx = rx * (0.35 + t * 0.78);
        const curRy = ry * (0.35 + t * 0.78);
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = Math.max(3, 14 * (1 - t * 0.6));
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, curRx, curRy, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = spec.secondaryColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, curRx * 0.82, curRy * 0.82, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting pixel shards along ring edge
        for (let s = 0; s < 10; s++) {
          const a = (s / 10) * Math.PI * 2 + frame * 0.25;
          const sx = Math.round(proj.sx + Math.cos(a) * curRx);
          const sy = Math.round(proj.sy + Math.sin(a) * curRy - 10 * proj.scale);
          ctx.fillStyle = s % 2 === 0 ? '#ffffff' : spec.secondaryColor;
          ctx.fillRect(sx - 4, sy - 4, 8, 8);
        }
      } else if (
        vis === 'boulder_barrage' ||
        vis === 'pillar_collapse' ||
        vis === 'cinder_meteors' ||
        vis === 'icicle_rain' ||
        vis === 'lance_rain' ||
        vis === 'oath_blades_rain'
      ) {
        // Falling sky projectile -> ground impact crater & burst!
        const fallT = Math.min(1, t * 2.2);
        const dropY = proj.sy - (1 - fallT) * 230 * proj.scale;
        const sz = 18 * proj.scale;

        // Ground impact ring once landed
        if (fallT >= 0.85) {
          ctx.strokeStyle = spec.color;
          ctx.lineWidth = 5 * fade;
          ctx.beginPath();
          ctx.ellipse(proj.sx, proj.sy, rx * (0.5 + t * 0.55), ry * (0.5 + t * 0.55), 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw bespoke falling sprite (sword / spear / icicle / meteor / boulder / pillar)
        ctx.fillStyle = spec.color;
        if (vis === 'lance_rain' || vis === 'oath_blades_rain' || vis === 'icicle_rain') {
          ctx.fillRect(Math.round(proj.sx - 5 * proj.scale), Math.round(dropY - 46 * proj.scale), Math.round(10 * proj.scale), Math.round(48 * proj.scale));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(proj.sx - 2 * proj.scale), Math.round(dropY - 44 * proj.scale), Math.round(4 * proj.scale), Math.round(40 * proj.scale));
          if (vis === 'oath_blades_rain') {
            ctx.fillStyle = spec.secondaryColor;
            ctx.fillRect(Math.round(proj.sx - 13 * proj.scale), Math.round(dropY - 36 * proj.scale), Math.round(26 * proj.scale), Math.round(6 * proj.scale));
          }
        } else {
          ctx.fillRect(Math.round(proj.sx - sz), Math.round(dropY - sz * 2), Math.round(sz * 2), Math.round(sz * 2));
          ctx.fillStyle = spec.secondaryColor;
          ctx.fillRect(Math.round(proj.sx - sz * 0.6), Math.round(dropY - sz * 1.6), Math.round(sz * 1.2), Math.round(sz * 1.2));
        }
      } else if (vis === 'thunder_strikes' || vis === 'arc_lanes') {
        // Crackling sky-to-ground pixel lightning bolt!
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = 8 * proj.scale * fade;
        ctx.beginPath();
        ctx.moveTo(proj.sx + Math.sin(frame + i) * 14, proj.sy - 280 * proj.scale);
        ctx.lineTo(proj.sx - 16 * proj.scale, proj.sy - 170 * proj.scale);
        ctx.lineTo(proj.sx + 18 * proj.scale, proj.sy - 85 * proj.scale);
        ctx.lineTo(proj.sx, proj.sy);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * proj.scale * fade;
        ctx.stroke();

        ctx.fillStyle = spec.secondaryColor;
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (spec.shape === 'cross') {
        // Colossal glowing X-slash cross!
        ctx.strokeStyle = spec.color;
        ctx.lineWidth = 14 * proj.scale * fade;
        const arm = rx * 1.2;
        ctx.beginPath();
        ctx.moveTo(proj.sx - arm, proj.sy - arm * 0.45);
        ctx.lineTo(proj.sx + arm, proj.sy + arm * 0.45);
        ctx.moveTo(proj.sx + arm, proj.sy - arm * 0.45);
        ctx.lineTo(proj.sx - arm, proj.sy + arm * 0.45);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5 * proj.scale * fade;
        ctx.stroke();
      } else {
        // Erupting pillars, roots, venom pools, magma waves, glacier spikes, solar flares!
        const eruptH = Math.sin(Math.min(1, t * 1.45) * Math.PI) * 115 * proj.scale;
        ctx.fillStyle = spec.color;
        ctx.beginPath();
        ctx.ellipse(proj.sx, proj.sy, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stepped pixel eruption column / spikes
        const colW = rx * 0.72;
        ctx.fillStyle = spec.secondaryColor;
        ctx.fillRect(Math.round(proj.sx - colW * 0.5), Math.round(proj.sy - eruptH), Math.round(colW), Math.round(eruptH));
        ctx.fillStyle = spec.color;
        ctx.fillRect(Math.round(proj.sx - colW * 0.35), Math.round(proj.sy - eruptH * 1.15), Math.round(colW * 0.7), Math.round(eruptH * 1.15));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(proj.sx - colW * 0.14), Math.round(proj.sy - eruptH * 0.95), Math.round(colW * 0.28), Math.round(eruptH * 0.95));

        // Bubbling / crackling top pixel motes
        const moteY = proj.sy - eruptH - 8 - ((frame * 3 + i * 7) % 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(proj.sx - 12 + Math.sin(time * 15 + i) * 10), Math.round(moteY), 6, 6);
      }
    }
    ctx.restore();
  }
}
