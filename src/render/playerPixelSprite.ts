import { PixelCanvas } from './pixelCanvas';
import { PLAYER_ANIM_CLIPS, type PlayerAnimEvent } from './spriteAnimator';
import type { ComboVisualStyle } from '../combos';
import type { UpgradeId } from '../game/progression';
import { getFightingStyle, type FightingStyleId } from '../game/fightingStyles';

export interface PlayerSpriteDrawParams {
  event: PlayerAnimEvent;
  frame: number;
  swingDir: number;
  counterReady: boolean;
  comboStyle?: ComboVisualStyle;
  accentColor?: string;
  dodgeDirX?: number;
  upgrades?: Record<UpgradeId, number>;
  styleId?: FightingStyleId;
  allMaxed?: boolean;
}

const playerBuf = new PixelCanvas(64, 64);

/**
 * Renders the Oathblade Swordsman as a crisp 64×64 GBA/DS Pokémon-style back-sprite
 * with 1px dark-tinted outlines, 3-tone shading, and full 14-22 frame choreography.
 */
export function renderPlayerPixelSprite(
  dest: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  scale: number,
  params: PlayerSpriteDrawParams
): void {
  const { event, frame, swingDir, counterReady, comboStyle, accentColor, dodgeDirX = 1, upgrades, styleId, allMaxed } = params;
  const styleSpec = getFightingStyle(styleId ?? 'balanced');
  const uBlade = upgrades?.blade ?? 0;
  const uVit = upgrades?.vitality ?? 0;
  const uStam = upgrades?.stamina ?? 0;
  const uParry = upgrades?.parry ?? 0;
  const uFoot = upgrades?.footwork ?? 0;
  const uPoise = upgrades?.poise ?? 0;
  const uArmor = upgrades?.armor ?? 0;
  const uCrit = upgrades?.crit ?? 0;
  const uGear = upgrades?.gear ?? 0;

  const clip = PLAYER_ANIM_CLIPS[event];
  const t = clip.frames <= 1 ? 0 : frame / (clip.frames - 1);
  const p = playerBuf;
  p.clear();

  // Palette dynamically evolves with Sanctuary Forge upgrades!
  const OUT_DARK = '#101814';
  const TUNIC_HI = uVit >= 6 ? '#ffd54f' : uVit >= 3 ? '#ef5350' : '#4caf50';
  const TUNIC_MID = uVit >= 6 ? '#1e88e5' : uVit >= 3 ? '#b71c1c' : '#2e7d32';
  const TUNIC_SH = uVit >= 6 ? '#0d47a1' : uVit >= 3 ? '#7f0000' : '#1b5e20';
  const CAPE_HI = uVit >= 6 ? '#ffe082' : uVit >= 3 ? '#ff8a80' : '#26a69a';
  const CAPE_MID = uVit >= 6 ? '#d81b60' : uVit >= 3 ? '#c62828' : '#00796b';
  const CAPE_SH = uVit >= 6 ? '#880e4f' : uVit >= 3 ? '#7f0000' : '#004d40';
  const SKIN = '#ffcc99';
  const SKIN_SH = '#d99b66';
  const HAIR = '#d4a037';
  const HAIR_SH = '#8c621c';
  const LEATHER = uFoot >= 3 ? '#d4a037' : uFoot >= 1 ? '#546e7a' : '#6d4c41';
  const LEATHER_SH = uFoot >= 3 ? '#795524' : uFoot >= 1 ? '#263238' : '#3e2723';
  const GOLD_HI = '#fff59d';
  const GOLD_MID = '#fbc02d';
  const STEEL_HI = '#ffffff';
  const STEEL_MID = uPoise >= 3 ? '#ffd54f' : '#cfd8dc';
  const STEEL_SH = uPoise >= 3 ? '#8d6e3f' : '#78909c';
  const BLADE_GLOW = accentColor ?? styleSpec.primaryColor;

  // Per-frame kinematic pose values
  let bodyX = 32;
  let bodyY = 44;
  let headYOff = 0;
  let capeWave = Math.round(Math.sin(t * Math.PI * 2) * 2);
  let leftFootY = 56;
  let rightFootY = 56;
  let swordAngle = -0.6;
  let swordX = 46;
  let swordY = 34;
  let shieldX = 17;
  let shieldY = 36;
  let shieldScale = 1;
  let drawSmear = false;
  let smearColor = STEEL_HI;
  let flashWhite = false;
  let alpha = 1;

  // Frame-by-frame choreography for every distinct event (14–22 frames each!)
  switch (event) {
    case 'idle': {
      const breath = Math.sin(t * Math.PI * 2);
      bodyY = 44 + Math.round(breath * 1.4);
      headYOff = Math.round(breath * 1.1);
      capeWave = Math.round(Math.sin(t * Math.PI * 2 + 0.8) * 2.2);
      swordAngle = -0.58 + breath * 0.08;
      shieldY = 36 + Math.round(breath);
      break;
    }

    case 'walk': {
      const stride = Math.sin(t * Math.PI * 2);
      bodyY = 44 - Math.round(Math.abs(stride) * 2.5);
      headYOff = -Math.round(Math.abs(stride) * 1.5);
      leftFootY = 56 - Math.max(0, Math.round(stride * 4));
      rightFootY = 56 - Math.max(0, Math.round(-stride * 4));
      capeWave = Math.round(Math.cos(t * Math.PI * 2) * 3.5);
      swordAngle = -0.55 + stride * 0.25;
      shieldY = 36 - Math.round(stride * 2);
      break;
    }

    case 'quick_slash': {
      // 14 frames: 0-3 windup, 4-8 lightning slash smear, 9-13 snap recovery
      if (t < 0.28) {
        const u = t / 0.28;
        bodyX = 32 + Math.round(u * 4 * swingDir);
        bodyY = 45 + Math.round(u * 2);
        swordAngle = (0.85 * u - 0.3) * swingDir;
        swordX = 46 + Math.round(u * 4);
        swordY = 36;
      } else if (t < 0.64) {
        const u = (t - 0.28) / 0.36;
        bodyX = 32 - Math.round(u * 5 * swingDir);
        bodyY = 42;
        swordAngle = (-1.9 * u + 0.45) * swingDir;
        swordX = 34 + Math.round((1 - u) * 12);
        swordY = 26;
        drawSmear = true;
        smearColor = '#e0f7fa';
      } else {
        const u = (t - 0.64) / 0.36;
        bodyX = 32 - Math.round((1 - u) * 4 * swingDir);
        bodyY = 44;
        swordAngle = -1.45 * (1 - u) * swingDir - 0.58 * u;
      }
      break;
    }

    case 'strong_cleave': {
      // 18 frames: 0-6 dramatic two-handed overhead charge, 7-11 blazing cleave, 12-17 heavy follow-through
      if (t < 0.36) {
        const u = t / 0.36;
        bodyY = 44 + Math.round(u * 3);
        headYOff = Math.round(u * 2);
        swordX = 36;
        swordY = 24 - Math.round(u * 6);
        swordAngle = -0.2 + u * 1.45;
        shieldX = 20;
        shieldY = 34;
      } else if (t < 0.64) {
        const u = (t - 0.36) / 0.28;
        bodyY = 40 + Math.round(u * 6);
        swordX = 30;
        swordY = 18 + Math.round(u * 18);
        swordAngle = 1.25 - u * 3.1;
        drawSmear = true;
        smearColor = '#ffd54f';
      } else {
        const u = (t - 0.64) / 0.36;
        bodyY = 46 - Math.round(u * 2);
        swordX = 30 + Math.round(u * 16);
        swordY = 36 - Math.round(u * 2);
        swordAngle = -1.85 * (1 - u) - 0.58 * u;
      }
      break;
    }

    case 'combo_finisher': {
      // 22 frames: dynamic multi-beat martial flourish!
      if (comboStyle === 'whirlwind') {
        const spin = t * Math.PI * 4;
        bodyX = 32 + Math.round(Math.cos(spin) * 5);
        bodyY = 42 - Math.round(Math.sin(t * Math.PI) * 6);
        swordAngle = spin - 1.5;
        swordX = 32 + Math.round(Math.cos(spin) * 14);
        swordY = 30 + Math.round(Math.sin(spin) * 8);
        drawSmear = t > 0.15 && t < 0.85;
        smearColor = BLADE_GLOW;
      } else if (comboStyle === 'lunge' || comboStyle === 'riposte') {
        const thrust = Math.sin(t * Math.PI);
        bodyY = 44 - Math.round(thrust * 8);
        swordX = 38;
        swordY = 32 - Math.round(thrust * 14);
        swordAngle = -0.05;
        drawSmear = t > 0.2 && t < 0.78;
        smearColor = BLADE_GLOW;
      } else {
        // Sunder / Breaker / Slash grand cross-arc
        const arc = Math.sin(t * Math.PI);
        bodyY = 44 - Math.round(arc * 7);
        swordX = 32 + Math.round(Math.cos(t * Math.PI * 2) * 12);
        swordY = 26 - Math.round(arc * 8);
        swordAngle = -2.2 + t * 4.4;
        drawSmear = t > 0.18 && t < 0.82;
        smearColor = BLADE_GLOW;
      }
      capeWave = Math.round(Math.sin(t * Math.PI * 4) * 5);
      break;
    }

    case 'parry_stance': {
      // 14 frames: snap buckler dead-center with golden shimmer
      const snap = Math.sin(t * Math.PI);
      shieldX = 17 + Math.round(snap * 14);
      shieldY = 36 - Math.round(snap * 9);
      shieldScale = 1 + snap * 0.35;
      bodyY = 44 + Math.round(snap * 2);
      swordX = 48;
      swordAngle = -0.9;
      break;
    }

    case 'parry_success': {
      // 18 frames: golden shockwave ring + heroic counter-ready flourish!
      const pop = Math.sin(t * Math.PI);
      shieldX = 28;
      shieldY = 27;
      shieldScale = 1.3;
      bodyY = 43 - Math.round(pop * 3);
      swordAngle = -1.2 + t * 1.1;
      flashWhite = frame % 3 === 0 && t < 0.45;
      // Golden expanding pixel ring drawn directly on sprite
      const ringR = Math.round(6 + t * 22);
      if (t < 0.8) {
        p.ellipse(28, 27, ringR, ringR, 'rgba(0,0,0,0)', GOLD_HI);
        p.sparkle(28, 27, Math.round(10 * (1 - t)), '#ffffff', GOLD_MID);
      }
      break;
    }

    case 'dodge_roll': {
      // 14 frames: nimble tucked dash with pixel afterimage trail
      const dash = Math.sin(t * Math.PI);
      bodyX = 32 + Math.round(dash * 8 * dodgeDirX);
      bodyY = 48 - Math.round(dash * 4);
      headYOff = 5;
      capeWave = -Math.round(dodgeDirX * 7);
      alpha = 0.78 + (1 - dash) * 0.22;
      // Draw ghost pixel trail behind
      p.ellipse(bodyX - dodgeDirX * 9, bodyY - 8, 8, 9, 'rgba(128,222,234,0.35)', 'rgba(128,222,234,0.6)');
      p.ellipse(bodyX - dodgeDirX * 15, bodyY - 6, 6, 7, 'rgba(128,222,234,0.18)', 'rgba(128,222,234,0.35)');
      break;
    }

    case 'hurt': {
      // 14 frames: hit-flash + recoil stagger
      const shake = Math.sin(t * Math.PI * 5) * (1 - t) * 4;
      bodyX = 32 + Math.round(shake);
      bodyY = 46 + Math.round((1 - t) * 3);
      headYOff = 3;
      flashWhite = frame % 2 === 0 && t < 0.55;
      break;
    }

    case 'victory_pose': {
      // 20 frames: celebratory sword raise & sparkle!
      const lift = Math.min(1, t * 2.2);
      bodyY = 44 - Math.round(Math.sin(t * Math.PI * 2) * 2);
      swordX = 42;
      swordY = 24 - Math.round(lift * 8);
      swordAngle = -0.15 + Math.sin(t * Math.PI * 4) * 0.1;
      if (frame % 5 < 3) {
        p.sparkle(42, 6, 4 + (frame % 3), '#ffffff', GOLD_HI);
      }
      break;
    }

    case 'death': {
      // 20 frames: dramatic kneel & collapse
      bodyY = 44 + Math.round(t * 11);
      headYOff = Math.round(t * 7);
      swordAngle = 1.3 * t;
      swordX = 46 + Math.round(t * 4);
      swordY = 36 + Math.round(t * 14);
      shieldX = 16 - Math.round(t * 4);
      shieldY = 38 + Math.round(t * 12);
      alpha = Math.max(0.25, 1 - t * 0.65);
      break;
    }
  }

  // Active Fighting Style signature visual aura on the swordsman!
  if (event !== 'death' && styleId && styleId !== 'balanced') {
    const aPulse = frame % 4;
    if (styleId === 'berserker') {
      p.sparkle(bodyX - 16, bodyY - 8 - aPulse * 3, 2, '#ffffff', '#ff5252');
      p.sparkle(bodyX + 16, bodyY - 12 - aPulse * 2, 2, '#ffab40', '#ff1744');
    } else if (styleId === 'gale') {
      p.line(bodyX - 20, bodyY - 10 + aPulse * 2, bodyX - 11, bodyY - 10 + aPulse * 2, '#69f0ae', 1);
      p.line(bodyX + 12, bodyY - 16 - aPulse * 2, bodyX + 21, bodyY - 16 - aPulse * 2, '#b9f6ca', 1);
    } else if (styleId === 'bastion') {
      p.ellipse(bodyX, bodyY - 10, 17, 17, 'rgba(0,0,0,0)', 'rgba(255, 213, 79, 0.55)');
    } else if (styleId === 'colossus') {
      p.rect(bodyX - 15 + aPulse * 2, bodyY + 4, 3, 3, '#ff9100');
      p.rect(bodyX + 12 - aPulse * 2, bodyY + 3, 3, 3, '#ffe082');
    } else if (styleId === 'phantom') {
      p.sparkle(bodyX + Math.round(Math.sin(t * Math.PI * 2) * 16), bodyY - 22, 3, '#ffffff', '#d580ff');
    }
  }

  // Counter-ready golden pixel aura
  if (counterReady && event !== 'death') {
    const pulse = 16 + (frame % 4);
    p.sparkle(bodyX - pulse, bodyY - 14, 3, '#ffffff', GOLD_HI);
    p.sparkle(bodyX + pulse, bodyY - 18, 3, '#ffffff', GOLD_HI);
  }

  // ---- BOOTS (Footwork upgrades add Steel Greaves -> Winged Golden Boots!) ----
  p.outlinedRect(bodyX - 9, leftFootY - 6, 7, 7, LEATHER, OUT_DARK, uFoot >= 1 ? '#ffffff' : '#8d6e63', LEATHER_SH);
  p.outlinedRect(bodyX + 2, rightFootY - 6, 7, 7, LEATHER, OUT_DARK, uFoot >= 1 ? '#ffffff' : '#8d6e63', LEATHER_SH);
  if (uFoot >= 3) {
    // Winged heel feathers!
    const wBob = frame % 4 < 2 ? 0 : -1;
    p.line(bodyX - 10, leftFootY - 4 + wBob, bodyX - 13, leftFootY - 6 + wBob, '#ffffff', 2);
    p.line(bodyX + 9, rightFootY - 4 + wBob, bodyX + 12, rightFootY - 6 + wBob, '#ffffff', 2);
  }

  // ---- FLOWING PIXEL CAPE (Vitality upgrades add Royal Gold Trim & Heroic Mantle!) ----
  const cMid = flashWhite ? '#ffffff' : CAPE_MID;
  const cHi = flashWhite ? '#ffffff' : CAPE_HI;
  p.poly(
    [
      [bodyX - 11, bodyY - 17],
      [bodyX + 11, bodyY - 17],
      [bodyX + 14 + capeWave, bodyY + 7],
      [bodyX + capeWave, bodyY + 10],
      [bodyX - 14 + capeWave, bodyY + 7],
    ],
    cMid,
    OUT_DARK,
    cHi
  );
  if (uVit >= 1) {
    // Golden trim along the cape hem!
    p.line(bodyX - 12 + capeWave, bodyY + 6, bodyX + 12 + capeWave, bodyY + 6, GOLD_MID, 2);
  }
  p.line(bodyX - 3, bodyY - 12, bodyX - 5 + capeWave, bodyY + 6, flashWhite ? '#ffffff' : CAPE_SH, 1);
  p.line(bodyX + 4, bodyY - 12, bodyX + 6 + capeWave, bodyY + 6, flashWhite ? '#ffffff' : CAPE_SH, 1);

  // ---- TUNIC TORSO & BELT (Tempered Plate adds gleaming steel/gold breastplate!) ----
  p.ellipse(
    bodyX,
    bodyY - 9,
    11,
    11,
    flashWhite ? '#ffffff' : TUNIC_MID,
    OUT_DARK,
    flashWhite ? '#ffffff' : TUNIC_HI,
    flashWhite ? '#e0e0e0' : TUNIC_SH,
    true
  );
  if (uArmor >= 1 && !flashWhite) {
    // Riveted steel or gilded breastplate!
    const plateFill = uArmor >= 6 ? '#ffd54f' : '#b0bec5';
    const plateSh = uArmor >= 6 ? '#8d6e3f' : '#546e7a';
    p.outlinedRect(bodyX - 8, bodyY - 17, 16, 12, plateFill, OUT_DARK, '#ffffff', plateSh);
  }
  if (uCrit >= 2 && !flashWhite) {
    // Flowing Crimson-Gold Duelist Scarf!
    p.outlinedLine(bodyX - 8, bodyY - 18, bodyX + 9, bodyY - 18, '#ff1744', OUT_DARK, 2, '#ff8a80');
    p.outlinedLine(bodyX + 7, bodyY - 17, bodyX + 14 + Math.round(capeWave * 0.7), bodyY - 8, '#ff1744', OUT_DARK, 2);
  }
  p.line(bodyX - 8, bodyY - 17, bodyX + 7, bodyY - 3, '#3e2723', 2);
  p.outlinedRect(bodyX - 10, bodyY - 4, 20, 4, '#6d4c41', OUT_DARK);
  p.rect(bodyX - 2, bodyY - 3, 4, 2, GOLD_MID);

  // ---- PAULDRONS (Poise upgrades add Spiked / Gilded Knight Plates!) ----
  const pRx = uPoise >= 3 ? 6 : 5;
  p.ellipse(bodyX - 11, bodyY - 15, pRx, 4, STEEL_MID, OUT_DARK, STEEL_HI, STEEL_SH);
  p.ellipse(bodyX + 11, bodyY - 15, pRx, 4, STEEL_MID, OUT_DARK, STEEL_HI, STEEL_SH);
  if (uPoise >= 1) {
    // Pauldron spikes
    p.poly([[bodyX - 14, bodyY - 17], [bodyX - 17, bodyY - 22], [bodyX - 10, bodyY - 18]], STEEL_HI, OUT_DARK);
    p.poly([[bodyX + 14, bodyY - 17], [bodyX + 17, bodyY - 22], [bodyX + 10, bodyY - 18]], STEEL_HI, OUT_DARK);
  }

  // ---- HEAD, HAIR & ZELDA ADVENTURER CAP (Stamina upgrades add Hero Plume & Circlet!) ----
  const hy = bodyY - 24 + headYOff;
  p.ellipse(bodyX, hy, 7, 7, flashWhite ? '#ffffff' : SKIN, OUT_DARK, '#ffe8cc', SKIN_SH);
  p.rect(bodyX - 7, hy - 1, 3, 4, HAIR);
  p.rect(bodyX + 4, hy - 1, 3, 4, HAIR_SH);
  p.poly(
    [
      [bodyX - 8, hy - 2],
      [bodyX - 4, hy - 10],
      [bodyX + 5, hy - 10],
      [bodyX + 14 + Math.round(capeWave * 0.5), hy - 4],
      [bodyX + 7, hy - 1],
    ],
    flashWhite ? '#ffffff' : TUNIC_MID,
    OUT_DARK,
    TUNIC_HI
  );
  if (uStam >= 1) {
    // Fluttering hero feather plume on cap!
    const plumeColor = uStam >= 3 ? '#ffd54f' : '#ffffff';
    p.outlinedLine(
      bodyX + 1,
      hy - 9,
      bodyX - 5 + Math.round(capeWave * 0.6),
      hy - 15 - (uStam >= 3 ? 3 : 0),
      plumeColor,
      OUT_DARK,
      2
    );
  }
  if (uStam >= 3) {
    // Golden headband / circlet trim
    p.line(bodyX - 7, hy - 3, bodyX + 6, hy - 3, GOLD_HI, 1);
  }

  // ---- LEFT ARM: STEEL BUCKLER SHIELD (Parry upgrades evolve into Ornate Golden Aegis!) ----
  const baseShieldR = uParry >= 3 ? 8 : uParry >= 1 ? 7 : 6;
  const sr = Math.round(baseShieldR * shieldScale);
  const shFill =
    event === 'parry_stance' || event === 'parry_success'
      ? GOLD_HI
      : uParry >= 3
      ? GOLD_MID
      : uParry >= 1
      ? '#eceff1'
      : STEEL_MID;
  p.ellipse(shieldX, shieldY, sr, sr, shFill, uParry >= 3 ? '#5d4037' : OUT_DARK, STEEL_HI, STEEL_SH);
  p.ellipse(
    shieldX,
    shieldY,
    Math.max(2, Math.round(sr * 0.42)),
    Math.max(2, Math.round(sr * 0.42)),
    uParry >= 3 ? '#7be3ff' : GOLD_MID,
    OUT_DARK,
    GOLD_HI
  );

  // ---- RIGHT ARM: FORGED OATHBLADE BROADSWORD (or FLAMING INFERNO OATHBLADE when ALL upgrades maxed!) ----
  const bladeBonus = allMaxed ? 12 : Math.min(8, Math.floor(uBlade * 1.2));
  const bladeLen = (event === 'combo_finisher' ? 24 : 20) + bladeBonus;
  const tipX = swordX + Math.sin(swordAngle) * bladeLen;
  const tipY = swordY - Math.cos(swordAngle) * bladeLen;

  if (drawSmear) {
    const prevAngle = swordAngle + 0.7 * swingDir;
    const prevTipX = swordX + Math.sin(prevAngle) * bladeLen;
    const prevTipY = swordY - Math.cos(prevAngle) * bladeLen;
    p.poly(
      [
        [swordX, swordY],
        [prevTipX, prevTipY],
        [(tipX + prevTipX) * 0.5 + 3, (tipY + prevTipY) * 0.5 - 3],
        [tipX, tipY],
      ],
      allMaxed ? '#ff6d00' : smearColor,
      allMaxed ? '#ff1744' : BLADE_GLOW,
      '#fff59d'
    );
  }

  // Hilt & Crossguard
  const hiltX = swordX - Math.sin(swordAngle) * 4;
  const hiltY = swordY + Math.cos(swordAngle) * 4;
  p.outlinedLine(hiltX, hiltY, swordX, swordY, allMaxed ? '#ff1744' : '#6d4c41', OUT_DARK, 2);
  if (uPoise >= 2 || allMaxed) {
    p.rect(Math.round(hiltX) - 1, Math.round(hiltY) - 1, 3, 3, allMaxed ? '#ffea00' : '#ff5252');
  }
  const guardW = allMaxed ? 8 : uBlade >= 3 ? 6 : 4;
  const gx = Math.cos(swordAngle) * guardW;
  const gy = Math.sin(swordAngle) * guardW;
  p.outlinedLine(swordX - gx, swordY - gy, swordX + gx, swordY + gy, allMaxed ? '#ffab00' : GOLD_MID, OUT_DARK, allMaxed ? 3 : 2, '#ffffff');
  if (allMaxed) {
    // Dragon-wing spiked crossguard tips + blazing solar core!
    p.rect(Math.round(swordX - gx) - 1, Math.round(swordY - gy) - 2, 3, 3, '#ff1744');
    p.rect(Math.round(swordX + gx) - 1, Math.round(swordY + gy) - 2, 3, 3, '#ff1744');
    p.rect(Math.round(swordX) - 1, Math.round(swordY) - 1, 3, 3, '#ffffff');
  }

  if (uGear >= 1 && !flashWhite) {
    // Masterwork Harness [GEAR]: Golden war-clasp & spiked battle gauntlet!
    p.outlinedRect(bodyX - 4, bodyY - 16, 8, 4, '#ffd54f', OUT_DARK, '#ffffff');
    p.outlinedRect(swordX - 3, swordY - 2, 6, 5, uGear >= 5 ? '#ffd54f' : '#90a4ae', OUT_DARK, '#ffffff');
  }

  if (allMaxed) {
    // COMPLETELY NEW FLAMING LEGENDARY INFERNO OATHBLADE!
    p.outlinedLine(swordX, swordY, tipX, tipY, '#ff6d00', '#4a0808', 6, '#fff59d');
    p.line(swordX, swordY, tipX, tipY, '#ffffff', 2);
    // Animated roaring pixel flames licking along the entire blade!
    for (let f = 1; f <= 5; f++) {
      const u = f / 5;
      const fx = swordX + Math.sin(swordAngle) * (bladeLen * u);
      const fy = swordY - Math.cos(swordAngle) * (bladeLen * u);
      const flick = Math.round(Math.sin(frame * 1.7 + f * 2.1) * 3);
      p.rect(Math.round(fx) + flick - 2, Math.round(fy) - 3 - (frame % 3), 4, 4, f % 2 === 0 ? '#ff1744' : '#ffab00');
      p.rect(Math.round(fx) - flick - 1, Math.round(fy) - 5 - ((frame + f) % 3), 2, 3, '#fff59d');
    }
    p.sparkle(tipX, tipY - 2, 4 + (frame % 2), '#ffffff', '#ff6d00');
  } else {
    // Forged Blade (tinted by active Fighting Style!)
    const bladeColor =
      event === 'combo_finisher'
        ? BLADE_GLOW
        : styleId && styleId !== 'balanced'
        ? styleSpec.primaryColor
        : uBlade >= 6
        ? '#b3e5fc'
        : uBlade >= 3
        ? '#fff59d'
        : '#cfd8dc';
    p.outlinedLine(
      swordX,
      swordY,
      tipX,
      tipY,
      bladeColor,
      OUT_DARK,
      uBlade >= 3 ? 4 : 3,
      styleSpec.secondaryColor
    );
    if ((uBlade >= 6 || (styleId && styleId !== 'balanced')) && frame % 4 === 0) {
      p.sparkle(tipX, tipY, 3, '#ffffff', styleSpec.primaryColor);
    }
  }

  // Blit crisp nearest-neighbor Pokémon sprite onto main canvas
  p.blitTo(dest, centerX, bottomY + 12 * scale, scale * 2.15, alpha);
}
