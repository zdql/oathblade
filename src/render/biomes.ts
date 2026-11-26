import type { BiomeId } from '../bosses';

interface BiomeTheme {
  skyBands: [string, string, string, string];
  farMountain: string;
  farHighlight: string;
  midSilhouette: string;
  midAccent: string;
  floorTop: string;
  floorBottom: string;
  platformFill: string;
  platformEdge: string;
  platformRim: string;
  ambientColor: string;
  celestialColor: string;
  label: string;
}

export const BIOME_THEMES: Record<BiomeId, BiomeTheme> = {
  forest: {
    skyBands: ['#1b4d6e', '#2c7696', '#56a8b0', '#a8d8a0'],
    farMountain: '#24524a',
    farHighlight: '#357363',
    midSilhouette: '#1a422b',
    midAccent: '#4caf50',
    floorTop: '#4e7c3e',
    floorBottom: '#2d4d25',
    platformFill: '#6ea152',
    platformEdge: '#2c4d24',
    platformRim: '#a5d67a',
    ambientColor: '#dce775',
    celestialColor: '#fff59d',
    label: 'Emerald Forest Trail',
  },
  marsh: {
    skyBands: ['#132430', '#1d3c47', '#35605b', '#638a6d'],
    farMountain: '#173336',
    farHighlight: '#275452',
    midSilhouette: '#112926',
    midAccent: '#76ff03',
    floorTop: '#315247',
    floorBottom: '#1a2e28',
    platformFill: '#426e5c',
    platformEdge: '#182b24',
    platformRim: '#80cbc4',
    ambientColor: '#b2ff59',
    celestialColor: '#ccff90',
    label: 'Sunken Bogfang Marsh',
  },
  ruins: {
    skyBands: ['#282040', '#4f3a61', '#8f5d6b', '#d99b66'],
    farMountain: '#362945',
    farHighlight: '#544066',
    midSilhouette: '#2b2233',
    midAccent: '#ffd54f',
    floorTop: '#75644d',
    floorBottom: '#42372a',
    platformFill: '#968265',
    platformEdge: '#3d3326',
    platformRim: '#ffe082',
    ambientColor: '#ffe082',
    celestialColor: '#ffcc80',
    label: 'Gilded Ruin Courtyard',
  },
  gorge: {
    skyBands: ['#1a0d1f', '#3d152b', '#7a2529', '#c94c26'],
    farMountain: '#29101d',
    farHighlight: '#4a1b2b',
    midSilhouette: '#1c0b12',
    midAccent: '#ff6d00',
    floorTop: '#4d3336',
    floorBottom: '#26171a',
    platformFill: '#614145',
    platformEdge: '#241417',
    platformRim: '#ff9100',
    ambientColor: '#ffab40',
    celestialColor: '#ff6e40',
    label: 'Obsidian Wyvern Gorge',
  },
  citadel: {
    skyBands: ['#0e0814', '#261024', '#52152b', '#8f1d35'],
    farMountain: '#1c0c1a',
    farHighlight: '#36162e',
    midSilhouette: '#140812',
    midAccent: '#ff1744',
    floorTop: '#3d2d38',
    floorBottom: '#1d151c',
    platformFill: '#543f4d',
    platformEdge: '#1a1118',
    platformRim: '#ff5252',
    ambientColor: '#ff5252',
    celestialColor: '#ff8a80',
    label: 'Ashen Sovereign Citadel',
  },
  tundra: {
    skyBands: ['#0f2038', '#1c3f63', '#3b739c', '#88c5e3'],
    farMountain: '#1a3854',
    farHighlight: '#80deea',
    midSilhouette: '#132a42',
    midAccent: '#b3e5fc',
    floorTop: '#6096b4',
    floorBottom: '#2d516b',
    platformFill: '#93c5e0',
    platformEdge: '#1d3c54',
    platformRim: '#e0f7fa',
    ambientColor: '#ffffff',
    celestialColor: '#e0f7fa',
    label: 'Frozen Glacial Peak',
  },
  sanctum: {
    skyBands: ['#0d0826', '#1f124d', '#3e237a', '#6d47a8'],
    farMountain: '#1c1040',
    farHighlight: '#b388ff',
    midSilhouette: '#150c33',
    midAccent: '#ffd54f',
    floorTop: '#453573',
    floorBottom: '#221840',
    platformFill: '#614da1',
    platformEdge: '#1e143b',
    platformRim: '#ffe082',
    ambientColor: '#ffe082',
    celestialColor: '#fff59d',
    label: 'Shattered Starlight Sanctum',
  },
  eclipse: {
    skyBands: ['#08040c', '#210a1a', '#591620', '#b8431c'],
    farMountain: '#170812',
    farHighlight: '#ffab00',
    midSilhouette: '#12060d',
    midAccent: '#ffab00',
    floorTop: '#3b2429',
    floorBottom: '#170d12',
    platformFill: '#523238',
    platformEdge: '#1a0c10',
    platformRim: '#ffd740',
    ambientColor: '#ffab00',
    celestialColor: '#ffd740',
    label: 'Throne of the Eternal Eclipse',
  },
  stormpeak: {
    skyBands: ['#0b1622', '#172e40', '#2b526b', '#52879e'],
    farMountain: '#142636',
    farHighlight: '#00e5ff',
    midSilhouette: '#0e1d29',
    midAccent: '#00e5ff',
    floorTop: '#334d5c',
    floorBottom: '#192933',
    platformFill: '#47697d',
    platformEdge: '#14222b',
    platformRim: '#80deea',
    ambientColor: '#00e5ff',
    celestialColor: '#b3e5fc',
    label: 'Tempest Thunderpeak',
  },
  elysium: {
    skyBands: ['#1c1836', '#3d2f63', '#8c5f78', '#f2c179'],
    farMountain: '#2e254a',
    farHighlight: '#ffe082',
    midSilhouette: '#241c3b',
    midAccent: '#ffd740',
    floorTop: '#7a6e82',
    floorBottom: '#3e3547',
    platformFill: '#a698b0',
    platformEdge: '#3b3245',
    platformRim: '#fff59d',
    ambientColor: '#fff59d',
    celestialColor: '#ffffff',
    label: 'Crown of the Golden Dawn',
  },
};

