import { PixelCanvas } from './pixelCanvas';

const petBuf = new PixelCanvas(40, 40);

/**
 * Renders the player's War-Hound companion as a crisp 40×40 Pokémon-style pixel sprite!
 * Evolves visually with Pet upgrade level:
 *   Lv 1-3: Timber Pup (warm brown/cream)
 *   Lv 4-7: Armored Dire-Hound (silver steel plates & collar)
 *   Lv 8+:  Golden War-Wolf (radiant gold crest & fiery mane)
 */
export function renderPetPixelSprite(
  dest: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  scale: number,
  petLevel: number,
  time: number,
  isAttacking: boolean
): void {
  if (petLevel <= 0) return;
  const p = petBuf;
  p.clear();

  const frame = Math.floor(time * 14) % 12;
  const bob = isAttacking ? -4 : Math.round(Math.sin((frame / 12) * Math.PI * 2) * 1.5);
  const tailWag = Math.round(Math.sin((frame / 12) * Math.PI * 4) * 3);
  const cx = 20;
  const cy = 28 + bob;

  const OUT = '#151210';
  const FUR = petLevel >= 8 ? '#ff8f00' : petLevel >= 4 ? '#607d8b' : '#8d6e63';
  const FUR_HI = petLevel >= 8 ? '#ffd54f' : petLevel >= 4 ? '#b0bec5' : '#bcaaa4';
  const FUR_SH = petLevel >= 8 ? '#bf360c' : petLevel >= 4 ? '#37474f' : '#4e342e';
  const BELLY = petLevel >= 8 ? '#fff8e1' : '#efebe9';

  // Wagging bushy tail
  p.outlinedLine(cx - 7, cy - 2, cx - 14, cy - 8 + tailWag, FUR_HI, OUT, 3);

  // Paws
  p.outlinedRect(cx - 8, cy + 2, 4, 6, FUR_SH, OUT, FUR);
  p.outlinedRect(cx + 3, cy + 2, 4, 6, FUR_SH, OUT, FUR);

  // Wolf/Hound body
  p.ellipse(cx, cy - 2, 9, 6, FUR, OUT, FUR_HI, FUR_SH, true);
  p.ellipse(cx + 1, cy, 5, 3, BELLY, FUR_SH);

  // Armored saddle for Lv 4+
  if (petLevel >= 4) {
    p.outlinedRect(cx - 5, cy - 7, 10, 5, petLevel >= 8 ? '#ffd54f' : '#cfd8dc', OUT, '#ffffff');
  }

  // Head & pointed ears
  const hx = cx + 6;
  const hy = cy - 9;
  p.ellipse(hx, hy, 6, 5, FUR, OUT, FUR_HI, FUR_SH);
  p.poly([[hx - 5, hy - 3], [hx - 6, hy - 9], [hx - 1, hy - 5]], FUR_SH, OUT, FUR_HI);
  p.poly([[hx + 1, hy - 4], [hx + 4, hy - 10], [hx + 5, hy - 3]], FUR_SH, OUT, FUR_HI);

  // Fierce eyes
  p.rect(hx + 1, hy - 2, 2, 2, petLevel >= 8 ? '#ffea00' : '#ffffff');
  p.px(hx + 2, hy - 1, '#111111');

  // Golden War-Wolf crest & aura at Lv 8+
  if (petLevel >= 8) {
    p.sparkle(cx - 12, cy - 12 - (frame % 3), 2, '#ffffff', '#ffd54f');
    p.sparkle(hx + 6, hy - 6, 2, '#ffffff', '#ff6d00');
  }

  if (isAttacking) {
    p.sparkle(hx + 7, hy, 4, '#ffffff', '#ffd54f');
  }

  p.blitTo(dest, centerX, bottomY + 6 * scale, scale * 1.9, 1);
}
