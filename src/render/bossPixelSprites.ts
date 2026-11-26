import { PixelCanvas } from './pixelCanvas';
import { BOSS_ANIM_CLIPS, type BossAnimEvent } from './spriteAnimator';
import type { BossAttackSide, BossVisualId } from '../bosses';

export interface BossSpriteDrawParams {
  visualId: BossVisualId;
  event: BossAnimEvent;
  frame: number;
  phase: 1 | 2;
  attackSide?: BossAttackSide;
  isShielding: boolean;
  flashHit: boolean;
  accentColor: string;
}

const bossBuf = new PixelCanvas(80, 80);

/**
 * Renders any of the 5 fantasy bosses as a crisp 80×80 Gen-4/Gen-5 Pokémon-style
 * pixel sprite with 1px dark-tinted outlines, dithered cel-shading, and 12-24 frame choreography.
 */
export function renderBossPixelSprite(
  dest: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  scale: number,
  params: BossSpriteDrawParams
): void {
  drawBossToPixelCanvas(bossBuf, params);
  const clip = BOSS_ANIM_CLIPS[params.event];
  const t = clip.frames <= 1 ? 0 : params.frame / (clip.frames - 1);
  const alpha = params.event === 'defeated' ? Math.max(0.05, 1 - t * 0.92) : 1;
  bossBuf.blitTo(dest, centerX, bottomY + 12 * scale, scale * 2.45, alpha);
}

/**
 * Renders a crisp static/idle data URL portrait of a boss for the Tale of the Tape UI!
 */
export function renderBossPortraitDataUrl(visualId: BossVisualId, accentColor: string): string {
  if (typeof document === 'undefined') return '';
  const buf = new PixelCanvas(80, 80);
  drawBossToPixelCanvas(buf, {
    visualId,
    event: 'idle',
    frame: 4,
    phase: 1,
    isShielding: visualId === 'ogre_knight',
    flashHit: false,
    accentColor,
  });
  return buf.canvas.toDataURL('image/png');
}