/**
 * Draws a Pokémon-style elliptical shaded terrain battle platform underneath a combatant.
 */
export function drawBattlePlatform(
  ctx: CanvasRenderingContext2D,
  biome: BiomeId,
  sx: number,
  sy: number,
  rx: number,
  ry: number
): void {
  const theme = BIOME_THEMES[biome];
  ctx.save();

  // Outer drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 7, rx + 5, ry + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Base 3D pixel rim
  ctx.fillStyle = theme.platformEdge;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top shaded turf/stone disc
  ctx.fillStyle = theme.platformFill;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 1, rx - 3, ry - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight ring
  ctx.strokeStyle = theme.platformRim;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 2, rx - 10, ry - 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a rich 16-bit/32-bit Pokémon-RPG style layered pixel backdrop for any of the 5 biomes.
 */
export function drawBiomeBackdrop(
  ctx: CanvasRenderingContext2D,
  biome: BiomeId,
  width: number,
  height: number,
  time: number,
  parallaxX = 0,
  horizonY = 260,
  stageSeed = 1
): void {
  const theme = BIOME_THEMES[biome];
  const seedShift = (stageSeed % 997) * 0.37;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 1. Crisp Stepped Pixel Sky Bands (authentic GBA/DS RPG sky)
  const bandH = Math.ceil((horizonY + 20) / theme.skyBands.length);
  for (let i = 0; i < theme.skyBands.length; i++) {
    ctx.fillStyle = theme.skyBands[i];
    ctx.fillRect(0, i * bandH, width, bandH + 2);
  }

  // 1b. Bespoke Per-Stage Sky Spectacles (Aurora, Dawn Rays, Constellations, Lightning!)
  if (biome === 'tundra') {
    // Animated Pixel Aurora Borealis Ribbons!
    for (let x = 0; x < width; x += 18) {
      const wave = Math.sin(x * 0.012 + time * 1.4 + seedShift) * 26;
      ctx.fillStyle = x % 36 === 0 ? 'rgba(105, 240, 174, 0.24)' : 'rgba(0, 229, 255, 0.2)';
      ctx.fillRect(x, Math.round(42 + wave), 16, 48);
    }
  } else if (biome === 'elysium' || biome === 'forest') {
    // Radiant Sunbeams fanning from the celestial horizon
    ctx.fillStyle = biome === 'elysium' ? 'rgba(255, 245, 157, 0.12)' : 'rgba(255, 255, 220, 0.08)';
    for (let r = 0; r < 5; r++) {
      const rx = width * (0.2 + r * 0.16) + Math.sin(seedShift + r) * 30;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 45, 0);
      ctx.lineTo(rx - 90, horizonY);
      ctx.lineTo(rx - 140, horizonY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (biome === 'sanctum') {
    // Golden Constellation Lines connecting stars + floating monoliths!
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(140, 62);
    ctx.lineTo(240, 95);
    ctx.lineTo(355, 58);
    ctx.lineTo(445, 112);
    ctx.stroke();
    for (let f = 0; f < 4; f++) {
      const fx = Math.floor(180 + f * 290 - parallaxX * 0.1 + Math.sin(seedShift + f) * 40);
      const fy = Math.floor(110 + Math.sin(time * 1.8 + f * 1.5) * 12);
      ctx.fillStyle = '#311b92';
      ctx.fillRect(fx - 26, fy, 52, 18);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(fx - 22, fy + 2, 44, 4);
      ctx.fillStyle = '#1f124d';
      ctx.fillRect(fx - 14, fy + 18, 28, 12);
    }
  } else if (biome === 'stormpeak') {
    // Periodic distant pixel lightning flashes in the thunderclouds!
    if (Math.sin(time * 2.7 + seedShift) > 0.92) {
      const lx = Math.floor(220 + ((Math.floor(time) * 193) % (width - 440)));
      ctx.strokeStyle = '#80deea';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lx, 12);
      ctx.lineTo(lx - 18, 95);
      ctx.lineTo(lx + 14, 160);
      ctx.lineTo(lx - 8, horizonY);
      ctx.stroke();
    }
  } else if (biome === 'eclipse') {
    // Blazing Coronal Rings radiating around the Eclipse!
    const ex = Math.floor(width * 0.74 - parallaxX * 0.03);
    const ey = Math.floor(horizonY * 0.42);
    ctx.strokeStyle = 'rgba(255, 171, 0, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex, ey, 54 + Math.sin(time * 3) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Twinkling pixel stars (in dark biomes) or distant gliding birds (in bright biomes)
  for (let i = 0; i < 14; i++) {
    const sx = Math.floor(((i * 113 + (biome === 'forest' ? time * 18 : 0)) % width + width) % width);
    const sy = 18 + ((i * 37) % Math.max(40, horizonY - 120));
    if (biome === 'forest' || biome === 'ruins') {
      if (i < 5) {
        const flap = Math.sin(time * 7 + i) > 0 ? -2 : 2;
        ctx.fillStyle = 'rgba(20, 28, 36, 0.55)';
        ctx.fillRect(sx - 4, sy + flap, 4, 2);
        ctx.fillRect(sx, sy, 3, 2);
        ctx.fillRect(sx + 3, sy + flap, 4, 2);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(time * 2.4 + i * 1.7));
      ctx.fillRect(sx, sy, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
    }
  }
  ctx.globalAlpha = 1;

  // 2b. Pixel Clouds drifting lazily across the sky
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(((i * 250 + time * (10 + (i % 3) * 4) - parallaxX * 0.04) % (width + 180) + (width + 180)) % (width + 180) - 90);
    const cy = 38 + (i % 3) * 34;
    ctx.fillRect(cx, cy, 84, 12);
    ctx.fillRect(cx + 14, cy - 10, 52, 10);
    ctx.fillRect(cx + 28, cy - 16, 26, 6);
  }

  // 3. Pixel Sun / Moon / Eclipse
  const celX = Math.floor(width * 0.74 - parallaxX * 0.03);
  const celY = Math.floor(horizonY * 0.42);
  ctx.fillStyle = theme.celestialColor;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(celX - 44, celY - 44, 88, 88);
  ctx.globalAlpha = 1;
  ctx.fillRect(celX - 24, celY - 24, 48, 48);
  ctx.fillRect(celX - 28, celY - 16, 56, 32);
  ctx.fillRect(celX - 16, celY - 28, 32, 56);
  if (biome === 'citadel') {
    ctx.fillStyle = theme.skyBands[0];
    ctx.fillRect(celX - 18, celY - 18, 36, 36);
  }

  // 4a. Distant Misty Mountain Range (deeper parallax layer!)
  const farStep = 24;
  for (let x = 0; x < width + farStep; x += farStep) {
    const px = x + parallaxX * 0.04;
    const peak = Math.floor((Math.sin(px * 0.005 + 1.2) * 58 + Math.cos(px * 0.013) * 28 + 78) / 8) * 8;
    ctx.fillStyle = theme.skyBands[2];
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, horizonY - peak, farStep + 1, peak + 20);
  }
  ctx.globalAlpha = 1;

  // 4b. Stepped Pixel Mountain Ridge + Cascading Waterfall / Lava-fall Detail
  const step = 16;
  for (let x = 0; x < width + step; x += step) {
    const px = x + parallaxX * 0.08;
    const peak = Math.floor(
      (Math.sin(px * 0.008) * 44 + Math.cos(px * 0.022) * 24 + 48) / 8
    ) * 8;
    ctx.fillStyle = theme.farMountain;
    ctx.fillRect(x, horizonY - peak, step + 1, peak + 20);
    ctx.fillStyle = theme.farHighlight;
    ctx.fillRect(x, horizonY - peak, step + 1, 6);
  }

  // Biome-specific horizon landmark detail (waterfall in forest, lava-fall in gorge, glowing obelisks in ruins/citadel)
  if (biome === 'forest' || biome === 'gorge') {
    const fx = Math.floor(width * 0.24 - parallaxX * 0.08);
    const shimmer = Math.floor(time * 24) % 12;
    ctx.fillStyle = biome === 'gorge' ? '#ff6d00' : '#80deea';
    ctx.fillRect(fx, horizonY - 58, 14, 62);
    ctx.fillStyle = biome === 'gorge' ? '#ffd54f' : '#ffffff';
    for (let y = 0; y < 56; y += 14) {
      ctx.fillRect(fx + 3, horizonY - 56 + ((y + shimmer) % 56), 6, 5);
    }
  }

  // 5. Midground Pixel-Art Landmarks (Unique architectural & organic silhouettes per biome + seed variance!)
  const count = 10;
  for (let i = 0; i < count; i++) {
    const baseX = Math.floor(
      (((i * 165 + seedShift * 14 - parallaxX * 0.22) % (width + 220)) + (width + 220)) % (width + 220) - 110
    );
    const h = 76 + (((i * 31 + Math.floor(seedShift * 7)) % 64));

    if (biome === 'forest' || biome === 'marsh') {
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(baseX - 10, horizonY - h * 0.55, 20, h * 0.6);
      ctx.fillStyle = theme.midSilhouette;
      ctx.fillRect(baseX - 42, horizonY - h, 84, 42);
      ctx.fillRect(baseX - 30, horizonY - h - 16, 60, 20);
      ctx.fillStyle = theme.midAccent;
      ctx.fillRect(baseX - 34, horizonY - h - 10, 44, 8);
      ctx.fillRect(baseX - 24, horizonY - h + 6, 32, 6);
      if (biome === 'marsh' && i % 2 === 0) {
        // Hanging swamp willow vines & glowing lantern
        ctx.fillStyle = '#76ff03';
        ctx.fillRect(baseX + 18, horizonY - h + 42, 4, 24);
        ctx.fillStyle = '#ffea00';
        ctx.fillRect(baseX - 14, horizonY - 22, 6, 8);
      }
    } else if (biome === 'ruins' || biome === 'elysium') {
      // Colonnade pillars & aqueduct arches
      ctx.fillStyle = theme.midSilhouette;
      ctx.fillRect(baseX - 18, horizonY - h, 36, h + 10);
      ctx.fillRect(baseX - 24, horizonY - h - 10, 48, 12);
      if (i % 2 === 0) {
        ctx.fillRect(baseX + 18, horizonY - h - 8, 110, 14);
      }
      ctx.fillStyle = theme.midAccent;
      ctx.fillRect(baseX - 14, horizonY - h + 8, 28, 4);
    } else if (biome === 'gorge' || biome === 'tundra') {
      // Jagged basalt crags / crystalline glacier spires
      ctx.fillStyle = theme.midSilhouette;
      ctx.fillRect(baseX - 34, horizonY - h * 0.5, 68, h * 0.55);
      ctx.fillRect(baseX - 20, horizonY - h * 0.85, 40, h * 0.4);
      ctx.fillRect(baseX - 8, horizonY - h, 16, 24);
      ctx.fillStyle = theme.midAccent;
      ctx.fillRect(baseX - 2, horizonY - h * 0.65, 4, h * 0.65);
    } else {
      // Gothic Citadel / Sanctum / Eclipse / Stormpeak spires + glowing windows/braziers
      ctx.fillStyle = theme.midSilhouette;
      ctx.fillRect(baseX - 18, horizonY - h, 36, h + 10);
      ctx.fillRect(baseX - 10, horizonY - h - 24, 20, 24);
      ctx.fillRect(baseX - 4, horizonY - h - 38, 8, 14);
      const flick = Math.floor(Math.sin(time * 12 + i) * 3);
      ctx.fillStyle = theme.midAccent;
      ctx.fillRect(baseX - 5, horizonY - h + 12 + flick, 10, 16);
    }
  }

  // 6. Ground Floor (Crisp stepped pixel terrain + textured stone/moss patches!)
  const floorH = height - horizonY;
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  floorGrad.addColorStop(0, theme.floorTop);
  floorGrad.addColorStop(1, theme.floorBottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, width, floorH);

  // Seeded floor stone/patch texture tiles for extra depth & variance
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  for (let i = 0; i < 18; i++) {
    const tx = Math.floor(((i * 131 + seedShift * 29 - parallaxX * 0.4) % width + width) % width);
    const ty = horizonY + 18 + ((i * 67 + Math.floor(seedShift * 11)) % Math.max(40, floorH - 36));
    ctx.fillRect(tx, ty, 32 + (i % 3) * 14, 10 + (i % 2) * 6);
  }

  // Pixel grass tufts / stone flecks across the ground
  const sway = Math.round(Math.sin(time * 4) * 3);
  ctx.fillStyle = theme.midAccent;
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 28; i++) {
    const gx = Math.floor(((i * 97 - parallaxX * (0.35 + (i % 3) * 0.15)) % width + width) % width);
    const gy = horizonY + 24 + ((i * 53) % (floorH - 40));
    ctx.fillRect(gx, gy, 4, 8);
    ctx.fillRect(gx + 5 + sway, gy + 2, 4, 6);
  }
  ctx.globalAlpha = 1;

  // 7. Ambient Pixel Motes (leaves, marsh fireflies, gold dust, volcanic embers)
  ctx.fillStyle = theme.ambientColor;
  for (let i = 0; i < 26; i++) {
    const seed = i * 97.3;
    const mx = Math.floor(((seed * 19 + time * (20 + (i % 5) * 9)) % (width + 60)) - 30);
    const my = Math.floor(
      ((seed * 11 + (biome === 'gorge' || biome === 'citadel' ? -time * 36 : time * 16)) % height +
        height) %
        height
    );
    ctx.globalAlpha = 0.35 + 0.45 * Math.sin(time * 3 + i);
    const sz = i % 3 === 0 ? 5 : 3;
    ctx.fillRect(mx, my, sz, sz);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
