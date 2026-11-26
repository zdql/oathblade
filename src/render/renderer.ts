import type { GameEngine } from '../game/gameEngine';
import { BIOME_THEMES, drawBattlePlatform, drawBiomeBackdrop } from './biomes';
import { renderPlayerPixelSprite } from './playerPixelSprite';
import { renderBossPixelSprite } from './bossPixelSprites';
import { renderRoadGuardianSprite } from './guardianPixelSprite';
import { renderPetPixelSprite } from './petPixelSprite';
import { renderBossAreaAttacks } from './bossAreaRenderer';
import { isEverythingMaxed } from '../game/progression';
import type { RoadsidePropKind } from '../game/runContent';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private clock = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  /**
   * Maps logical combat arena world coordinates (x: -340..340, y: -200..215)
   * into 2.5D perspective screen coordinates + depth scale.
   */
  public projectArena(wx: number, wy: number): { sx: number; sy: number; scale: number } {
    const depth = Math.max(0, Math.min(1, (wy + 200) / 415));
    const scale = 0.78 + depth * 0.48;
    const sx = this.width * 0.5 + wx * (0.82 + depth * 0.42);
    const sy = 345 + depth * 285;
    return { sx, sy, scale };
  }

  public render(engine: GameEngine, dt: number): void {
    this.clock += dt;
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Screen shake offset
    if (engine.effects.shakeTime > 0 && engine.effects.shakeMagnitude > 0) {
      const mag = engine.effects.shakeMagnitude * (engine.effects.shakeTime / 0.25);
      ctx.translate(Math.round((Math.random() - 0.5) * mag * 2), Math.round((Math.random() - 0.5) * mag * 2));
    }

    const activeBoss = engine.gauntlet[engine.currentTierIndex] ?? engine.gauntlet[0];
    const biome = activeBoss.template.biome;

    if (engine.screen === 'path') {
      this.renderOverworldPath(engine, biome);
    } else if (engine.screen === 'combat' || engine.screen === 'victory_boss' || engine.screen === 'tale_of_tape') {
      this.renderCombatArena(engine, biome);
    } else {
      drawBiomeBackdrop(
        ctx,
        engine.screen === 'sanctuary' ? 'forest' : biome,
        this.width,
        this.height,
        this.clock,
        Math.sin(this.clock * 0.3) * 80,
        290
      );
      if (engine.screen === 'sanctuary') {
        this.renderSanctuaryCampfire();
      }
    }

    // Screen Flash
    if (engine.effects.flashAlpha > 0.01) {
      ctx.fillStyle = engine.effects.flashColor;
      ctx.globalAlpha = engine.effects.flashAlpha;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderSanctuaryCampfire(): void {
    const ctx = this.ctx;
    const cx = Math.floor(this.width * 0.5);
    const cy = Math.floor(this.height * 0.8);
    const frame = Math.floor(this.clock * 14) % 16;
    const flick = Math.round(Math.sin((frame / 16) * Math.PI * 2) * 8);

    const grad = ctx.createRadialGradient(cx, cy - 20, 12, cx, cy - 20, 290 + flick * 2);
    grad.addColorStop(0, 'rgba(255, 193, 7, 0.45)');
    grad.addColorStop(0.5, 'rgba(255, 87, 34, 0.18)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Pixel campfire logs & animated 16-frame pixel flame
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(cx - 32, cy - 6, 64, 12);
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(cx - 20, cy - 34 - flick, 40, 32 + flick);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(cx - 12, cy - 24 - Math.round(flick * 0.6), 24, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 5, cy - 14, 10, 10);
  }

  private renderOverworldPath(engine: GameEngine, biome: typeof engine.gauntlet[0]['template']['biome']): void {
    const ctx = this.ctx;
    const ps = engine.pathState;
    const rv = engine.roadVariation;
    const progress = Math.min(1, ps.distance / ps.targetDistance);
    const horizonY = 265;

    drawBiomeBackdrop(ctx, biome, this.width, this.height, this.clock, ps.playerX * 0.6, horizonY, rv.seed);

    // Procedural Weather / Atmosphere Tint
    ctx.save();
    ctx.fillStyle = rv.skyTint;
    ctx.fillRect(0, 0, this.width, this.height);

    // Helper: compute road center X at any perspective depth t (0 = horizon, 1 = bottom)
    const roadCenterAt = (t: number): number => {
      const worldD = ps.distance + (1 - t) * 420;
      const curve = Math.sin(worldD * rv.curveFreq + rv.curvePhase) * rv.curveAmp * (1 - t * 0.72);
      return this.width * 0.5 + curve;
    };

    // Winding Procedurally Varied Road Surface!
    const surfaceColors: Record<typeof rv.surface, { base: string; edge: string; detail: string }> = {
      dirt: { base: '#9e7d54', edge: '#5c4428', detail: 'rgba(255,235,195,0.22)' },
      cobble: { base: '#75757a', edge: '#3d3d42', detail: 'rgba(235,235,245,0.25)' },
      flagstone: { base: '#6e7b68', edge: '#364233', detail: 'rgba(180,220,165,0.22)' },
      basalt: { base: '#4a3840', edge: '#24181e', detail: 'rgba(255,115,35,0.26)' },
      carpet: { base: '#422c38', edge: '#7a1c2e', detail: 'rgba(255,213,79,0.28)' },
    };
    const surf = surfaceColors[rv.surface];

    const slices = 18;
    for (let i = 0; i < slices; i++) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;
      const y0 = horizonY + Math.pow(t0, 1.5) * (this.height - horizonY);
      const y1 = horizonY + Math.pow(t1, 1.5) * (this.height - horizonY);
      const c0 = roadCenterAt(t0);
      const c1 = roadCenterAt(t1);
      const w0 = 54 + Math.pow(t0, 1.3) * 265;
      const w1 = 54 + Math.pow(t1, 1.3) * 265;

      // Edge border
      ctx.fillStyle = surf.edge;
      ctx.beginPath();
      ctx.moveTo(c0 - w0 - 8, y0);
      ctx.lineTo(c0 + w0 + 8, y0);
      ctx.lineTo(c1 + w1 + 12, y1);
      ctx.lineTo(c1 - w1 - 12, y1);
      ctx.closePath();
      ctx.fill();

      // Main road surface
      ctx.fillStyle = surf.base;
      ctx.beginPath();
      ctx.moveTo(c0 - w0, y0);
      ctx.lineTo(c0 + w0, y0);
      ctx.lineTo(c1 + w1, y1);
      ctx.lineTo(c1 - w1, y1);
      ctx.closePath();
      ctx.fill();
    }

    // Scrolling surface markings (stepping stones / cobbles / carpet runner)
    const stoneScroll = (ps.distance % 90) / 90;
    ctx.fillStyle = surf.detail;
    for (let i = 0; i < 8; i++) {
      const t = Math.pow((i + stoneScroll) / 8, 1.65);
      const sy = Math.floor(horizonY + t * (this.height - horizonY));
      const sc = roadCenterAt(t);
      const sw = Math.floor(38 + t * 165);
      const sh = Math.floor(6 + t * 14);
      ctx.fillRect(Math.floor(sc - sw / 2), sy, sw, sh);
    }

    // Procedural Roadside Props (depth-sorted far -> near)
    const visibleProps = rv.props
      .filter((pr) => pr.distance > ps.distance - 20 && pr.distance < ps.distance + 440)
      .sort((a, b) => b.distance - a.distance);
    for (const pr of visibleProps) {
      const rel = (pr.distance - ps.distance) / 440; // 0 = near player, 1 = horizon
      const depth = Math.max(0, Math.min(1, 1 - rel));
      const py = horizonY + Math.pow(depth, 1.5) * (this.height - horizonY - 40);
      const sc = roadCenterAt(depth);
      const px = sc + pr.side * (68 + depth * 220 + pr.offsetX * depth * 0.4);
      const pScale = 0.45 + depth * 0.85;
      drawRoadsideProp(ctx, pr.kind, px, py, pScale, this.clock);
    }

    // Looming Pixel-Art Boss Gate Archway
    const gateScale = 0.42 + progress * 0.92;
    const gateY = Math.floor(horizonY + 14 + progress * 115);
    const gateX = Math.floor(roadCenterAt(progress * 0.35));
    ctx.save();
    ctx.translate(gateX, gateY);
    ctx.scale(gateScale, gateScale);

    ctx.fillStyle = '#1b1720';
    ctx.fillRect(-98, -140, 32, 144);
    ctx.fillRect(66, -140, 32, 144);
    ctx.fillRect(-110, -162, 220, 32);
    ctx.fillStyle = '#3a3242';
    ctx.fillRect(-92, -134, 20, 132);
    ctx.fillRect(72, -134, 20, 132);
    ctx.fillRect(-102, -154, 204, 16);

    const bossColor = engine.gauntlet[engine.currentTierIndex].template.palette.accent;
    const portalPulse = 0.55 + Math.sin(this.clock * 6) * 0.18;
    ctx.fillStyle = bossColor;
    ctx.globalAlpha = portalPulse;
    ctx.fillRect(-66, -130, 132, 130);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = portalPulse * 0.45;
    ctx.fillRect(-38, -110, 76, 95);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Render Sporadic Road Health Packs (bobbing Zelda/Pokémon Heart Vials!)
    const visiblePacks = engine.roadHealthPacks.filter(
      (pk) => !pk.collected && pk.distance > ps.distance - 25 && pk.distance < ps.distance + 450
    );
    for (const pk of visiblePacks) {
      const rel = Math.max(0, Math.min(1, (pk.distance - ps.distance) / 450));
      const depth = 1 - rel;
      const py = 310 + Math.pow(depth, 1.35) * 235;
      const pxPack = roadCenterAt(depth) + pk.x * (0.55 + depth * 0.55);
      const pScale = 0.55 + depth * 0.7;
      drawHealthPackSprite(ctx, pxPack, py, pScale, this.clock);
    }

    // Render Road Guardians blocking the trail (far -> near), keeping dead ones visible through all 18 KO frames!
    const visibleGuardians = engine.roadGuardians
      .filter((g) => !(g.state === 'dead' && g.animFrame >= 17) && g.distance > ps.distance - 35 && g.distance < ps.distance + 450)
      .sort((a, b) => b.distance - a.distance);

    for (const g of visibleGuardians) {
      const rel = Math.max(0, Math.min(1, (g.distance - ps.distance) / 450));
      const depth = 1 - rel;
      const gy = 310 + Math.pow(depth, 1.35) * 235;
      const gx = roadCenterAt(depth) + g.x * (0.55 + depth * 0.55);
      const gScale = 0.58 + depth * 0.68;

      drawBattlePlatform(ctx, biome, gx, gy + 6 * gScale, (g.isMiniBoss ? 66 : 46) * gScale, (g.isMiniBoss ? 20 : 14) * gScale);
      renderRoadGuardianSprite(ctx, gx, gy - g.z * gScale, gScale, g);

      const topY = gy - 102 * gScale * g.scaleMul;
      if (g.state === 'dead') {
        ctx.fillStyle = g.isMiniBoss ? '#ffea00' : '#ffffff';
        ctx.font = `800 ${Math.round((g.isMiniBoss ? 17 : 13) * gScale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(g.isMiniBoss ? '★ WARDEN FELLED! ★' : 'SLAIN!', gx, topY - (g.animFrame * 1.4));
      } else {
        const bw = Math.round((g.isMiniBoss ? 104 : 64) * gScale);
        ctx.fillStyle = g.variantColor;
        ctx.font = `800 ${Math.max(10, Math.round((g.isMiniBoss ? 14 : 12) * gScale))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const tags = `${g.isShielded ? ' [SHIELD]' : ''}${g.isArmored ? ' [ARMOR]' : ''}`;
        ctx.fillText(`${g.name}${tags}`, gx, topY - 5);

        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(gx - bw / 2, topY, bw, g.isMiniBoss ? 10 : 7);
        ctx.fillStyle = g.variantColor;
        ctx.fillRect(gx - bw / 2, topY, bw * Math.max(0, g.hp / g.maxHp), g.isMiniBoss ? 10 : 7);
        if (g.state === 'windup') {
          ctx.fillStyle = '#ffd54f';
          ctx.font = '800 13px system-ui, sans-serif';
          const warn = g.isMiniBoss
            ? '! 3-HIT FURY (L) !'
            : g.variant === 'berserker'
            ? '! DOUBLE STRIKE (L) !'
            : g.variant === 'trickster'
            ? '! FEINT STRIKE !'
            : '! PARRY (L) !';
          ctx.fillText(warn, gx, topY - 20);
        }
      }
    }

    // Weather foreground streaks (rain or embers)
    if (rv.weather === 'rain') {
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.38)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 36; i++) {
        const rx = ((i * 73 + this.clock * 140) % this.width);
        const ry = ((i * 97 + this.clock * 580) % this.height);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 6, ry + 18);
        ctx.stroke();
      }
    }

    // Pokémon-style turf disc & walking/fighting Player Back-Sprite
    const px = this.width * 0.5 + ps.playerX;
    drawBattlePlatform(ctx, biome, px, 594, 54, 16);
    renderPlayerPixelSprite(ctx, px, 592, 1.25, {
      event: engine.playerAnim.currentEvent,
      frame: engine.playerAnim.frame,
      swingDir: engine.player.swingDir,
      counterReady: engine.pathDefenseMode === 'parry',
      upgrades: engine.progress.upgrades,
      styleId: engine.progress.activeStyleId,
      allMaxed: isEverythingMaxed(engine.progress),
    });
    if (engine.stats.petLevel > 0) {
      renderPetPixelSprite(ctx, px - 68, 598, 1.1, engine.stats.petLevel, this.clock, false);
    }

    // Top Path Banner
    const bossInst = engine.gauntlet[engine.currentTierIndex];
    const theme = BIOME_THEMES[biome];
    const remaining = engine.roadGuardians.filter((g) => g.state !== 'dead').length;
    ctx.fillStyle = 'rgba(12, 14, 20, 0.84)';
    ctx.beginPath();
    ctx.roundRect(this.width * 0.5 - 295, 18, 590, 82, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffd54f';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `TIER ${bossInst.template.tier} OF ${engine.gauntlet.length}  •  ${theme.label.toUpperCase()} (${rv.weather.toUpperCase()})  •  GUARDIANS LEFT: ${remaining}`,
      this.width * 0.5,
      40
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 19px Georgia, serif';
    ctx.fillText(`Road to ${bossInst.template.name}, ${bossInst.template.title}`, this.width * 0.5, 65);

    const barW = 360;
    const barX = this.width * 0.5 - barW * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(barX, 78, barW, 6);
    ctx.fillStyle = bossInst.template.palette.accent;
    ctx.fillRect(barX, 78, barW * progress, 6);

    // Bottom-left mini HP & Run Buffs on the Road
    ctx.fillStyle = 'rgba(12, 14, 20, 0.82)';
    ctx.beginPath();
    ctx.roundRect(22, this.height - 76, 260, 56, 10);
    ctx.fill();
    ctx.fillStyle = '#ef5350';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${engine.player.hp}/${engine.player.maxHp}   •   Gold: ${engine.progress.gold}`, 34, this.height - 52);
    ctx.fillStyle = '#69f0ae';
    ctx.font = '600 11px system-ui, sans-serif';
    const buffText =
      engine.activeRunBuffs.length > 0
        ? `Run Buffs: ${engine.activeRunBuffs.map((b) => b.name).join(', ')}`
        : 'Defeat bosses to earn Run Buffs!';
    ctx.fillText(buffText.slice(0, 42), 34, this.height - 32);

    ctx.fillStyle = 'rgba(12, 14, 20, 0.82)';
    ctx.beginPath();
    ctx.roundRect(this.width * 0.5 - 245, this.height - 54, 490, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      remaining > 0
        ? 'W/A/S/D Move  •  K/J Slay Road Guardians  •  L Parry / Dodge'
        : 'Road Clear! Hold W or press SPACE / ENTER to enter the Boss Gate',
      this.width * 0.5,
      this.height - 31
    );

    // Interactive Roadside Minigame Overlay (drawn crisply on canvas when active!)
    if (engine.activeRoadMinigame && engine.activeRoadMinigame.active) {
      this.renderRoadMinigame(engine);
    }
    ctx.restore();
  }

  private renderRoadMinigame(engine: GameEngine): void {
    const ctx = this.ctx;
    const mg = engine.activeRoadMinigame;
    if (!mg) return;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;

    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cx - 280, cy - 135, 560, 270, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd54f';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(`ROADSIDE MINIGAME  •  TIME: ${Math.max(0, mg.maxTimer - mg.timer).toFixed(1)}s`, cx, cy - 104);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px Georgia, serif';
    ctx.fillText(mg.title, cx, cy - 74);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(mg.instructions, cx, cy - 48);

    if (mg.kind === 'anvil_timing') {
      const barW = 420;
      const bx = cx - barW / 2;
      ctx.fillStyle = '#263238';
      ctx.fillRect(bx, cy - 8, barW, 28);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(cx - barW * 0.14, cy - 8, barW * 0.28, 28);
      const curX = bx + mg.cursor * barW;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(curX - 5, cy - 16, 10, 44);
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Tempered: ${mg.score} / ${mg.targetScore}`, cx, cy + 56);
    } else if (mg.kind === 'parry_gauntlet') {
      const ringR = Math.max(12, 95 * (1 - mg.cursor));
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy + 12, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = mg.cursor >= 0.72 ? '#69f0ae' : '#ff5252';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy + 12, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.fillText('L', cx, cy + 18);
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(`Deflected: ${mg.score} / ${mg.targetScore}`, cx, cy + 88);
    } else if (mg.kind === 'boulder_dodge' || mg.kind === 'coin_catch') {
      const laneW = 110;
      const startX = cx - laneW * 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === mg.playerLane ? 'rgba(105, 240, 174, 0.22)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(startX + i * laneW + 4, cy - 28, laneW - 8, 128);
      }
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(startX + mg.playerLane * laneW + laneW / 2 - 14, cy + 72, 28, 22);
      ctx.fillStyle = mg.kind === 'coin_catch' ? '#ffd740' : '#ff9100';
      for (const b of mg.lanes) {
        if (b.y < 0) continue;
        ctx.beginPath();
        ctx.arc(startX + b.lane * laneW + laneW / 2, cy - 20 + b.y * 105, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      if (mg.kind === 'coin_catch') {
        ctx.fillStyle = '#ffd740';
        ctx.font = '700 14px system-ui, sans-serif';
        ctx.fillText(`Caught: ${mg.score} / ${mg.targetScore}`, cx, cy + 116);
      }
    } else if (mg.kind === 'blade_clash') {
      const barW = 420;
      const bx = cx - barW / 2;
      ctx.fillStyle = '#3b151a';
      ctx.fillRect(bx, cy - 6, barW, 30);
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(bx, cy - 6, barW * mg.cursor, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.fillText(`MASH K / J  (${Math.round(mg.cursor * 100)}%)`, cx, cy + 56);
    } else if (mg.kind === 'stance_mirror') {
      ctx.fillStyle = '#80deea';
      ctx.font = '900 44px system-ui, sans-serif';
      ctx.fillText(mg.stanceDir, cx, cy + 28);
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Matched: ${mg.score} / ${mg.targetScore}`, cx, cy + 78);
    } else {
      ctx.fillStyle = '#ffd54f';
      ctx.font = '900 54px system-ui, sans-serif';
      ctx.fillText(mg.promptKey, cx, cy + 32);
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Hits: ${mg.score} / ${mg.targetScore}`, cx, cy + 78);
    }

    if (mg.flashTimer > 0 && mg.flashMsg) {
      ctx.fillStyle = '#fff59d';
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.fillText(mg.flashMsg, cx, cy + 114);
    }
    ctx.restore();
  }

  private renderCombatArena(engine: GameEngine, biome: typeof engine.gauntlet[0]['template']['biome']): void {
    const ctx = this.ctx;
    drawBiomeBackdrop(
      ctx,
      biome,
      this.width,
      this.height,
      this.clock,
      engine.playerBody.pos.x * 0.35,
      255,
      engine.boss.instance.seed
    );

    const pProj = this.projectArena(engine.playerBody.pos.x, engine.playerBody.pos.y);
    const bProj = this.projectArena(engine.bossBody.pos.x, engine.bossBody.pos.y);

    // Classic Pokémon-style Battle Terrain Platforms beneath both combatants!
    drawBattlePlatform(ctx, biome, bProj.sx, bProj.sy + 6 * bProj.scale, 108 * bProj.scale, 32 * bProj.scale);
    drawBattlePlatform(ctx, biome, pProj.sx, pProj.sy + 6 * pProj.scale, 68 * pProj.scale, 22 * pProj.scale);

    // Boss windup danger ring on arena floor
    const activeStep = engine.boss.currentMove?.steps[engine.boss.stepIndex];
    if (engine.boss.state === 'windup' && activeStep && activeStep.damageMul > 0) {
      const windupPct = Math.min(1, engine.boss.stateTimer / Math.max(0.01, engine.boss.stateDuration));
      ctx.save();
      ctx.strokeStyle = activeStep.parryable ? 'rgba(255, 215, 64, 0.72)' : 'rgba(255, 23, 68, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        bProj.sx,
        bProj.sy + 8 * bProj.scale,
        activeStep.hitboxRadius * bProj.scale * windupPct,
        activeStep.hitboxRadius * 0.36 * bProj.scale * windupPct,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // Render Detailed 20-Frame Boss Area Attacks (telegraph zones & bespoke detonations!)
    if (engine.activeAreaAttacks.length > 0) {
      renderBossAreaAttacks(ctx, engine.activeAreaAttacks, (wx, wy) => this.projectArena(wx, wy), this.clock);
    }

    // Depth-sorted Pokémon-style Pixel Sprites (Boss, Summoned Minions, and Player)!
    const drawList: Array<{ y: number; draw: () => void }> = [
      {
        y: engine.bossBody.pos.y,
        draw: () =>
          renderBossPixelSprite(
            ctx,
            bProj.sx,
            bProj.sy - engine.bossBody.z * bProj.scale,
            bProj.scale,
            {
              visualId: engine.boss.instance.template.visualId,
              event: engine.bossAnim.currentEvent,
              frame: engine.bossAnim.frame,
              phase: engine.boss.phase,
              attackSide: activeStep?.side,
              isShielding: engine.boss.isShielding,
              flashHit: engine.boss.flashTimer > 0,
              accentColor: engine.boss.instance.template.palette.accent,
            }
          ),
      },
      {
        y: engine.playerBody.pos.y,
        draw: () => {
          renderPlayerPixelSprite(
            ctx,
            pProj.sx,
            pProj.sy - engine.playerBody.z * pProj.scale,
            pProj.scale,
            {
              event: engine.playerAnim.currentEvent,
              frame: engine.playerAnim.frame,
              swingDir: engine.player.swingDir,
              counterReady: engine.player.counterWindowTimer > 0,
              comboStyle: engine.player.activeCombo?.visualStyle,
              accentColor: engine.player.activeCombo?.accentColor,
              dodgeDirX: engine.playerBody.defense.direction.x || 1,
              upgrades: engine.progress.upgrades,
              styleId: engine.progress.activeStyleId,
              allMaxed: isEverythingMaxed(engine.progress),
            }
          );
          if (engine.stats.petLevel > 0) {
            const petX = pProj.sx - 64 * pProj.scale + (engine.petAttackFlash > 0 ? 34 * pProj.scale : 0);
            const petY = pProj.sy + 6 * pProj.scale - (engine.petAttackFlash > 0 ? 28 * pProj.scale : 0);
            renderPetPixelSprite(ctx, petX, petY, pProj.scale, engine.stats.petLevel, this.clock, engine.petAttackFlash > 0);
          }
        },
      },
    ];

    for (const m of engine.arenaMinions) {
      const mProj = this.projectArena(m.x, m.y);
      drawList.push({
        y: m.y,
        draw: () => {
          drawBattlePlatform(ctx, biome, mProj.sx, mProj.sy + 5 * mProj.scale, 38 * mProj.scale, 12 * mProj.scale);
          renderRoadGuardianSprite(ctx, mProj.sx, mProj.sy, mProj.scale * 0.9, m);
          if (m.state !== 'dead') {
            const bw = Math.round(48 * mProj.scale);
            const ty = mProj.sy - 88 * mProj.scale * m.scaleMul;
            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fillRect(mProj.sx - bw / 2, ty, bw, 6);
            ctx.fillStyle = m.variantColor;
            ctx.fillRect(mProj.sx - bw / 2, ty, bw * Math.max(0, m.hp / m.maxHp), 6);
            if (m.state === 'windup') {
              ctx.fillStyle = '#ffd54f';
              ctx.font = '800 12px system-ui, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('!', mProj.sx, ty - 5);
            }
          }
        },
      });
    }

    for (const pk of engine.arenaHealthPacks) {
      const pkProj = this.projectArena(pk.x, pk.y);
      drawList.push({
        y: pk.y,
        draw: () => drawHealthPackSprite(ctx, pkProj.sx, pkProj.sy, pkProj.scale, this.clock),
      });
    }

    drawList.sort((a, b) => a.y - b.y);
    for (const item of drawList) item.draw();

    // Multi-frame Pixel VFX Sprites (12–22 frames per event!)
    engine.vfx.render(ctx, (wx, wy) => this.projectArena(wx, wy));

    // Pixel Particles
    for (const pt of engine.effects.particles) {
      const proj = this.projectArena(pt.x, pt.y);
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      const sz = Math.max(2, Math.round(pt.size * proj.scale));
      ctx.fillRect(Math.round(proj.sx - sz / 2), Math.round(proj.sy - pt.z * proj.scale - sz / 2), sz, sz);
      ctx.restore();
    }

    // Floating Combat Texts
    for (const ft of engine.effects.texts) {
      const proj = this.projectArena(ft.x, ft.y);
      const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(20 * ft.scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, proj.sx, proj.sy - ft.z * proj.scale);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, proj.sx, proj.sy - ft.z * proj.scale);
      ctx.restore();
    }

    if (engine.showPhysicsDebug) {
      this.renderPhysicsDebug(engine);
    }

    if (engine.screen === 'combat') {
      this.renderCombatHud(engine);
    }
  }

  private renderPhysicsDebug(engine: GameEngine): void {
    const ctx = this.ctx;
    const snap = engine.physics.getDebugSnapshot();
    ctx.save();

    for (const b of snap.bodies) {
      const proj = this.projectArena(b.x, b.y);
      ctx.strokeStyle = b.isInvulnerable ? '#00e5ff' : b.faction === 'player' ? '#69f0ae' : '#ffab40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(proj.sx, proj.sy, b.hurtRadius * proj.scale, b.hurtRadius * 0.45 * proj.scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const hb of snap.hitboxes) {
      const proj = this.projectArena(hb.x, hb.y);
      ctx.fillStyle = hb.faction === 'player' ? 'rgba(105, 240, 174, 0.25)' : 'rgba(255, 23, 68, 0.3)';
      ctx.strokeStyle = hb.faction === 'player' ? '#69f0ae' : '#ff1744';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(proj.sx, proj.sy, hb.radius * proj.scale, hb.radius * 0.45 * proj.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Live animation frame telemetry
    ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
    ctx.fillRect(20, 16, 270, 52);
    ctx.fillStyle = '#69f0ae';
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `PLAYER: ${engine.playerAnim.currentEvent} [${engine.playerAnim.frame + 1}/${engine.playerAnim.getClip().frames}]`,
      30,
      36
    );
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(
      `BOSS:   ${engine.bossAnim.currentEvent} [${engine.bossAnim.frame + 1}/${engine.bossAnim.getClip().frames}]`,
      30,
      54
    );

    ctx.restore();
  }

  private renderCombatHud(engine: GameEngine): void {
    const ctx = this.ctx;
    const b = engine.boss;
    const p = engine.player;

    ctx.save();

    // ---- TOP: POKÉMON-INSPIRED BOSS BATTLE PLATE ----
    const barW = 540;
    const barX = this.width * 0.5 - barW * 0.5;
    ctx.fillStyle = 'rgba(14, 16, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(barX - 18, 14, barW + 36, 78, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px Georgia, serif';
    ctx.textAlign = 'left';
    const traitStr = b.instance.traits.map((t) => t.name).join(' • ');
    ctx.fillText(`Lv.${b.instance.template.tier * 15}  ${b.instance.template.name}, ${b.instance.template.title}`, barX, 36);

    ctx.fillStyle = '#ffd54f';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(traitStr, barX + barW, 36);

    // HP Bar (green -> yellow -> red like Pokémon!)
    const hpRatio = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = '#1f161b';
    ctx.fillRect(barX, 45, barW, 16);
    ctx.fillStyle = hpRatio > 0.5 ? '#ef5350' : hpRatio > 0.22 ? '#ff9100' : '#ff1744';
    ctx.fillRect(barX, 45, barW * hpRatio, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.hp} / ${b.maxHp} HP`, this.width * 0.5, 57);

    // Poise Bar
    const poiseRatio = Math.max(0, b.poise / b.maxPoise);
    ctx.fillStyle = '#242014';
    ctx.fillRect(barX, 66, barW, 8);
    ctx.fillStyle = b.state === 'staggered' ? '#76ff03' : '#ffd54f';
    ctx.fillRect(barX, 66, barW * poiseRatio, 8);

    // Boss Telegraph Callout Pill
    if (b.tellLabel) {
      ctx.fillStyle = b.state === 'staggered' ? 'rgba(118, 255, 3, 0.94)' : 'rgba(255, 82, 82, 0.92)';
      ctx.beginPath();
      ctx.roundRect(this.width * 0.5 - 145, 98, 290, 28, 14);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.tellLabel, this.width * 0.5, 117);
    }

    // ---- BOTTOM LEFT: ZELDA HEARTS & STAMINA PLATE ----
    ctx.fillStyle = 'rgba(14, 16, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(22, this.height - 102, 316, 82, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const maxHeartsToDraw = Math.min(10, Math.ceil(p.maxHp / 25));
    const hpPerHeart = p.maxHp / maxHeartsToDraw;
    for (let i = 0; i < maxHeartsToDraw; i++) {
      const hx = 40 + i * 24;
      const hy = this.height - 76;
      const heartHp = Math.max(0, Math.min(hpPerHeart, p.hp - i * hpPerHeart));
      drawHeart(ctx, hx, hy, 8.5, heartHp / hpPerHeart);
    }

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.hp}/${p.maxHp}`, 326, this.height - 71);

    ctx.fillStyle = '#1a2b22';
    ctx.fillRect(36, this.height - 48, 288, 12);
    ctx.fillStyle = p.stamina < 20 ? '#ffab40' : '#69f0ae';
    ctx.fillRect(36, this.height - 48, 288 * Math.max(0, p.stamina / p.maxStamina), 12);
    ctx.fillStyle = '#b0bec5';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STAMINA', 36, this.height - 24);

    if (p.counterWindowTimer > 0) {
      ctx.fillStyle = '#ffd740';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('COUNTER READY! (J / K)', 324, this.height - 24);
    } else if (p.heavyAttackCooldown > 0) {
      ctx.fillStyle = '#ffab91';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`HEAVY (J): ${p.heavyAttackCooldown.toFixed(1)}s`, 324, this.height - 24);
    } else {
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('HEAVY (J): READY', 324, this.height - 24);
    }

    // ---- BOTTOM RIGHT: COMBO TRACKER & CONTROLS ----
    ctx.fillStyle = 'rgba(14, 16, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(this.width - 344, this.height - 102, 322, 82, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(123, 227, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd54f';
    ctx.font = '700 12px system-ui, sans-serif';
    const bufStr = p.inputBuffer.length > 0 ? p.inputBuffer.join(' → ') : 'Ready';
    ctx.fillText(`COMBO CHAIN: ${bufStr}`, this.width - 328, this.height - 76);

    if (p.comboHints.length > 0) {
      const hint = p.comboHints[0];
      ctx.fillStyle = hint.accentColor;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(`Next: ${hint.name} (${hint.sequence.join('→')})`, this.width - 328, this.height - 55);
    } else {
      ctx.fillStyle = '#90a4ae';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText('WASD Move • K Quick • J Strong • L Parry / +WASD Dodge', this.width - 328, this.height - 55);
    }

    ctx.fillStyle = '#b0bec5';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText(`Gold: ${engine.progress.gold}  •  XP: ${engine.progress.xp}  •  F1 Physics Lab`, this.width - 328, this.height - 32);

    if (p.lastComboBanner) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.lastComboBanner.timer * 1.5);
      ctx.fillStyle = p.lastComboBanner.color;
      ctx.font = '900 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 5;
      ctx.strokeText(`✦ ${p.lastComboBanner.name.toUpperCase()} ✦`, this.width * 0.5, this.height - 124);
      ctx.fillText(`✦ ${p.lastComboBanner.name.toUpperCase()} ✦`, this.width * 0.5, this.height - 124);
      ctx.restore();
    }

    // Active Run-Only Buff Badges above player HUD
    if (engine.activeRunBuffs.length > 0) {
      let bx = 22;
      const by = this.height - 126;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      for (const buff of engine.activeRunBuffs) {
        const tw = ctx.measureText(buff.name).width + 16;
        ctx.fillStyle = 'rgba(14, 16, 24, 0.88)';
        ctx.beginPath();
        ctx.roundRect(bx, by, tw, 20, 6);
        ctx.fill();
        ctx.strokeStyle = buff.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = buff.color;
        ctx.fillText(buff.name, bx + 8, by + 14);
        bx += tw + 6;
      }
    }

    ctx.restore();
  }
}