function drawBossToPixelCanvas(p: PixelCanvas, params: BossSpriteDrawParams): void {
  const { visualId, event, frame, phase, attackSide, isShielding, flashHit, accentColor } = params;
  const clip = BOSS_ANIM_CLIPS[event];
  const t = clip.frames <= 1 ? 0 : frame / (clip.frames - 1);
  p.clear();

  // Base choreography offsets driven by the exact 12–24 frame event!
  let cx = 40;
  let cy = 54;
  let weaponAngle = -0.35;
  let wingFlap = Math.round(Math.sin(t * Math.PI * 2) * 5);
  let blink = false;
  let showGlint = false;
  let showSmear = false;
  let whiteOut = flashHit;

  switch (event) {
    case 'intro': {
      // 20 frames: dramatic Pokémon drop-in + roar!
      if (t < 0.45) {
        const u = t / 0.45;
        cy = 18 + Math.round(u * u * 36);
      } else {
        const u = (t - 0.45) / 0.55;
        cy = 54 - Math.round(Math.sin(u * Math.PI) * 5);
        weaponAngle = -0.35 - Math.sin(u * Math.PI) * 0.9;
        if (u > 0.25 && u < 0.75) {
          p.sparkle(cx, cy - 30, Math.round(4 + Math.sin(u * Math.PI) * 6), '#ffffff', accentColor);
        }
      }
      break;
    }

    case 'idle': {
      // 16 frames: lively Gen-5 Pokémon idle breathing & blink
      const b = Math.sin(t * Math.PI * 2);
      cy = 54 + Math.round(b * 2);
      weaponAngle = -0.35 + b * 0.14;
      wingFlap = Math.round(b * 7);
      blink = frame === 13 || frame === 14;
      break;
    }

    case 'windup': {
      // 16 frames: expressive Punch-Out!! directional telegraph + eye glint
      if (attackSide === 'left') {
        cx = 40 + Math.round(t * 11);
        weaponAngle = -0.5 - t * 1.1;
      } else if (attackSide === 'right') {
        cx = 40 - Math.round(t * 11);
        weaponAngle = -0.2 + t * 1.1;
      } else if (attackSide === 'feint_left_to_right') {
        cx = t < 0.48 ? 40 + Math.round((t / 0.48) * 11) : 40 - Math.round(((t - 0.48) / 0.52) * 12);
        weaponAngle = t < 0.48 ? -1.2 : 0.9;
      } else if (attackSide === 'aerial') {
        cy = 54 - Math.round(t * 16);
        wingFlap = -12 + Math.round(Math.sin(t * Math.PI * 4) * 8);
      } else {
        cy = 54 - Math.round(t * 6);
        weaponAngle = -0.6 - t * 1.25;
      }
      showGlint = t > 0.52;
      break;
    }

    case 'attack': {
      // 14 frames: ferocious strike + pixel weapon smear!
      const snap = Math.sin(t * Math.PI);
      cy = 54 + Math.round(snap * 7);
      if (attackSide === 'left') cx = 40 - Math.round(snap * 10);
      else if (attackSide === 'right') cx = 40 + Math.round(snap * 10);
      weaponAngle = -1.6 + t * 3.1;
      wingFlap = 10;
      showSmear = t > 0.12 && t < 0.75;
      break;
    }

    case 'recovery': {
      // 14 frames: heavy follow-through & panting recovery
      const ease = 1 - t;
      cy = 54 + Math.round(ease * 5);
      weaponAngle = 1.2 * ease - 0.35 * t;
      break;
    }

    case 'guard': {
      // 14 frames: entrenched armored wall with metallic shine sweep
      cy = 56;
      weaponAngle = -0.2;
      break;
    }

    case 'stagger': {
      // 18 frames: woozy Punch-Out!! sway + orbiting pixel dizzy stars!
      cx = 40 + Math.round(Math.sin(t * Math.PI * 2) * 5);
      cy = 58 + Math.round(Math.abs(Math.sin(t * Math.PI * 2)) * 2);
      weaponAngle = 0.75;
      break;
    }

    case 'phase_shift': {
      // 24 frames: epic Pokémon boss evolution/power-up aura burst!
      const pulse = Math.sin(t * Math.PI * 6);
      cx = 40 + Math.round(pulse * 3);
      cy = 52 - Math.round(Math.sin(t * Math.PI) * 6);
      weaponAngle = -1.5;
      wingFlap = -10 + Math.round(pulse * 8);
      whiteOut = frame % 4 === 0 && t < 0.65;
      // Rising pixel aura pillars
      for (let i = -2; i <= 2; i++) {
        const px = 40 + i * 12;
        const py = 74 - Math.round(((t * 90 + Math.abs(i) * 14) % 72));
        p.rect(px - 1, py, 3, 12, i % 2 === 0 ? accentColor : '#ffffff');
      }
      break;
    }

    case 'hurt': {
      // 12 frames: crisp recoil + white hit-flash
      cx = 40 + Math.round(Math.sin(t * Math.PI * 4) * 5 * (1 - t));
      whiteOut = frame % 2 === 0 && t < 0.5;
      break;
    }

    case 'defeated': {
      // 24 frames: 3-stage Pokémon/Punch-Out dramatic KO!
      // Stage 1 (0..0.35): Violent stagger & hit-flash recoil
      // Stage 2 (0.35..0.75): Heavy collapse & golden pixel eruptions
      // Stage 3 (0.75..1.0): Dissolve into rising light motes
      if (t < 0.35) {
        const u = t / 0.35;
        cx = 40 + Math.round(Math.sin(u * Math.PI * 6) * 7);
        cy = 54 + Math.round(u * 4);
        weaponAngle = 0.6 + u * 0.8;
        whiteOut = frame % 2 === 0;
      } else if (t < 0.75) {
        const u = (t - 0.35) / 0.4;
        cx = 40 + Math.round(Math.sin(u * Math.PI * 8) * 4 * (1 - u));
        cy = 58 + Math.round(u * 14);
        weaponAngle = 1.4 + u * 0.5;
        whiteOut = frame % 3 === 0;
      } else {
        const u = (t - 0.75) / 0.25;
        cy = 72 + Math.round(u * 10);
        whiteOut = true;
      }
      for (let i = 0; i < 8; i++) {
        const a = t * 6.5 + i * 0.785;
        const rx = 40 + Math.round(Math.cos(a) * (8 + t * 28));
        const ry = 52 - Math.round(t * 36) + Math.round(Math.sin(a) * 12);
        p.sparkle(rx, ry, t > 0.65 ? 3 : 2, '#ffffff', i % 2 === 0 ? '#ffd54f' : accentColor);
      }
      break;
    }
  }

  // Phase II crackling pixel aura
  if (phase === 2 && event !== 'defeated') {
    const aOff = frame % 4;
    p.sparkle(cx - 24, cy - 16 - aOff * 3, 3, '#ffffff', accentColor);
    p.sparkle(cx + 24, cy - 22 + aOff * 2, 3, '#ffffff', accentColor);
  }

  // Render the specific Pokémon-style monster silhouette!
  if (visualId === 'troll') {
    drawBramblebackPixel(p, cx, cy, weaponAngle, blink, whiteOut, showSmear);
  } else if (visualId === 'stalker') {
    drawVexisPixel(p, cx, cy, t, weaponAngle, blink, whiteOut, showSmear);
  } else if (visualId === 'ogre_knight') {
    drawIronjawPixel(p, cx, cy, t, weaponAngle, isShielding, whiteOut, showSmear);
  } else if (visualId === 'wyvern') {
    drawSkarrathPixel(p, cx, cy, wingFlap, blink, whiteOut, showSmear);
  } else if (visualId === 'behemoth') {
    drawFrostmawPixel(p, cx, cy, t, weaponAngle, isShielding, whiteOut, showSmear);
  } else if (visualId === 'valkyrie') {
    drawNyxaraPixel(p, cx, cy, t, wingFlap, weaponAngle, whiteOut, showSmear);
  } else if (visualId === 'titan') {
    drawVaelkorPixel(p, cx, cy, t, weaponAngle, isShielding, phase, whiteOut, showSmear);
  } else if (visualId === 'colossus') {
    drawKaelthasPixel(p, cx, cy, t, weaponAngle, isShielding, whiteOut, showSmear);
  } else if (visualId === 'eternal') {
    drawAurelionPixel(p, cx, cy, t, wingFlap, weaponAngle, isShielding, phase, whiteOut, showSmear);
  } else {
    drawMalakorPixel(p, cx, cy, t, weaponAngle, phase, whiteOut, showSmear);
  }

  // Telegraph shiny glint star on windup!
  if (showGlint) {
    const r = 4 + Math.round(Math.sin(t * Math.PI * 4) * 3);
    p.sparkle(cx, cy - 36, r, '#ffffff', '#ffd54f');
  }

  // Staggered spinning pixel dizzy stars (classic Punch-Out!! × Pokémon Confusion!)
  if (event === 'stagger') {
    for (let i = 0; i < 3; i++) {
      const ang = t * Math.PI * 2 + (i * Math.PI * 2) / 3;
      const sx = cx + Math.round(Math.cos(ang) * 18);
      const sy = cy - 42 + Math.round(Math.sin(ang) * 5);
      p.sparkle(sx, sy, 3, '#fff59d', '#ff9800');
    }
  }
}

