import { PixelCanvas } from './pixelCanvas';
import type { RoadGuardian } from '../game/runContent';

const guardianBuf = new PixelCanvas(48, 48);

/**
 * Renders a biome-themed Pokémon-style 48×48 pixel sprite for a Road Guardian minion
 * with 12-16 frame animations per state (idle, windup, attack, hurt, dead).
 */
export function renderRoadGuardianSprite(
  dest: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  scale: number,
  g: RoadGuardian
): void {
  const p = guardianBuf;
  p.clear();

  const totalFrames = g.state === 'dead' ? 18 : g.state === 'windup' ? 14 : 12;
  const t = Math.min(1, g.animFrame / Math.max(1, totalFrames - 1));
  const whiteOut =
    (g.state === 'hurt' && g.animFrame % 2 === 0) ||
    (g.state === 'dead' && (t < 0.4 ? g.animFrame % 2 === 0 : t > 0.72));
  const alpha = g.state === 'dead' ? (t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45)) : 1;

  let cx = 24;
  let cy = 34;
  if (g.state === 'idle') {
    cy = 34 + Math.round(Math.sin(t * Math.PI * 2) * 2);
  } else if (g.state === 'windup') {
    cy = 34 - Math.round(t * 4);
    cx = 24 + Math.round(Math.sin(t * Math.PI * 6) * 2);
  } else if (g.state === 'attack') {
    cy = 38;
  } else if (g.state === 'hurt') {
    cx = 24 + Math.round(Math.sin(t * Math.PI * 4) * 3);
  } else if (g.state === 'dead') {
    // Multi-stage 18-frame death animation: shake -> crumple -> dissolve burst!
    if (t < 0.35) {
      cx = 24 + Math.round(Math.sin(t * Math.PI * 10) * 4);
      cy = 34 + Math.round(t * 6);
    } else {
      const u = (t - 0.35) / 0.65;
      cx = 24 + Math.round(Math.sin(u * Math.PI * 6) * 2 * (1 - u));
      cy = 36 + Math.round(u * 12);
    }
  }

  const OUT = '#111418';
  const look = g.look ?? 'goblin';

  // 8 Distinct Pokémon-style NPC Silhouettes (combined with biome & variant accents!)
  if (look === 'assassin') {
    // Hooded shadow rogue with glowing eyes & twin curved daggers
    const cloak = whiteOut ? '#ffffff' : '#311b47';
    p.poly([[cx - 9, cy - 16], [cx + 9, cy - 16], [cx + 12, cy + 4], [cx - 12, cy + 4]], cloak, OUT, '#7e57c2');
    p.poly([[cx - 7, cy - 16], [cx, cy - 25], [cx + 7, cy - 16]], '#1a0e29', OUT, '#512da8');
    p.rect(cx - 4, cy - 18, 3, 2, g.variantColor);
    p.rect(cx + 1, cy - 18, 3, 2, g.variantColor);
    p.outlinedLine(cx - 10, cy - 4, cx - 17, cy - 12, '#e0f7fa', OUT, 2);
    p.outlinedLine(cx + 10, cy - 4, cx + 17, cy - 12, '#e0f7fa', OUT, 2);
  } else if (look === 'golem') {
    // Chunky horned stone/ice/iron golem with glowing rune core
    const rock = whiteOut ? '#ffffff' : g.biome === 'tundra' ? '#4fc3f7' : '#546e7a';
    p.outlinedRect(cx - 12, cy - 16, 24, 20, rock, OUT, '#cfd8dc', '#263238');
    p.ellipse(cx, cy - 6, 4, 4, g.variantColor, OUT, '#ffffff');
    p.rect(cx - 6, cy - 13, 3, 2, '#ffea00');
    p.rect(cx + 3, cy - 13, 3, 2, '#ffea00');
    p.outlinedRect(cx - 17, cy - 12, 6, 12, rock, OUT, '#cfd8dc');
    p.outlinedRect(cx + 11, cy - 12, 6, 12, rock, OUT, '#cfd8dc');
  } else if (look === 'lancer') {
    // Tall crested halberd/spear warrior with plumed helm
    const mail = whiteOut ? '#ffffff' : '#455a64';
    p.outlinedRect(cx - 7, cy - 14, 14, 17, mail, OUT, '#b0bec5', '#263238');
    p.ellipse(cx, cy - 19, 6, 6, '#37474f', OUT, '#cfd8dc');
    p.line(cx, cy - 25, cx - 6, cy - 29, g.variantColor, 2);
    p.outlinedLine(cx + 9, cy + 4, cx + 15, cy - 26, '#ffd54f', OUT, 2, '#ffffff');
  } else if (look === 'drake') {
    // Winged mini-drake with flapping pixel wings & jagged tail
    const flap = Math.round(Math.sin(t * Math.PI * 2) * 5);
    const body = whiteOut ? '#ffffff' : g.biome === 'marsh' ? '#00897b' : '#373046';
    p.poly([[cx - 6, cy - 8], [cx - 20, cy - 17 + flap], [cx - 14, cy - 2]], '#1f1a29', OUT, g.variantColor);
    p.poly([[cx + 6, cy - 8], [cx + 20, cy - 17 + flap], [cx + 14, cy - 2]], '#1f1a29', OUT, g.variantColor);
    p.ellipse(cx, cy - 7, 8, 9, body, OUT, '#78909c', '#1f1a29');
    p.rect(cx - 4, cy - 10, 3, 2, '#ffea00');
    p.rect(cx + 1, cy - 10, 3, 2, '#ffea00');
  } else if (look === 'beast') {
    // Snarling fanged wolf/boar beast with dorsal spikes
    const fur = whiteOut ? '#ffffff' : g.biome === 'tundra' ? '#81d4fa' : '#6d4c41';
    p.ellipse(cx, cy - 5, 11, 8, fur, OUT, '#bcaaa4', '#3e2723', true);
    p.poly([[cx - 9, cy - 11], [cx - 12, cy - 18], [cx - 4, cy - 13]], fur, OUT);
    p.poly([[cx + 9, cy - 11], [cx + 12, cy - 18], [cx + 4, cy - 13]], fur, OUT);
    p.rect(cx - 5, cy - 8, 3, 2, '#ff1744');
    p.rect(cx + 2, cy - 8, 3, 2, '#ff1744');
    p.px(cx - 3, cy - 2, '#ffffff');
    p.px(cx + 3, cy - 2, '#ffffff');
  } else if (look === 'knight') {
    // Armored bronze/steel squire with visor slit & broadsword
    const plate = whiteOut ? '#ffffff' : '#d4a037';
    p.outlinedRect(cx - 8, cy - 14, 16, 16, plate, OUT, '#fff59d', '#795524');
    p.rect(cx - 5, cy - 10, 10, 2, '#ff1744');
    p.outlinedLine(cx + 9, cy - 6, cx + 15, cy - 18, '#eceff1', OUT, 2, '#ffffff');
  } else if (look === 'warlord') {
    // Towering horned mini-boss warlord with billowing cape & greatsword
    const cloak = whiteOut ? '#ffffff' : '#880e4f';
    p.poly([[cx - 11, cy - 16], [cx + 11, cy - 16], [cx + 15, cy + 5], [cx - 15, cy + 5]], cloak, OUT, '#ff5252');
    p.outlinedRect(cx - 9, cy - 16, 18, 17, '#261e2e', OUT, '#ffd54f', '#120d17');
    p.rect(cx - 5, cy - 12, 10, 2, '#ff1744');
    p.outlinedLine(cx + 10, cy - 6, cx + 18, cy - 24, '#ffd740', OUT, 3, '#ffffff');
  } else {
    // Goblin / Woodland Imp with pointed ears & club
    const body = whiteOut ? '#ffffff' : '#689f38';
    p.ellipse(cx, cy - 4, 9, 9, body, OUT, '#aed581', '#33691e', true);
    p.poly([[cx - 9, cy - 9], [cx - 14, cy - 15], [cx - 5, cy - 12]], body, OUT);
    p.poly([[cx + 9, cy - 9], [cx + 14, cy - 15], [cx + 5, cy - 12]], body, OUT);
    p.rect(cx - 5, cy - 7, 3, 2, '#ffe066');
    p.rect(cx + 2, cy - 7, 3, 2, '#ffe066');
    p.outlinedLine(cx + 9, cy - 4, cx + 15, cy - 14 - (g.state === 'windup' ? 4 : 0), '#795548', OUT, 3);
  }

  // Variant visual flair across all 8 martial archetypes!
  if (g.state !== 'dead') {
    if (g.variant === 'berserker') {
      p.sparkle(cx - 13, cy - 12 - (g.animFrame % 3), 2, '#ffffff', '#ff5252');
      p.sparkle(cx + 13, cy - 8 + (g.animFrame % 3), 2, '#ffffff', '#ff5252');
    } else if (g.variant === 'swift') {
      p.line(cx - 16, cy - 6, cx - 10, cy - 6, '#69f0ae', 1);
      p.line(cx + 10, cy - 10, cx + 16, cy - 10, '#69f0ae', 1);
    } else if (g.variant === 'trickster') {
      p.sparkle(cx + Math.round(Math.sin(t * Math.PI * 2) * 14), cy - 16, 2, '#ffffff', '#ce93d8');
    } else if (g.variant === 'ironclad') {
      p.outlinedRect(cx - 10, cy - 17, 20, 4, '#90caf9', OUT, '#ffffff');
    } else if (g.variant === 'executioner') {
      // Oversized magenta-edged executioner greatsword!
      p.outlinedLine(cx + 10, cy - 4, cx + 20, cy - 22, '#ff4081', OUT, 3, '#ffffff');
    } else if (g.isMiniBoss) {
      // Radiant Crown + Dual Mini-Boss Aura!
      p.poly([[cx - 8, cy - 19], [cx - 6, cy - 26], [cx - 2, cy - 21], [cx, cy - 28], [cx + 2, cy - 21], [cx + 6, cy - 26], [cx + 8, cy - 19]], '#ffea00', OUT, '#ffffff');
      p.sparkle(cx - 16, cy - 14 - (g.animFrame % 4), 3, '#ffffff', '#ffea00');
      p.sparkle(cx + 16, cy - 10 + (g.animFrame % 4), 3, '#ffffff', '#ff5252');
    }

    if (g.isShielded) {
      p.outlinedRect(cx - 13, cy - 13, 10, 15, '#ffd54f', OUT, '#ffffff', '#8d6e63');
    }
  } else {
    // 18-frame Death Animation pixel bursts & rising motes!
    for (let i = 0; i < 6; i++) {
      const a = t * 6 + i * 1.05;
      const sx = cx + Math.round(Math.cos(a) * (4 + t * 18));
      const sy = cy - 6 - Math.round(t * 22) + Math.round(Math.sin(a) * 6);
      p.sparkle(sx, sy, g.isMiniBoss ? 3 : 2, '#ffffff', i % 2 === 0 ? g.variantColor : '#ffd54f');
    }
  }

  // Telegraph glint during windup
  if (g.state === 'windup' && t > 0.5) {
    p.sparkle(cx, cy - 18, 4, '#ffffff', g.variantColor);
  }

  p.blitTo(dest, centerX, bottomY + 8 * scale, scale * 2.25 * g.scaleMul, alpha);
}