function drawRoadsideProp(
  ctx: CanvasRenderingContext2D,
  kind: RoadsidePropKind,
  x: number,
  y: number,
  scale: number,
  time: number
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  if (kind === 'signpost') {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-4, -38, 8, 40);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-20, -34, 40, 14);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-16, -29, 28, 3);
  } else if (kind === 'brazier') {
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-10, -24, 20, 26);
    ctx.fillRect(-14, -28, 28, 8);
    const flick = Math.round(Math.sin(time * 12 + x) * 4);
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(-8, -42 - flick, 16, 16 + flick);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-4, -36, 8, 10);
  } else if (kind === 'statue') {
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(-14, -12, 28, 14);
    ctx.fillRect(-10, -44, 20, 32);
    ctx.fillStyle = '#78909c';
    ctx.fillRect(-7, -54, 14, 12);
  } else if (kind === 'mushroom') {
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(-4, -14, 8, 16);
    ctx.fillStyle = '#76ff03';
    ctx.fillRect(-12, -24, 24, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -22, 4, 4);
    ctx.fillRect(4, -20, 4, 4);
  } else if (kind === 'banner') {
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-3, -52, 6, 54);
    const wave = Math.round(Math.sin(time * 6 + x) * 3);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(3, -50, 22 + wave, 26);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(8, -44, 10, 10);
  } else {
    ctx.fillStyle = '#455a64';
    ctx.fillRect(-16, -16, 32, 18);
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(-12, -22, 20, 8);
  }

  ctx.restore();
}

function drawHealthPackSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number
): void {
  const bob = Math.sin(time * 6 + x * 0.1) * 5 * scale;
  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4 * scale, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glowing emerald-white halo
  ctx.strokeStyle = 'rgba(105, 240, 174, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 16 * scale + bob, 16 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Pixel-crisp red-and-white health pack / heart vial!
  ctx.translate(Math.round(x), Math.round(y - 16 * scale + bob));
  ctx.scale(scale, scale);
  ctx.fillStyle = '#14181f';
  ctx.fillRect(-11, -11, 22, 22);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-9, -9, 18, 18);
  ctx.fillStyle = '#ef5350';
  ctx.fillRect(-3, -7, 6, 14);
  ctx.fillRect(-7, -3, 14, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-7, -7, 3, 3);
  ctx.restore();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fillRatio: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.85);
  ctx.bezierCurveTo(-r * 1.3, 0, -r * 1.1, -r * 1.1, 0, -r * 0.35);
  ctx.bezierCurveTo(r * 1.1, -r * 1.1, r * 1.3, 0, 0, r * 0.85);
  ctx.closePath();

  ctx.fillStyle = '#331c20';
  ctx.fill();
  if (fillRatio > 0) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = fillRatio > 0.5 ? '#ef5350' : '#ff8a65';
    ctx.fillRect(-r * 1.5, -r * 1.2, r * 3 * fillRatio, r * 2.5);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}