// ============================================================================
// TIER 1: BRAMBLEBACK, THE MOSSBOUND TROLL (Pokémon Woodland Titan)
// ============================================================================
function drawBramblebackPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  clubAngle: number,
  blink: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#152113';
  const SKIN = whiteOut ? '#ffffff' : '#558b2f';
  const SKIN_HI = whiteOut ? '#ffffff' : '#8bc34a';
  const SKIN_SH = whiteOut ? '#e0e0e0' : '#33691e';
  const BELLY = whiteOut ? '#ffffff' : '#c5e1a5';
  const MOSS = whiteOut ? '#ffffff' : '#aed581';
  const WOOD = whiteOut ? '#ffffff' : '#795548';
  const WOOD_SH = '#3e2723';

  // Chunky mossy legs
  p.outlinedRect(cx - 17, cy + 4, 12, 16, SKIN_SH, OUT, SKIN);
  p.outlinedRect(cx + 5, cy + 4, 12, 16, SKIN_SH, OUT, SKIN);

  // Massive hunched torso + lighter belly plate
  p.ellipse(cx, cy - 8, 22, 18, SKIN, OUT, SKIN_HI, SKIN_SH, true);
  p.ellipse(cx, cy - 4, 13, 10, BELLY, SKIN_SH, '#e6ee9c', SKIN_HI);

  // Left claw fist
  p.ellipse(cx - 23, cy - 6, 7, 7, SKIN, OUT, SKIN_HI, SKIN_SH);

  // Lush pixel moss mane & shoulder tufts
  p.ellipse(cx - 16, cy - 22, 9, 7, MOSS, OUT, '#dce775', SKIN);
  p.ellipse(cx + 15, cy - 21, 9, 7, MOSS, OUT, '#dce775', SKIN);
  p.ellipse(cx, cy - 29, 10, 6, MOSS, OUT, '#dce775', SKIN);

  // Expressive troll face, glowing amber eyes & ivory tusks
  p.ellipse(cx, cy - 20, 12, 10, SKIN_SH, OUT, SKIN, '#1b3b17');
  if (!blink) {
    p.rect(cx - 7, cy - 23, 4, 3, '#ffe066');
    p.px(cx - 5, cy - 22, '#111111');
    p.rect(cx + 3, cy - 23, 4, 3, '#ffe066');
    p.px(cx + 5, cy - 22, '#111111');
  } else {
    p.rect(cx - 7, cy - 21, 4, 1, OUT);
    p.rect(cx + 3, cy - 21, 4, 1, OUT);
  }
  // Brow & tusks
  p.line(cx - 8, cy - 25, cx - 2, cy - 23, OUT, 1);
  p.line(cx + 8, cy - 25, cx + 2, cy - 23, OUT, 1);
  p.poly([[cx - 7, cy - 13], [cx - 5, cy - 18], [cx - 3, cy - 13]], '#fffde7', OUT);
  p.poly([[cx + 3, cy - 13], [cx + 5, cy - 18], [cx + 7, cy - 13]], '#fffde7', OUT);

  // Right arm & gnarled ironwood club
  const hx = cx + 21;
  const hy = cy - 10;
  const tipX = hx + Math.sin(clubAngle) * 28;
  const tipY = hy - Math.cos(clubAngle) * 28;
  if (showSmear) {
    p.poly(
      [[hx, hy], [tipX - 10, tipY - 8], [tipX + 6, tipY + 6]],
      '#dce775',
      '#8bc34a'
    );
  }
  p.outlinedLine(hx, hy, tipX, tipY, WOOD, OUT, 6, '#a1887f');
  p.ellipse(tipX, tipY, 6, 6, WOOD_SH, OUT, WOOD);
  p.rect(tipX - 3, tipY - 3, 5, 3, MOSS);
  p.ellipse(hx, hy, 6, 6, SKIN, OUT, SKIN_HI, SKIN_SH);
}

