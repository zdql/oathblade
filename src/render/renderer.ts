import type { GameEngine } from '../game/gameEngine';
import { BIOME_THEMES, drawBattlePlatform, drawBiomeBackdrop } from './biomes';
import { renderPlayerPixelSprite } from './playerPixelSprite';
import { renderBossPixelSprite } from './bossPixelSprites';
import { renderRoadGuardianSprite } from './guardianPixelSprite';
import { renderPetPixelSprite } from './petPixelSprite';
import { renderBossAreaAttacks } from './bossAreaRenderer';
import { getXpForNextLevel, isEverythingMaxed } from '../game/progression';
import type { RoadsidePropKind } from '../game/runContent';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private clock = 0;
  private displayHp = -1;
  private displayGold = -1;
  private displayXpRatio = -1;
  private lastRenderedLevel = -1;

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

    // Smoothly interpolate HUD counters & trailing HP bar
    const lerpRate = Math.min(1, dt * 8.5);
    const targetHp = engine.player ? engine.player.hp : 0;
    if (this.displayHp < 0 || Math.abs(this.displayHp - targetHp) > engine.player.maxHp * 0.9) {
      this.displayHp = targetHp;
    } else {
      this.displayHp += (targetHp - this.displayHp) * Math.min(1, dt * 5.2);
      if (Math.abs(this.displayHp - targetHp) < 0.4) this.displayHp = targetHp;
    }
    if (this.displayGold < 0) this.displayGold = engine.progress.gold;
    else {
      this.displayGold += (engine.progress.gold - this.displayGold) * lerpRate;
      if (Math.abs(this.displayGold - engine.progress.gold) < 0.5) this.displayGold = engine.progress.gold;
    }
    const xpNeededNow = getXpForNextLevel(engine.progress.level);
    const targetXpRatio = Math.max(0, Math.min(1, engine.progress.xp / Math.max(1, xpNeededNow)));
    if (this.displayXpRatio < 0 || this.lastRenderedLevel !== engine.progress.level) {
      this.lastRenderedLevel = engine.progress.level;
      this.displayXpRatio = targetXpRatio < this.displayXpRatio ? 0 : targetXpRatio;
    }
    this.displayXpRatio += (targetXpRatio - this.displayXpRatio) * Math.min(1, dt * 6.5);
    if (Math.abs(this.displayXpRatio - targetXpRatio) < 0.004) this.displayXpRatio = targetXpRatio;

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

    if (engine.screen === 'path' || engine.screen === 'raid_prompt') {
      this.renderOverworldPath(engine, biome);
    } else if (
      engine.screen === 'combat' ||
      engine.screen === 'victory_boss' ||
      engine.screen === 'victory_raid' ||
      engine.screen === 'tale_of_tape'
    ) {
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
      } else if (engine.screen === 'minigame_portal' || engine.screen === 'minigame_arcade') {
        this.renderMinigamePortalBackdrop();
      }
      if (engine.screen === 'minigame_arcade' && engine.activeRoadMinigame && engine.activeRoadMinigame.active) {
        this.renderRoadMinigame(engine);
      }
    }

    // Damage / Heal Edge Vignette Pulse
    if (engine.effects.vignetteAlpha > 0.01) {
      const grad = ctx.createRadialGradient(
        this.width * 0.5,
        this.height * 0.5,
        this.height * 0.28,
        this.width * 0.5,
        this.height * 0.5,
        this.width * 0.62
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, engine.effects.vignetteColor);
      ctx.save();
      ctx.globalAlpha = engine.effects.vignetteAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // Screen Flash
    if (engine.effects.flashAlpha > 0.01) {
      ctx.fillStyle = engine.effects.flashColor;
      ctx.globalAlpha = engine.effects.flashAlpha;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    // Screen-Space HUD Animations (flying gold coins, XP orbs, heal sparkles & popups)
    if (engine.screen === 'path' || engine.screen === 'combat') {
      this.renderHudAnimations(engine);
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

  private renderMinigamePortalBackdrop(): void {
    const ctx = this.ctx;
    const cx = Math.floor(this.width * 0.5);
    const cy = Math.floor(this.height * 0.5);
    const pulse = Math.sin(this.clock * 3.5) * 16;

    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 420 + pulse);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    grad.addColorStop(0.45, 'rgba(105, 240, 174, 0.16)');
    grad.addColorStop(1, 'rgba(6, 10, 18, 0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 229, 255, 0.28)' : 'rgba(255, 215, 64, 0.22)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 140 + i * 78 + Math.sin(this.clock * 2.5 + i) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
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

    // Render Optional 25%-chance Area Raid Rift Portal!
    const rp = engine.roadRaidPortal;
    if (rp && !rp.cleared && rp.distance > ps.distance - 30 && rp.distance < ps.distance + 470) {
      const rel = Math.max(0, Math.min(1, (rp.distance - ps.distance) / 470));
      const depth = 1 - rel;
      const ry = 310 + Math.pow(depth, 1.35) * 235;
      const rxPortal = roadCenterAt(depth) + rp.x * (0.55 + depth * 0.55);
      const rScale = 0.62 + depth * 0.8;
      drawRaidPortalSprite(ctx, rxPortal, ry, rScale, this.clock, rp.declined);
    }

    // Render Mini-Boss Guarded Treasure Chests!
    const visibleChests = engine.roadChests.filter(
      (c) => c.distance > ps.distance - 30 && c.distance < ps.distance + 460
    );
    for (const c of visibleChests) {
      const rel = Math.max(0, Math.min(1, (c.distance - ps.distance) / 460));
      const depth = 1 - rel;
      const cy = 310 + Math.pow(depth, 1.35) * 235;
      const cxChest = roadCenterAt(depth) + c.x * (0.55 + depth * 0.55);
      const cScale = 0.58 + depth * 0.72;
      drawTreasureChestSprite(ctx, cxChest, cy, cScale, c.unlocked, c.opened, this.clock);
    }

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
        if (g.stunned && g.state === 'hurt') {
          drawStunStars(ctx, gx, topY - 18, 22 * gScale, this.clock);
          ctx.fillStyle = '#ffea00';
          ctx.font = '800 12px system-ui, sans-serif';
          ctx.fillText('★ STUNNED ★', gx, topY - 30);
        } else if (g.state === 'windup') {
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
    if (engine.pathDashTimer > 0) {
      drawDashStreaks(ctx, px, 560, 1.2);
    }
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

    // Normalized Player HUD (identical layout & animations across Road and Boss Combat!)
    this.renderNormalizedPlayerHud(engine, 'path');

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
    ctx.fillStyle = engine.arcadeMode ? '#80deea' : '#ffd54f';
    ctx.font = '800 13px system-ui, sans-serif';
    const modeTag = engine.arcadeMode ? 'MINIGAME PORTAL (JUST FOR FUN)' : 'ROADSIDE MINIGAME';
    ctx.fillText(`${modeTag}  •  TIME: ${Math.max(0, mg.maxTimer - mg.timer).toFixed(1)}s`, cx, cy - 104);

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
    } else if (mg.kind === 'boulder_dodge' || mg.kind === 'coin_catch' || mg.kind === 'arrow_volley') {
      const laneW = 110;
      const startX = cx - laneW * 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === mg.playerLane ? 'rgba(105, 240, 174, 0.22)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(startX + i * laneW + 4, cy - 28, laneW - 8, 128);
      }
      ctx.fillStyle = mg.kind === 'arrow_volley' ? '#80deea' : '#69f0ae';
      ctx.fillRect(startX + mg.playerLane * laneW + laneW / 2 - 16, cy + 72, 32, 22);
      ctx.fillStyle =
        mg.kind === 'coin_catch' ? '#ffd740' : mg.kind === 'arrow_volley' ? '#e0f7fa' : '#ff9100';
      for (const b of mg.lanes) {
        if (b.y < 0) continue;
        const bx = startX + b.lane * laneW + laneW / 2;
        const by = cy - 20 + b.y * 105;
        if (mg.kind === 'arrow_volley') {
          ctx.fillRect(bx - 3, by - 14, 6, 22);
          ctx.beginPath();
          ctx.moveTo(bx, by + 14);
          ctx.lineTo(bx - 8, by + 4);
          ctx.lineTo(bx + 8, by + 4);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(bx, by, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (mg.kind === 'coin_catch' || mg.kind === 'arrow_volley') {
        ctx.fillStyle = mg.kind === 'arrow_volley' ? '#80deea' : '#ffd740';
        ctx.font = '700 14px system-ui, sans-serif';
        ctx.fillText(
          `${mg.kind === 'arrow_volley' ? 'Blocked' : 'Caught'}: ${mg.score} / ${mg.targetScore}`,
          cx,
          cy + 116
        );
      }
    } else if (mg.kind === 'combo_drill') {
      const seq = mg.comboSeq ?? ['K', 'K', 'J'];
      const step = mg.comboStep ?? 0;
      const boxW = 68;
      const gap = 18;
      const totalW = seq.length * boxW + (seq.length - 1) * gap;
      const sx = cx - totalW / 2;
      for (let i = 0; i < seq.length; i++) {
        const bx = sx + i * (boxW + gap);
        ctx.fillStyle =
          i < step ? 'rgba(105, 240, 174, 0.32)' : i === step ? 'rgba(255, 215, 64, 0.25)' : 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.roundRect(bx, cy - 16, boxW, 56, 10);
        ctx.fill();
        ctx.strokeStyle = i < step ? '#69f0ae' : i === step ? '#ffd740' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = i === step ? 3 : 1.5;
        ctx.stroke();
        ctx.fillStyle = i < step ? '#69f0ae' : i === step ? '#ffd740' : '#ffffff';
        ctx.font = '900 30px system-ui, sans-serif';
        ctx.fillText(seq[i], bx + boxW / 2, cy + 22);
      }
      ctx.fillStyle = '#69f0ae';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Combos: ${mg.score} / ${mg.targetScore}`, cx, cy + 78);
    } else if (mg.kind === 'forge_bellows') {
      const barW = 420;
      const bx = cx - barW / 2;
      ctx.fillStyle = '#263238';
      ctx.fillRect(bx, cy - 8, barW, 28);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.65)';
      ctx.fillRect(bx + barW * 0.48, cy - 8, barW * 0.3, 28);
      const curX = bx + mg.cursor * barW;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(curX - 5, cy - 16, 10, 44);
      ctx.fillStyle = '#ffab40';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Heat Held: ${(mg.score / 10).toFixed(1)}s / ${(mg.targetScore / 10).toFixed(1)}s`, cx, cy + 58);
    } else if (mg.kind === 'dash_hurdles') {
      const barW = 420;
      const bx = cx - barW / 2;
      ctx.fillStyle = '#1b2630';
      ctx.fillRect(bx, cy - 6, barW, 26);
      // Cyan strike zone on right side
      ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.fillRect(bx + barW * 0.72, cy - 6, barW * 0.24, 26);
      // Approaching hurdle marker
      const hx = bx + Math.min(1, mg.cursor) * barW;
      ctx.fillStyle = '#ff9100';
      ctx.fillRect(hx - 6, cy - 16, 12, 46);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(`Cleared: ${mg.score} / ${mg.targetScore}   (Press H or L)`, cx, cy + 58);
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
    if (engine.isRaidFight) {
      // Abyssal Raid Rift Atmosphere & Pulsing Runic Boss Sigil Circle
      ctx.save();
      ctx.fillStyle = 'rgba(42, 8, 66, 0.24)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.strokeStyle = engine.boss.instance.template.palette.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.55 + Math.sin(this.clock * 5) * 0.2;
      ctx.beginPath();
      ctx.ellipse(bProj.sx, bProj.sy + 8 * bProj.scale, 138 * bProj.scale, 42 * bProj.scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
        draw: () => {
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
              isRaidBoss: Boolean(engine.boss.instance.isRaidBoss),
            }
          );
          if (engine.boss.state === 'staggered') {
            drawStunStars(ctx, bProj.sx, bProj.sy - 138 * bProj.scale, 34 * bProj.scale, this.clock);
          }
        },
      },
      {
        y: engine.playerBody.pos.y,
        draw: () => {
          if (engine.player.state === 'dash') {
            drawDashStreaks(ctx, pProj.sx, pProj.sy - 32 * pProj.scale, pProj.scale);
          }
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
            if (m.stunned && m.state === 'hurt') {
              drawStunStars(ctx, mProj.sx, ty - 14, 18 * mProj.scale, this.clock);
            } else if (m.state === 'windup') {
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

    // Glowing Sword-Color Tapered Slash Arcs in the Arena!
    for (const sl of engine.effects.slashes) {
      const proj = this.projectArena(sl.x, sl.y);
      const t = sl.life / Math.max(0.01, sl.maxLife);
      const r = sl.radius * proj.scale;
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 1.35);
      ctx.lineCap = 'round';
      // Outer color-glow arc
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = sl.width * proj.scale * t;
      ctx.beginPath();
      ctx.arc(proj.sx, proj.sy - sl.z * proj.scale, r, sl.startAngle, sl.endAngle, sl.endAngle < sl.startAngle);
      ctx.stroke();
      // Bright white razor core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, sl.width * 0.35 * proj.scale * t);
      ctx.beginPath();
      ctx.arc(proj.sx, proj.sy - sl.z * proj.scale, r, sl.startAngle, sl.endAngle, sl.endAngle < sl.startAngle);
      ctx.stroke();
      ctx.restore();
    }

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
    ctx.fillStyle = engine.isRaidFight ? 'rgba(24, 10, 38, 0.92)' : 'rgba(14, 16, 24, 0.88)';
    ctx.beginPath();
    ctx.roundRect(barX - 18, 14, barW + 36, 78, 10);
    ctx.fill();
    ctx.strokeStyle = engine.isRaidFight ? '#e040fb' : '#ffd54f';
    ctx.lineWidth = engine.isRaidFight ? 2.6 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 17px Georgia, serif';
    ctx.textAlign = 'left';
    const traitStr = b.instance.traits.map((t) => t.name).join(' • ');
    const raidPrefix = engine.isRaidFight ? '★ RAID  ' : '';
    ctx.fillText(
      `${raidPrefix}Lv.${b.instance.template.tier * 15}  ${b.instance.template.name}, ${b.instance.template.title}`,
      barX,
      36
    );

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

    if (p.lastComboBanner) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.lastComboBanner.timer * 1.5);
      ctx.fillStyle = p.lastComboBanner.color;
      ctx.font = '900 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 5;
      ctx.strokeText(`✦ ${p.lastComboBanner.name.toUpperCase()} ✦`, this.width * 0.5, this.height - 134);
      ctx.fillText(`✦ ${p.lastComboBanner.name.toUpperCase()} ✦`, this.width * 0.5, this.height - 134);
      ctx.restore();
    }

    ctx.restore();

    // Normalized Player HUD (identical layout & animations across Road and Boss Combat!)
    this.renderNormalizedPlayerHud(engine, 'combat');
  }

  private renderNormalizedPlayerHud(engine: GameEngine, mode: 'path' | 'combat'): void {
    const ctx = this.ctx;
    const p = engine.player;
    const fx = engine.effects;

    ctx.save();

    // ---- BOTTOM LEFT: NORMALIZED VITALITY, ANIMATED HP BAR & STAMINA PLATE ----
    const plateW = 340;
    const plateH = 98;
    const baseLeftX = 20;
    const baseY = this.height - plateH - 16;

    const shakeX = fx.hpShake > 0 ? Math.round((Math.random() - 0.5) * 10 * fx.hpShake) : 0;
    const shakeY = fx.hpShake > 0 ? Math.round((Math.random() - 0.5) * 6 * fx.hpShake) : 0;
    const lx = baseLeftX + shakeX;
    const ly = baseY + shakeY;

    ctx.fillStyle = 'rgba(14, 16, 24, 0.9)';
    ctx.beginPath();
    ctx.roundRect(lx, ly, plateW, plateH, 10);
    ctx.fill();

    // Dynamic border glow on heal (emerald) or damage (crimson)
    if (fx.hpDamageFlash > 0.05) {
      ctx.fillStyle = `rgba(255, 23, 68, ${fx.hpDamageFlash * 0.24})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 82, 82, ${0.55 + fx.hpDamageFlash * 0.45})`;
      ctx.lineWidth = 2.4;
    } else if (fx.hpHealGlow > 0.05) {
      ctx.fillStyle = `rgba(105, 240, 174, ${fx.hpHealGlow * 0.2})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(105, 240, 174, ${0.55 + fx.hpHealGlow * 0.45})`;
      ctx.lineWidth = 2.4;
    } else {
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.55)';
      ctx.lineWidth = 1.6;
    }
    ctx.stroke();

    // Hearts row
    const maxHeartsToDraw = Math.min(10, Math.ceil(p.maxHp / 25));
    const hpPerHeart = p.maxHp / maxHeartsToDraw;
    const heartPulse = fx.hpHealGlow > 0 ? 1 + Math.sin(fx.hpHealGlow * Math.PI) * 0.16 : 1;
    for (let i = 0; i < maxHeartsToDraw; i++) {
      const hx = lx + 18 + i * 22;
      const hy = ly + 19;
      const heartHp = Math.max(0, Math.min(hpPerHeart, p.hp - i * hpPerHeart));
      drawHeart(ctx, hx, hy, 7.6 * heartPulse, heartHp / hpPerHeart);
    }

    // Numeric HP + Grit Shield
    ctx.fillStyle = fx.hpDamageFlash > 0.2 ? '#ff8a80' : fx.hpHealGlow > 0.2 ? '#69f0ae' : '#f1f5f9';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const gritStr = p.gritShield > 0 ? ` (+${p.gritShield})` : '';
    ctx.fillText(`${p.hp}/${p.maxHp}${gritStr}`, lx + plateW - 12, ly + 23);

    // Smooth Animated HP Bar with trailing damage / heal surge ghost!
    const hpBarX = lx + 12;
    const hpBarY = ly + 33;
    const hpBarW = plateW - 24;
    const hpBarH = 12;
    const actualHpRatio = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
    const dispHpRatio = Math.max(0, Math.min(1, this.displayHp / Math.max(1, p.maxHp)));

    ctx.fillStyle = '#25151a';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    if (dispHpRatio > actualHpRatio) {
      // Trailing white/amber damage drain bar
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * dispHpRatio, hpBarH);
      ctx.fillStyle = actualHpRatio > 0.3 ? '#ef5350' : '#ff1744';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * actualHpRatio, hpBarH);
    } else if (actualHpRatio > dispHpRatio) {
      // Surging emerald heal bar
      ctx.fillStyle = '#69f0ae';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * actualHpRatio, hpBarH);
      ctx.fillStyle = '#ef5350';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * dispHpRatio, hpBarH);
    } else {
      ctx.fillStyle = actualHpRatio > 0.3 ? '#ef5350' : '#ff1744';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * actualHpRatio, hpBarH);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // Stamina Bar
    const stamY = ly + 53;
    ctx.fillStyle = '#16261f';
    ctx.fillRect(hpBarX, stamY, hpBarW, 10);
    ctx.fillStyle = p.stamina < 20 ? '#ffab40' : '#69f0ae';
    ctx.fillRect(hpBarX, stamY, hpBarW * Math.max(0, Math.min(1, p.stamina / Math.max(1, p.maxStamina))), 10);

    // Bottom status line (Stamina + Quick/Heavy cooldown or Counter)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VITALITY & STAMINA', hpBarX, ly + 82);

    const qCd = mode === 'combat' ? p.quickAttackCooldown : engine.pathAttackCooldown;
    const hCd = mode === 'combat' ? p.heavyAttackCooldown : engine.pathHeavyCooldown;
    const dCd = mode === 'combat' ? p.dashCooldown : engine.pathDashCooldown;
    ctx.textAlign = 'right';
    if (mode === 'combat' && p.counterWindowTimer > 0) {
      ctx.fillStyle = '#ffd740';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.fillText('COUNTER READY! (J / K)', lx + plateW - 12, ly + 82);
    } else {
      ctx.fillStyle = dCd > 0 || hCd > 0 ? '#ffab91' : '#69f0ae';
      ctx.font = '700 10px system-ui, sans-serif';
      const kStr = qCd > 0 ? `K:${qCd.toFixed(1)}s` : 'K:RDY';
      const jStr = hCd > 0 ? `J:${hCd.toFixed(1)}s` : 'J:RDY';
      const dashStr = dCd > 0 ? `H:${dCd.toFixed(1)}s` : 'H:RDY';
      ctx.fillText(`${kStr} • ${jStr} • ${dashStr}`, lx + plateW - 12, ly + 82);
    }

    // Active Run-Only Buff Badges above Bottom-Left Plate (identical in Road & Combat!)
    if (engine.activeRunBuffs.length > 0) {
      let bx = baseLeftX;
      const by = baseY - 26;
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

    // ---- BOTTOM RIGHT: NORMALIZED GOLD, XP & ACTION/COMBO PLATE ----
    const rx = this.width - plateW - 20;
    const ry = baseY;
    ctx.fillStyle = 'rgba(14, 16, 24, 0.9)';
    ctx.beginPath();
    ctx.roundRect(rx, ry, plateW, plateH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(123, 227, 255, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Animated Gold Pill (left half of top row)
    const pillW = 152;
    const pillH = 34;
    const goldScale = 1 + Math.sin(fx.goldPulse * Math.PI) * 0.1;
    ctx.save();
    ctx.translate(rx + 12 + pillW / 2, ry + 10 + pillH / 2);
    ctx.scale(goldScale, goldScale);
    ctx.fillStyle = fx.goldPulse > 0.05 ? `rgba(255, 215, 64, ${0.14 + fx.goldPulse * 0.24})` : 'rgba(255, 215, 64, 0.1)';
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = fx.goldPulse > 0.05 ? '#ffea00' : 'rgba(255, 213, 79, 0.45)';
    ctx.lineWidth = fx.goldPulse > 0.05 ? 2 : 1.2;
    ctx.stroke();

    // Pixel gold coin icon
    ctx.fillStyle = '#ffd740';
    ctx.beginPath();
    ctx.arc(-pillW / 2 + 17, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(-pillW / 2 + 14, -4, 3, 4);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd54f';
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.fillText(`${Math.round(this.displayGold)}g`, -pillW / 2 + 31, 5);
    if (fx.recentGoldTimer > 0 && fx.recentGoldDelta > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff59d';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.fillText(`+${fx.recentGoldDelta}`, pillW / 2 - 8, 4);
    }
    ctx.restore();

    // Animated Level & XP Progress Pill (right half of top row)
    const xpNeeded = getXpForNextLevel(engine.progress.level);
    const xpScale = 1 + Math.sin(Math.min(1, fx.xpPulse) * Math.PI) * 0.1;
    ctx.save();
    ctx.translate(rx + plateW - 12 - pillW / 2, ry + 10 + pillH / 2);
    ctx.scale(xpScale, xpScale);
    ctx.fillStyle = fx.xpPulse > 0.05 ? `rgba(123, 227, 255, ${0.14 + Math.min(1, fx.xpPulse) * 0.24})` : 'rgba(123, 227, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(-pillW / 2, -pillH / 2, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = fx.xpPulse > 0.05 ? '#80ffff' : 'rgba(123, 227, 255, 0.45)';
    ctx.lineWidth = fx.xpPulse > 0.05 ? 2 : 1.2;
    ctx.stroke();

    // XP diamond/star icon
    ctx.fillStyle = '#7be3ff';
    ctx.beginPath();
    ctx.moveTo(-pillW / 2 + 14, -9);
    ctx.lineTo(-pillW / 2 + 20, -3);
    ctx.lineTo(-pillW / 2 + 14, 3);
    ctx.lineTo(-pillW / 2 + 8, -3);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#7be3ff';
    ctx.font = '800 12px system-ui, sans-serif';
    const spBadge = engine.progress.skillPoints > 0 ? ` ★${engine.progress.skillPoints}` : '';
    ctx.fillText(`Lv.${engine.progress.level}${spBadge}`, -pillW / 2 + 25, 1);

    ctx.textAlign = 'right';
    if (fx.recentXpTimer > 0 && fx.recentXpDelta > 0) {
      ctx.fillStyle = '#e0f7fa';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.fillText(`+${fx.recentXpDelta}`, pillW / 2 - 7, 1);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.fillText(`${engine.progress.xp}/${xpNeeded}`, pillW / 2 - 7, 1);
    }

    // Mini XP progress bar along bottom of pill (smoothly animated!)
    const xpBarX = -pillW / 2 + 8;
    const xpBarY = 7;
    const xpBarW = pillW - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(xpBarX, xpBarY, xpBarW, 5);
    ctx.fillStyle = fx.xpPulse > 0.15 ? '#b3f3ff' : '#7be3ff';
    ctx.fillRect(xpBarX, xpBarY, xpBarW * Math.max(0, Math.min(1, this.displayXpRatio)), 5);
    ctx.restore();

    // Lower contextual info inside Bottom-Right Plate
    ctx.textAlign = 'left';
    if (mode === 'combat') {
      ctx.fillStyle = '#ffd54f';
      ctx.font = '700 11px system-ui, sans-serif';
      const bufStr = p.inputBuffer.length > 0 ? p.inputBuffer.join(' → ') : 'Ready';
      ctx.fillText(`COMBO: ${bufStr}`, rx + 14, ry + 64);

      if (p.comboHints.length > 0) {
        const hint = p.comboHints[0];
        ctx.fillStyle = hint.accentColor;
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(`Next: ${hint.name} (${hint.sequence.join('→')})`, rx + 14, ry + 83);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText('WASD Move • K/J Attack • H Dash Stun • L Parry', rx + 14, ry + 83);
      }
    } else {
      const remG = engine.roadGuardians.filter((g) => g.state !== 'dead').length;
      const doneM = engine.roadMinigames.filter((m) => m.completed).length;
      const totalM = engine.roadMinigames.length;
      ctx.fillStyle = remG === 0 && doneM === totalM ? '#69f0ae' : '#ffd54f';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.fillText(
        remG === 0 && doneM === totalM
          ? 'ROAD CLEAR! Hold W or SPACE for Boss Gate'
          : `GUARDIANS: ${remG} LEFT  •  MINIGAMES: ${doneM}/${totalM}`,
        rx + 14,
        ry + 64
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText('WASD Move • K/J Attack • H Dash Stun • L Parry', rx + 14, ry + 83);
    }

    ctx.restore();
  }

  private renderHudAnimations(engine: GameEngine): void {
    const ctx = this.ctx;
    const fx = engine.effects;
    ctx.save();

    // Flying Gold Coins, XP Orbs, and Heal Sparkles arcing into HUD counters
    for (const f of fx.hudFlyers) {
      const t = 1 - f.life / f.maxLife;
      const ease = 1 - Math.pow(1 - t, 2.2);
      const x = f.startX + (f.targetX - f.startX) * ease;
      const y = f.startY + (f.targetY - f.startY) * ease - Math.sin(t * Math.PI) * f.arcHeight;
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.5);
      if (f.kind === 'gold') {
        ctx.fillStyle = '#ffd740';
        ctx.beginPath();
        ctx.arc(x, y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 2, y - 3, 2, 2);
      } else if (f.kind === 'xp') {
        ctx.fillStyle = '#7be3ff';
        ctx.beginPath();
        ctx.moveTo(x, y - f.size);
        ctx.lineTo(x + f.size, y);
        ctx.lineTo(x, y + f.size);
        ctx.lineTo(x - f.size, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#69f0ae';
        ctx.fillRect(x - 2, y - f.size, 4, f.size * 2);
        ctx.fillRect(x - f.size, y - 2, f.size * 2, 4);
      }
    }

    // Floating Screen-Space HUD Popups (+Gold, +XP, +HP, -HP)
    for (const pop of fx.hudPopups) {
      const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.6);
      const popScale = pop.scale * (1 + (1 - pop.life / pop.maxLife) * 0.12);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${Math.round(18 * popScale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
    }

    // Celebratory LEVEL UP! Banner Animation
    if (fx.levelUpBanner) {
      const b = fx.levelUpBanner;
      const elapsed = b.maxTimer - b.timer;
      const enterT = Math.min(1, elapsed / 0.25);
      const exitT = Math.min(1, b.timer / 0.4);
      const alpha = Math.min(enterT, exitT);
      const scale = 0.85 + Math.sin(enterT * Math.PI * 0.5) * 0.15;
      const yPos = 195 - elapsed * 12;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.width * 0.5, yPos);
      ctx.scale(scale, scale);

      ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
      ctx.beginPath();
      ctx.roundRect(-210, -34, 420, 68, 14);
      ctx.fill();
      ctx.strokeStyle = '#ffd740';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd740';
      ctx.font = '900 24px Georgia, serif';
      ctx.fillText(`✦ LEVEL UP!  Lv.${b.level} ✦`, 0, -2);

      ctx.fillStyle = '#69f0ae';
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText('+1 UPGRADE POINT EARNED (SPEND AT SANCTUARY)', 0, 20);
      ctx.restore();
    }

    // Celebratory TREASURE CHEST LOOT Banner Animation
    if (fx.lootBanner) {
      const b = fx.lootBanner;
      const elapsed = b.maxTimer - b.timer;
      const enterT = Math.min(1, elapsed / 0.25);
      const exitT = Math.min(1, b.timer / 0.45);
      const alpha = Math.min(enterT, exitT);
      const scale = 0.88 + Math.sin(enterT * Math.PI * 0.5) * 0.12;
      const yPos = fx.levelUpBanner ? 275 : 205;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.width * 0.5, yPos);
      ctx.scale(scale, scale);

      ctx.fillStyle = 'rgba(12, 16, 26, 0.94)';
      ctx.beginPath();
      ctx.roundRect(-270, -34, 540, 68, 14);
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = b.color;
      ctx.font = '900 18px Georgia, serif';
      ctx.fillText(b.title, 0, -4);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(b.subtitle, 0, 19);
      ctx.restore();
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

function drawStunStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, time: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 234, 0, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius, radius * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const ang = time * 6.2 + (i * Math.PI) / 2;
    const sx = cx + Math.cos(ang) * radius;
    const sy = cy + Math.sin(ang) * radius * 0.34;
    ctx.fillStyle = i % 2 === 0 ? '#ffea00' : '#00e5ff';
    ctx.fillRect(sx - 4, sy - 1.5, 8, 3);
    ctx.fillRect(sx - 1.5, sy - 4, 3, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 1, sy - 1, 2, 2);
  }
  ctx.restore();
}

function drawDashStreaks(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.78)';
  ctx.lineWidth = 2.5 * scale;
  for (let i = -2; i <= 2; i++) {
    const ox = i * 11 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + ox, cy - 18 * scale);
    ctx.lineTo(cx + ox * 1.15, cy + 38 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTreasureChestSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  unlocked: boolean,
  opened: boolean,
  time: number
): void {
  ctx.save();
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * scale, 26 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golden beacon halo when unlocked & ready to open
  if (unlocked && !opened) {
    const pulse = 0.55 + Math.sin(time * 7) * 0.25;
    ctx.strokeStyle = `rgba(255, 215, 64, ${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y - 16 * scale, (26 + Math.sin(time * 6) * 3) * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.translate(Math.round(x), Math.round(y - 12 * scale));
  ctx.scale(scale, scale);

  // Chest body (heavy oak & gold bands)
  ctx.fillStyle = '#1b120c';
  ctx.fillRect(-20, -16, 40, 28);
  ctx.fillStyle = '#6d4323';
  ctx.fillRect(-18, -14, 36, 24);
  ctx.fillStyle = '#8d572e';
  ctx.fillRect(-16, -6, 32, 14);

  // Gold ironwork straps
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(-18, -14, 5, 24);
  ctx.fillRect(13, -14, 5, 24);
  ctx.fillRect(-18, -3, 36, 4);

  if (opened) {
    // Lid swung open + glowing treasure pile inside!
    ctx.fillStyle = '#4e2f18';
    ctx.fillRect(-18, -26, 36, 12);
    ctx.fillStyle = '#ffd740';
    ctx.fillRect(-14, -12, 28, 8);
    ctx.fillStyle = '#fff59d';
    ctx.fillRect(-8, -16, 16, 6);
  } else {
    // Closed lid + center clasp (red seal if guarded, glowing gold if unlocked)
    ctx.fillStyle = unlocked ? '#ffea00' : '#ff5252';
    ctx.fillRect(-4, -5, 8, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -3, 4, 3);
  }

  ctx.restore();

  // Floating status label above chest
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `800 ${Math.max(10, Math.round(11 * scale))}px system-ui, sans-serif`;
  if (!unlocked) {
    ctx.fillStyle = '#ff8a80';
    ctx.fillText('🔒 WARDEN CHEST', x, y - 38 * scale);
  } else if (!opened) {
    ctx.fillStyle = '#ffea00';
    ctx.fillText('★ OPEN CHEST! ★', x, y - 40 * scale + Math.sin(time * 8) * 3);
  }
  ctx.restore();
}

function drawRaidPortalSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  time: number,
  declined: boolean
): void {
  ctx.save();
  ctx.globalAlpha = declined ? 0.45 : 1;
  // Ground shadow
  ctx.fillStyle = 'rgba(18, 0, 36, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * scale, 32 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const cy = y - 34 * scale;
  const r = (24 + Math.sin(time * 6) * 2.5) * scale;

  // Swirling outer violet rift ring
  ctx.fillStyle = 'rgba(213, 0, 249, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, cy, r * 1.15, r * 1.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e040fb';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.ellipse(x, cy, r, r * 1.3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Dark abyssal vortex core
  ctx.fillStyle = '#120520';
  ctx.beginPath();
  ctx.ellipse(x, cy, r * 0.68, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();

  // Orbiting runic sparks
  for (let i = 0; i < 4; i++) {
    const a = time * 4.8 + (i * Math.PI) / 2;
    const sx = x + Math.cos(a) * r * 0.95;
    const sy = cy + Math.sin(a) * r * 1.25;
    ctx.fillStyle = i % 2 === 0 ? '#ffd740' : '#00e5ff';
    ctx.fillRect(sx - 3 * scale, sy - 3 * scale, 6 * scale, 6 * scale);
  }

  ctx.textAlign = 'center';
  ctx.font = `900 ${Math.max(10, Math.round(12 * scale))}px system-ui, sans-serif`;
  ctx.fillStyle = '#ea80fc';
  ctx.fillText(declined ? 'RAID RIFT (PASSED)' : '⚡ OPTIONAL AREA RAID ⚡', x, cy - r * 1.55);
  ctx.restore();
}