// ============================================================================
// TIER 2: VEXIS, THE BOGFANG STALKER (Pokémon Marsh Drake-Serpent)
// ============================================================================
function drawVexisPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  clawAngle: number,
  blink: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#0d1f1c';
  const SCALE = whiteOut ? '#ffffff' : '#00897b';
  const SCALE_HI = whiteOut ? '#ffffff' : '#4db6ac';
  const SCALE_SH = whiteOut ? '#e0e0e0' : '#004d40';
  const VENOM = whiteOut ? '#ffffff' : '#76ff03';
  const CLAW = '#eceff1';

  // Whipping barbed tail curling behind
  const wag = Math.round(Math.sin(t * Math.PI * 2) * 8);
  p.outlinedLine(cx + 8, cy + 4, cx + 24, cy - 4 + wag, SCALE_SH, OUT, 5, SCALE);
  p.outlinedLine(cx + 24, cy - 4 + wag, cx + 30, cy - 16 + wag, SCALE, OUT, 3, VENOM);
  p.poly([[cx + 28, cy - 17 + wag], [cx + 34, cy - 22 + wag], [cx + 32, cy - 13 + wag]], VENOM, OUT);

  // Agile haunches
  p.ellipse(cx - 11, cy + 10, 7, 8, SCALE_SH, OUT, SCALE);
  p.ellipse(cx + 11, cy + 10, 7, 8, SCALE_SH, OUT, SCALE);

  // Sleek hunched drake torso
  p.ellipse(cx, cy - 4, 15, 16, SCALE, OUT, SCALE_HI, SCALE_SH, true);
  p.ellipse(cx, cy - 1, 8, 10, '#b2dfdb', SCALE_SH, '#e0f2f1');

  // Glowing neon-lime dorsal crest fins
  for (let i = 0; i < 4; i++) {
    p.poly(
      [[cx - 3, cy - 24 + i * 6], [cx, cy - 31 + i * 6], [cx + 3, cy - 24 + i * 6]],
      VENOM,
      OUT,
      '#ccff90'
    );
  }

  // Fierce angular reptilian head
  p.poly(
    [
      [cx - 13, cy - 21],
      [cx, cy - 35],
      [cx + 13, cy - 21],
      [cx + 8, cy - 12],
      [cx - 8, cy - 12],
    ],
    SCALE_SH,
    OUT,
    SCALE_HI
  );

  if (!blink) {
    p.rect(cx - 7, cy - 24, 5, 3, '#ffea00');
    p.px(cx - 5, cy - 23, '#b71c1c');
    p.rect(cx + 2, cy - 24, 5, 3, '#ffea00');
    p.px(cx + 4, cy - 23, '#b71c1c');
  }

  // Twin razor bone-claws with smear
  const spread = Math.round(Math.sin(clawAngle) * 7);
  if (showSmear) {
    p.line(cx - 26, cy - 18, cx - 10, cy + 12, VENOM, 4);
    p.line(cx + 26, cy - 18, cx + 10, cy + 12, VENOM, 4);
  }
  for (const side of [-1, 1]) {
    const ax = cx + side * (16 + Math.abs(spread));
    const ay = cy - 8;
    p.ellipse(ax, ay, 5, 5, SCALE, OUT, SCALE_HI);
    p.outlinedLine(ax, ay, ax + side * 10, ay + 12, CLAW, OUT, 2, '#ffffff');
    p.outlinedLine(ax - side * 2, ay + 2, ax + side * 7, ay + 15, CLAW, OUT, 2, '#ffffff');
  }
}

// ============================================================================
// TIER 3: IRONJAW, THE GILDED OGRE-KNIGHT (Pokémon Armored Paladin Boss)
// ============================================================================
function drawIronjawPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  flailAngle: number,
  isShielding: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#1c150c';
  const GOLD = whiteOut ? '#ffffff' : '#d4a037';
  const GOLD_HI = whiteOut ? '#ffffff' : '#fff59d';
  const GOLD_SH = whiteOut ? '#e0e0e0' : '#795524';
  const IRON = whiteOut ? '#ffffff' : '#607d8b';
  const IRON_HI = '#cfd8dc';

  // Armored greaves
  p.outlinedRect(cx - 16, cy + 4, 12, 16, GOLD_SH, OUT, GOLD);
  p.outlinedRect(cx + 4, cy + 4, 12, 16, GOLD_SH, OUT, GOLD);

  // Broad Gilded Cuirass
  p.outlinedRect(cx - 19, cy - 22, 38, 28, GOLD, OUT, GOLD_HI, GOLD_SH);
  p.outlinedRect(cx - 12, cy - 17, 24, 16, IRON, OUT, IRON_HI, '#37474f');

  // Horned Greathelm
  p.outlinedRect(cx - 11, cy - 38, 22, 18, GOLD_SH, OUT, GOLD);
  // Curved horns
  p.poly([[cx - 11, cy - 33], [cx - 22, cy - 44], [cx - 8, cy - 37]], GOLD_HI, OUT);
  p.poly([[cx + 11, cy - 33], [cx + 22, cy - 44], [cx + 8, cy - 37]], GOLD_HI, OUT);
  // Glowing crimson visor slit
  p.rect(cx - 7, cy - 31, 14, 3, '#ff1744');
  p.rect(cx - 4, cy - 31, 8, 1, '#ff8a80');

  // Spiked Siege Flail (Right)
  const fx = cx + 22;
  const fy = cy - 12;
  const ballX = fx + Math.sin(flailAngle) * 22;
  const ballY = fy - Math.cos(flailAngle) * 22;
  if (showSmear) {
    p.line(fx, fy, ballX, ballY, '#ffd54f', 8);
  }
  p.outlinedLine(fx, fy, ballX, ballY, IRON, OUT, 2, IRON_HI);
  p.ellipse(ballX, ballY, 7, 7, IRON, OUT, IRON_HI, '#263238');
  p.px(ballX - 8, ballY, '#ffffff');
  p.px(ballX + 8, ballY, '#ffffff');
  p.px(ballX, ballY - 8, '#ffffff');
  p.px(ballX, ballY + 8, '#ffffff');

  // Massive Gilded Tower Shield (slams dead-center with shine sweep when guarding!)
  const sx = isShielding ? cx : cx - 22;
  const sy = isShielding ? cy - 8 : cy - 6;
  p.outlinedRect(sx - 12, sy - 20, 24, 38, isShielding ? GOLD_HI : GOLD, OUT, '#ffffff', GOLD_SH);
  // Diamond crest
  p.poly([[sx, sy - 11], [sx + 6, sy - 1], [sx, sy + 9], [sx - 6, sy - 1]], '#4e342e', OUT, '#8d6e63');
  if (isShielding) {
    // Diagonal metallic rune glint sweeping down the shield!
    const sweepY = sy - 18 + Math.round(t * 32);
    p.line(sx - 10, sweepY, sx + 10, sweepY - 6, '#ffffff', 2);
  }
}

// ============================================================================
// TIER 4: SKARRATH, THE OBSIDIAN WYVERN-DRAKE (Pokémon Dragon Boss)
// ============================================================================
function drawSkarrathPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  wingFlap: number,
  blink: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#120c18';
  const BODY = whiteOut ? '#ffffff' : '#373046';
  const BODY_HI = whiteOut ? '#ffffff' : '#655a7c';
  const BODY_SH = whiteOut ? '#e0e0e0' : '#1f1a29';
  const MAGMA = whiteOut ? '#ffffff' : '#ff6d00';
  const MAGMA_HI = '#ffd54f';

  // Sweeping Articulated Obsidian Bat Wings
  for (const side of [-1, 1]) {
    p.poly(
      [
        [cx + side * 8, cy - 16],
        [cx + side * 37, cy - 34 + wingFlap],
        [cx + side * 32, cy - 4 + Math.round(wingFlap * 0.5)],
        [cx + side * 20, cy - 10 + Math.round(wingFlap * 0.3)],
        [cx + side * 10, cy - 4],
      ],
      BODY_SH,
      OUT,
      BODY_HI
    );
    // Glowing magma wing ribs
    p.line(cx + side * 10, cy - 14, cx + side * 33, cy - 28 + wingFlap, MAGMA, 1);
  }

  // Spiked Obsidian Tail
  p.outlinedLine(cx, cy + 6, cx - 22, cy + 18, BODY_SH, OUT, 4, MAGMA);

  // Scaled Wyvern Torso with glowing magma cracks
  p.ellipse(cx, cy - 6, 15, 19, BODY, OUT, BODY_HI, BODY_SH, true);
  p.line(cx, cy - 18, cx, cy + 6, MAGMA, 2);
  p.line(cx - 7, cy - 10, cx + 7, cy - 2, MAGMA_HI, 1);

  // Talons
  p.outlinedLine(cx - 9, cy + 12, cx - 13, cy + 20, BODY_HI, OUT, 2);
  p.outlinedLine(cx + 9, cy + 12, cx + 13, cy + 20, BODY_HI, OUT, 2);

  // Horned Dragon Skull
  p.poly(
    [
      [cx - 11, cy - 25],
      [cx - 17, cy - 40],
      [cx - 6, cy - 32],
      [cx, cy - 37],
      [cx + 6, cy - 32],
      [cx + 17, cy - 40],
      [cx + 11, cy - 25],
      [cx + 7, cy - 16],
      [cx - 7, cy - 16],
    ],
    BODY_SH,
    OUT,
    BODY_HI
  );

  if (!blink) {
    p.rect(cx - 7, cy - 26, 4, 3, MAGMA_HI);
    p.px(cx - 5, cy - 25, '#d50000');
    p.rect(cx + 3, cy - 26, 4, 3, MAGMA_HI);
    p.px(cx + 5, cy - 25, '#d50000');
  }

  if (showSmear) {
    p.poly([[cx - 24, cy - 6], [cx, cy + 20], [cx + 24, cy - 6]], MAGMA, MAGMA_HI);
  }
}

// ============================================================================
// TIER 5: MALAKOR, THE ASHEN SOVEREIGN (Pokémon Champion Dark-Blade Duelist)
// ============================================================================
function drawMalakorPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  swordAngle: number,
  phase: 1 | 2,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#0c070c';
  const ARMOR = whiteOut ? '#ffffff' : '#312836';
  const ARMOR_HI = whiteOut ? '#ffffff' : '#63536b';
  const ARMOR_SH = whiteOut ? '#e0e0e0' : '#1a141d';
  const CLOAK = whiteOut ? '#ffffff' : '#c62828';
  const CLOAK_HI = '#ff5252';
  const BLADE = phase === 2 ? '#ff8a80' : '#eceff1';

  // Tattered billowing crimson cloak
  const sway = Math.round(Math.sin(t * Math.PI * 2) * 4);
  p.poly(
    [
      [cx - 16, cy - 24],
      [cx + 16, cy - 24],
      [cx + 23 + sway, cy + 17],
      [cx + sway, cy + 14],
      [cx - 23 + sway, cy + 17],
    ],
    CLOAK,
    OUT,
    CLOAK_HI
  );

  // Armored boots
  p.outlinedRect(cx - 10, cy + 5, 8, 15, ARMOR_SH, OUT, ARMOR);
  p.outlinedRect(cx + 2, cy + 5, 8, 15, ARMOR_SH, OUT, ARMOR);

  // Regal dark plate cuirass & spiked pauldrons
  p.outlinedRect(cx - 14, cy - 24, 28, 30, ARMOR, OUT, ARMOR_HI, ARMOR_SH);
  p.poly([[cx - 14, cy - 23], [cx - 24, cy - 28], [cx - 15, cy - 14]], ARMOR_HI, OUT);
  p.poly([[cx + 14, cy - 23], [cx + 24, cy - 28], [cx + 15, cy - 14]], ARMOR_HI, OUT);

  // Iron Crowned Helm
  p.ellipse(cx, cy - 32, 9, 9, ARMOR_SH, OUT, ARMOR_HI);
  // 5 jagged crown spikes
  for (let i = -2; i <= 2; i++) {
    const h = i === 0 ? 11 : Math.abs(i) === 1 ? 8 : 6;
    p.poly([[cx + i * 4 - 2, cy - 39], [cx + i * 4, cy - 39 - h], [cx + i * 4 + 2, cy - 39]], '#cfd8dc', OUT);
  }
  // Burning crimson eyes
  p.rect(cx - 5, cy - 33, 3, 2, '#ff1744');
  p.rect(cx + 2, cy - 33, 3, 2, '#ff1744');

  // Masterwork Ashen Greatsword + Dramatic Pixel Smear
  const hx = cx + 18;
  const hy = cy - 14;
  const tipX = hx + Math.sin(swordAngle) * 34;
  const tipY = hy - Math.cos(swordAngle) * 34;

  if (showSmear) {
    const prevA = swordAngle - 0.85;
    p.poly(
      [
        [hx, hy],
        [hx + Math.sin(prevA) * 34, hy - Math.cos(prevA) * 34],
        [tipX, tipY],
      ],
      '#ff1744',
      '#ff8a80',
      '#ffffff'
    );
  }

  p.outlinedLine(hx - 4, hy, hx + 4, hy, '#ffd54f', OUT, 2);
  p.outlinedLine(hx, hy, tipX, tipY, BLADE, OUT, 3, '#ffffff');
}

// ============================================================================
// TIER 6: FROSTMAW, THE GLACIAL BEHEMOTH (Pokémon Ice Yeti-Titan)
// ============================================================================
function drawFrostmawPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  fistAngle: number,
  isShielding: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#0d1b2a';
  const FUR = whiteOut ? '#ffffff' : '#4fc3f7';
  const FUR_HI = '#e0f7fa';
  const FUR_SH = whiteOut ? '#e0e0e0' : '#1565c0';
  const ICE = '#b3e5fc';

  // Heavy frost legs
  p.outlinedRect(cx - 18, cy + 4, 13, 16, FUR_SH, OUT, FUR);
  p.outlinedRect(cx + 5, cy + 4, 13, 16, FUR_SH, OUT, FUR);

  // Hulking ice-armored torso + jagged icicle shoulders
  p.ellipse(cx, cy - 10, 24, 20, FUR, OUT, FUR_HI, FUR_SH, true);
  p.poly([[cx - 24, cy - 18], [cx - 32, cy - 34], [cx - 14, cy - 26]], ICE, OUT, '#ffffff');
  p.poly([[cx + 24, cy - 18], [cx + 32, cy - 34], [cx + 14, cy - 26]], ICE, OUT, '#ffffff');

  // Horned yeti skull + glowing cyan eyes
  p.ellipse(cx, cy - 26, 13, 11, FUR_SH, OUT, FUR);
  p.poly([[cx - 11, cy - 31], [cx - 20, cy - 42], [cx - 6, cy - 35]], '#e0f7fa', OUT);
  p.poly([[cx + 11, cy - 31], [cx + 20, cy - 42], [cx + 6, cy - 35]], '#e0f7fa', OUT);
  p.rect(cx - 7, cy - 28, 4, 3, '#00e5ff');
  p.rect(cx + 3, cy - 28, 4, 3, '#00e5ff');

  // Giant Glacier Gauntlet (right)
  const gx = cx + 22;
  const gy = cy - 10;
  const fx = gx + Math.sin(fistAngle) * 18;
  const fy = gy - Math.cos(fistAngle) * 18;
  if (showSmear) p.line(gx, gy, fx, fy, '#00e5ff', 9);
  p.ellipse(fx, fy, 9, 9, ICE, OUT, '#ffffff', FUR_SH);

  // Ice Wall Guard when shielding!
  if (isShielding) {
    p.outlinedRect(cx - 22, cy - 28, 44, 42, '#80deea', OUT, '#ffffff', '#0288d1');
    const sy = cy - 24 + Math.round(t * 34);
    p.line(cx - 18, sy, cx + 18, sy - 6, '#ffffff', 2);
  }
}

// ============================================================================
// TIER 7: NYXARA, THE ASTRAL VALKYRIE (Pokémon Winged Spear Master)
// ============================================================================
function drawNyxaraPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  wingFlap: number,
  lanceAngle: number,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#120a24';
  const ARMOR = whiteOut ? '#ffffff' : '#7e57c2';
  const ARMOR_HI = '#d1c4e9';
  const ARMOR_SH = whiteOut ? '#e0e0e0' : '#311b92';
  const GOLD = '#ffd54f';

  // Radiant feathered celestial wings
  for (const side of [-1, 1]) {
    p.poly(
      [
        [cx + side * 8, cy - 18],
        [cx + side * 36, cy - 36 + wingFlap],
        [cx + side * 30, cy - 10 + Math.round(wingFlap * 0.5)],
        [cx + side * 12, cy - 6],
      ],
      '#ede7f6',
      OUT,
      GOLD
    );
  }

  // Sleek valkyrie armor + golden sash
  p.outlinedRect(cx - 11, cy - 22, 22, 30, ARMOR, OUT, ARMOR_HI, ARMOR_SH);
  p.outlinedRect(cx - 8, cy + 6, 6, 14, ARMOR_SH, OUT, GOLD);
  p.outlinedRect(cx + 2, cy + 6, 6, 14, ARMOR_SH, OUT, GOLD);

  // Winged Valkyrie Helm + Halo
  p.ellipse(cx, cy - 31, 8, 8, ARMOR_SH, OUT, ARMOR_HI);
  p.ellipse(cx, cy - 42, 10, 3, 'rgba(0,0,0,0)', GOLD);
  p.rect(cx - 5, cy - 32, 10, 2, '#fff59d');

  // Starlight Halberd-Spear
  const hx = cx + 17;
  const hy = cy - 12;
  const tipX = hx + Math.sin(lanceAngle) * 34;
  const tipY = hy - Math.cos(lanceAngle) * 34;
  if (showSmear) p.line(hx, hy, tipX, tipY, '#ffd54f', 7);
  p.outlinedLine(hx, hy + 10, tipX, tipY, GOLD, OUT, 2, '#ffffff');
  p.poly([[tipX - 4, tipY + 4], [tipX, tipY - 8], [tipX + 4, tipY + 4]], '#e1bee7', OUT, '#ffffff');
  if (t > 0.5) p.sparkle(tipX, tipY - 6, 3, '#ffffff', GOLD);
}

// ============================================================================
// TIER 8: VAELKOR, THE ECLIPSE TITAN (Pokémon God-Duelist Final Boss)
// ============================================================================
function drawVaelkorPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  swordAngle: number,
  isShielding: boolean,
  phase: 1 | 2,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#08050a';
  const OBS = whiteOut ? '#ffffff' : '#261e2e';
  const OBS_HI = '#6a5b7a';
  const GOLD = '#ffab00';
  const GOLD_HI = '#fff59d';

  // Blazing Eclipse Solar Halo behind shoulders!
  const haloR = 24 + Math.round(Math.sin(t * Math.PI * 2) * 2);
  p.ellipse(cx, cy - 22, haloR, haloR, 'rgba(0,0,0,0)', phase === 2 ? '#ff1744' : GOLD);
  p.ellipse(cx, cy - 22, haloR - 3, haloR - 3, 'rgba(0,0,0,0)', GOLD_HI);

  // Colossal obsidian legs & cuirass
  p.outlinedRect(cx - 17, cy + 4, 13, 17, '#120d17', OUT, GOLD);
  p.outlinedRect(cx + 4, cy + 4, 13, 17, '#120d17', OUT, GOLD);
  p.outlinedRect(cx - 21, cy - 24, 42, 30, OBS, OUT, OBS_HI, '#120d17');
  p.outlinedRect(cx - 10, cy - 18, 20, 14, GOLD, OUT, GOLD_HI, '#bf360c');

  // Four-horned Eclipse Crowned Greathelm
  p.ellipse(cx, cy - 34, 11, 10, '#120d17', OUT, OBS_HI);
  p.poly([[cx - 10, cy - 36], [cx - 24, cy - 48], [cx - 6, cy - 41]], GOLD, OUT, GOLD_HI);
  p.poly([[cx + 10, cy - 36], [cx + 24, cy - 48], [cx + 6, cy - 41]], GOLD, OUT, GOLD_HI);
  p.rect(cx - 7, cy - 35, 14, 3, '#ff1744');

  // Gigantic Eclipse Greatsword
  const hx = cx + 23;
  const hy = cy - 14;
  const tipX = hx + Math.sin(swordAngle) * 38;
  const tipY = hy - Math.cos(swordAngle) * 38;
  if (showSmear) p.line(hx, hy, tipX, tipY, '#ffab00', 10);
  p.outlinedLine(hx - 6, hy, hx + 6, hy, GOLD_HI, OUT, 3);
  p.outlinedLine(hx, hy, tipX, tipY, phase === 2 ? '#ff5252' : GOLD, OUT, 4, '#ffffff');

  // Eclipse Aegis Shield when guarding!
  if (isShielding) {
    p.outlinedRect(cx - 18, cy - 26, 36, 42, GOLD, OUT, '#ffffff', '#bf360c');
    p.ellipse(cx, cy - 5, 8, 8, '#ff1744', OUT, '#ff8a80');
  }
}

// ============================================================================
// TIER 9: KAELTHAS, THE STORMFORGED COLOSSUS (Pokémon Thunder-Hammer Titan)
// ============================================================================
function drawKaelthasPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  hammerAngle: number,
  isShielding: boolean,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#0a141c';
  const ARMOR = whiteOut ? '#ffffff' : '#264653';
  const ARMOR_HI = '#80deea';
  const CYAN = '#00e5ff';

  p.outlinedRect(cx - 18, cy + 4, 13, 17, '#13262f', OUT, ARMOR_HI);
  p.outlinedRect(cx + 5, cy + 4, 13, 17, '#13262f', OUT, ARMOR_HI);
  p.outlinedRect(cx - 21, cy - 24, 42, 30, ARMOR, OUT, ARMOR_HI, '#13262f');
  // Crackling lightning core
  p.line(cx - 8, cy - 16, cx + 2, cy - 10, CYAN, 2);
  p.line(cx + 2, cy - 10, cx - 4, cy - 2, '#ffffff', 2);

  // Lightning-crested helm
  p.ellipse(cx, cy - 33, 10, 10, '#13262f', OUT, ARMOR_HI);
  p.poly([[cx - 9, cy - 36], [cx - 18, cy - 48], [cx - 4, cy - 40]], CYAN, OUT, '#ffffff');
  p.poly([[cx + 9, cy - 36], [cx + 18, cy - 48], [cx + 4, cy - 40]], CYAN, OUT, '#ffffff');
  p.rect(cx - 6, cy - 34, 12, 3, '#ffea00');

  // Giant Thunder Warhammer
  const hx = cx + 22;
  const hy = cy - 12;
  const tipX = hx + Math.sin(hammerAngle) * 28;
  const tipY = hy - Math.cos(hammerAngle) * 28;
  if (showSmear) p.line(hx, hy, tipX, tipY, CYAN, 10);
  p.outlinedLine(hx, hy, tipX, tipY, '#cfd8dc', OUT, 3);
  p.outlinedRect(tipX - 9, tipY - 6, 18, 12, CYAN, OUT, '#ffffff', '#0288d1');

  if (isShielding) {
    p.outlinedRect(cx - 20, cy - 26, 40, 40, CYAN, OUT, '#ffffff', '#01579b');
    p.sparkle(cx, cy - 6, 5 + Math.round(Math.sin(t * Math.PI * 4) * 2), '#ffffff', '#ffea00');
  }
}

// ============================================================================
// TIER 10: AURELION, THE ETERNAL SOVEREIGN (Pokémon Winged Twin-Blade Emperor)
// ============================================================================
function drawAurelionPixel(
  p: PixelCanvas,
  cx: number,
  cy: number,
  t: number,
  wingFlap: number,
  swordAngle: number,
  isShielding: boolean,
  phase: 1 | 2,
  whiteOut: boolean,
  showSmear: boolean
): void {
  const OUT = '#181424';
  const WHITE = whiteOut ? '#ffffff' : '#f5f5f5';
  const GOLD = '#ffd740';
  const GOLD_HI = '#fffde7';

  // Radiant golden wings
  for (const side of [-1, 1]) {
    p.poly(
      [
        [cx + side * 10, cy - 20],
        [cx + side * 38, cy - 38 + wingFlap],
        [cx + side * 32, cy - 6 + Math.round(wingFlap * 0.5)],
        [cx + side * 12, cy - 4],
      ],
      GOLD,
      OUT,
      GOLD_HI
    );
  }

  // Orbiting Sovereign Halo
  p.ellipse(cx, cy - 43, 13, 4, 'rgba(0,0,0,0)', phase === 2 ? '#00e5ff' : GOLD);

  // White-gold imperial armor
  p.outlinedRect(cx - 14, cy - 24, 28, 30, WHITE, OUT, '#ffffff', '#90a4ae');
  p.outlinedRect(cx - 10, cy + 5, 8, 15, '#546e7a', OUT, GOLD);
  p.outlinedRect(cx + 2, cy + 5, 8, 15, '#546e7a', OUT, GOLD);
  p.ellipse(cx, cy - 33, 9, 9, WHITE, OUT, '#ffffff', '#90a4ae');
  p.rect(cx - 5, cy - 34, 10, 2, '#00e5ff');

  // Twin Radiant Oathblades!
  for (const side of [-1, 1]) {
    const hx = cx + side * 18;
    const hy = cy - 12;
    const ang = side === 1 ? swordAngle : -swordAngle * 0.65;
    const tipX = hx + Math.sin(ang) * 34;
    const tipY = hy - Math.cos(ang) * 34;
    if (showSmear) p.line(hx, hy, tipX, tipY, GOLD, 8);
    p.outlinedLine(hx, hy, tipX, tipY, phase === 2 ? '#80deea' : GOLD_HI, OUT, 3, '#ffffff');
  }

  if (isShielding) {
    p.ellipse(cx, cy - 12, 24, 24, 'rgba(255, 215, 64, 0.35)', GOLD_HI);
    p.sparkle(cx, cy - 12, 6 + Math.round(Math.sin(t * Math.PI * 4) * 2), '#ffffff', GOLD);
  }
}
