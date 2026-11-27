import type { BiomeId } from '../bosses';

export interface RunBuff {
  id: string;
  name: string;
  description: string;
  color: string;
  hpPct?: number;
  healFlat?: number;
  attackPct?: number;
  staminaRegenPct?: number;
  parryBonusMs?: number;
  counterPct?: number;
  moveSpeedPct?: number;
  poiseBreakPct?: number;
  comboDmgPct?: number;
  bountyPct?: number;
}

export const RUN_BUFF_POOL: RunBuff[] = [
  {
    id: 'whetstone_edge',
    name: 'Whetstone Edge',
    description: '+16% Sword Attack for this run',
    color: '#ffab40',
    attackPct: 0.16,
  },
  {
    id: 'trollblood_vigor',
    name: 'Titan Heartiness',
    description: '+18% Max HP & instantly heal +40 HP',
    color: '#ef5350',
    hpPct: 0.18,
    healFlat: 40,
  },
  {
    id: 'stalker_footwork',
    name: "Stalker's Footwork",
    description: '+14% Move Speed & +18% Stamina Regen',
    color: '#69f0ae',
    moveSpeedPct: 0.14,
    staminaRegenPct: 0.18,
  },
  {
    id: 'bulwark_temper',
    name: 'Bulwark Temper',
    description: '+35ms Parry Window & +22% Counter Damage',
    color: '#ffd54f',
    parryBonusMs: 35,
    counterPct: 0.22,
  },
  {
    id: 'sunder_weight',
    name: "Sunderer's Weight",
    description: '+28% Poise Break on all sword strikes',
    color: '#ce93d8',
    poiseBreakPct: 0.28,
  },
  {
    id: 'executioner_focus',
    name: "Executioner's Focus",
    description: '+24% Combo Finisher Damage',
    color: '#7be3ff',
    comboDmgPct: 0.24,
  },
  {
    id: 'second_wind',
    name: 'Iron Lungs',
    description: '+32% Stamina Regen & heal +25 HP',
    color: '#80deea',
    staminaRegenPct: 0.32,
    healFlat: 25,
  },
  {
    id: 'bounty_seal',
    name: 'Gilded War-Seal',
    description: '+25% Gold & XP from remaining foes',
    color: '#ffe082',
    bountyPct: 0.25,
  },
];

export function rollRunBuffChoices(count = 3): RunBuff[] {
  const pool = [...RUN_BUFF_POOL];
  const picks: RunBuff[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

export type RoadSurface = 'dirt' | 'cobble' | 'flagstone' | 'basalt' | 'carpet';
export type RoadWeather = 'clear' | 'mist' | 'dusk' | 'embers' | 'rain';
export type RoadsidePropKind = 'signpost' | 'brazier' | 'statue' | 'mushroom' | 'banner' | 'rock';

export interface RoadsideProp {
  distance: number;
  side: -1 | 1;
  offsetX: number;
  kind: RoadsidePropKind;
}

export interface RoadVariation {
  seed: number;
  curveAmp: number;
  curveFreq: number;
  curvePhase: number;
  surface: RoadSurface;
  weather: RoadWeather;
  skyTint: string;
  props: RoadsideProp[];
}

export type GuardianVariant =
  | 'brute'
  | 'swift'
  | 'shielded'
  | 'berserker'
  | 'trickster'
  | 'ironclad'
  | 'executioner'
  | 'miniboss';

export type NpcLookId =
  | 'goblin'
  | 'knight'
  | 'beast'
  | 'assassin'
  | 'golem'
  | 'lancer'
  | 'drake'
  | 'warlord';

export type RoadMinigameKind =
  | 'anvil_timing'
  | 'parry_gauntlet'
  | 'boulder_dodge'
  | 'target_slash'
  | 'coin_catch'
  | 'blade_clash'
  | 'stance_mirror'
  | 'whetstone_rhythm';

export type StanceDir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export interface RoadHealthPack {
  id: string;
  distance: number;
  x: number;
  healPct: number;
  collected: boolean;
}

export interface RoadTreasureChest {
  id: string;
  guardianId: string;
  distance: number;
  x: number;
  unlocked: boolean;
  opened: boolean;
  openAnimTimer: number;
  goldReward: number;
  xpReward: number;
}

/**
 * Each Road Mini-Boss has a 55% chance to guard an ornate Treasure Chest
 * containing Gold, XP, and a random Pet / Armor / Gear upgrade!
 */
export function generateRoadTreasureChests(
  guardians: RoadGuardian[],
  bossGold: number,
  bossXp: number
): RoadTreasureChest[] {
  const chests: RoadTreasureChest[] = [];
  for (const g of guardians) {
    if (!g.isMiniBoss) continue;
    if (Math.random() < 0.55) {
      chests.push({
        id: `chest_${g.id}`,
        guardianId: g.id,
        distance: g.distance + 28,
        x: Math.max(-165, Math.min(165, g.x)),
        unlocked: false,
        opened: false,
        openAnimTimer: 0,
        goldReward: Math.max(8, Math.round(bossGold * 0.35)),
        xpReward: Math.max(35, Math.round(bossXp * 0.38)),
      });
    }
  }
  return chests;
}

export interface RoadRaidPortal {
  id: string;
  distance: number;
  x: number;
  entered: boolean;
  declined: boolean;
  cleared: boolean;
}

/**
 * 25% chance per road area to spawn an optional Abyssal Raid Rift.
 */
export function generateRoadRaidPortal(targetDistance: number, tier: number): RoadRaidPortal | null {
  if (Math.random() >= 0.25) return null;
  return {
    id: `raid_portal_t${tier}_${Math.random().toString(36).slice(2, 6)}`,
    distance: Math.round(targetDistance * (0.58 + Math.random() * 0.16)),
    x: (Math.random() < 0.5 ? -1 : 1) * 118,
    entered: false,
    declined: false,
    cleared: false,
  };
}

export function generateRoadHealthPacks(targetDistance: number): RoadHealthPack[] {
  const packs: RoadHealthPack[] = [];
  // Sporadic placement across 4 road segments (45% chance per segment -> 1-3 packs, never too easy!)
  for (let seg = 0; seg < 4; seg++) {
    if (packs.length >= 3) break;
    if (Math.random() < 0.45) {
      const segStart = targetDistance * (0.14 + seg * 0.21);
      packs.push({
        id: `hp_road_${seg}_${Math.random().toString(36).slice(2, 5)}`,
        distance: Math.round(segStart + Math.random() * (targetDistance * 0.14)),
        x: (Math.random() * 2 - 1) * 155,
        healPct: 0.22,
        collected: false,
      });
    }
  }
  // Guarantee at least 1 Health Pack spawns on every road!
  if (packs.length === 0) {
    packs.push({
      id: `hp_road_guaranteed_${Math.random().toString(36).slice(2, 5)}`,
      distance: Math.round(targetDistance * (0.32 + Math.random() * 0.4)),
      x: (Math.random() * 2 - 1) * 140,
      healPct: 0.22,
      collected: false,
    });
  }
  return packs;
}

export interface RoadMinigameState {
  kind: RoadMinigameKind;
  title: string;
  instructions: string;
  distance: number;
  active: boolean;
  completed: boolean;
  succeeded: boolean;
  /** Shared timer / cursor state for all 8 minigames */
  timer: number;
  maxTimer: number;
  score: number;
  targetScore: number;
  cursor: number;
  cursorDir: number;
  promptKey: 'K' | 'J' | 'L';
  stanceDir: StanceDir;
  lanes: Array<{ lane: number; y: number; speed: number }>;
  playerLane: number;
  flashMsg: string;
  flashTimer: number;
}

export interface RoadGuardian {
  id: string;
  name: string;
  look: NpcLookId;
  variant: GuardianVariant;
  variantLabel: string;
  variantColor: string;
  scaleMul: number;
  isMiniBoss: boolean;
  biome: BiomeId;
  /** Distance along the road where this guardian waits */
  distance: number;
  x: number;
  z: number;
  vz: number;
  hp: number;
  maxHp: number;
  damage: number;
  windupDuration: number;
  moveSpeed: number;
  /** Remaining hits in current attack burst (berserkers=2, miniboss=3!) */
  burstHitsLeft: number;
  isShielded: boolean;
  isArmored: boolean;
  stunned?: boolean;
  feintTriggered: boolean;
  attackPattern: 'standard' | 'leap_slam' | 'delayed_heavy' | 'feint_flank' | 'multi_chain';
  goldReward: number;
  xpReward: number;
  state: 'idle' | 'windup' | 'attack' | 'hurt' | 'dead';
  stateTimer: number;
  stateDuration: number;
  attackCooldown: number;
  animFrame: number;
  animElapsed: number;
  hitDealt: boolean;
}

const GUARDIAN_NAMES: Record<BiomeId, string[]> = {
  forest: ['Bramble Imp', 'Moss Goblin', 'Thorn Scout'],
  marsh: ['Bog Hatchling', 'Mire Fang', 'Swamp Skitter'],
  ruins: ['Bronze Squire', 'Ruin Sentinel', 'Gilded Husk'],
  gorge: ['Cinder Whelp', 'Ash Talon', 'Basalt Drake'],
  citadel: ['Ashen Page', 'Crimson Guard', 'Oathless Blade'],
  tundra: ['Frost Imp', 'Glacier Cub', 'Ice Stalker'],
  sanctum: ['Starlight Lancer', 'Astral Squire', 'Halo Guard'],
  eclipse: ['Eclipse Knight', 'Solar Husk', 'Crown Zealot'],
  stormpeak: ['Volt Imp', 'Thunder Guard', 'Storm Lancer'],
  elysium: ['Dawn Squire', 'Gilded Seraph', 'Oath Sentinel'],
};

export function generateRoadVariation(biome: BiomeId, targetDistance: number): RoadVariation {
  const seed = Math.floor(Math.random() * 1_000_000);
  const surfacesByBiome: Record<BiomeId, RoadSurface[]> = {
    forest: ['dirt', 'cobble', 'flagstone'],
    marsh: ['dirt', 'flagstone'],
    ruins: ['cobble', 'flagstone'],
    gorge: ['basalt', 'dirt'],
    citadel: ['carpet', 'basalt', 'cobble'],
    tundra: ['flagstone', 'cobble', 'dirt'],
    sanctum: ['carpet', 'flagstone', 'cobble'],
    eclipse: ['carpet', 'basalt'],
    stormpeak: ['basalt', 'flagstone', 'cobble'],
    elysium: ['carpet', 'flagstone'],
  };
  const weathersByBiome: Record<BiomeId, RoadWeather[]> = {
    forest: ['clear', 'mist', 'dusk', 'rain'],
    marsh: ['mist', 'rain', 'dusk'],
    ruins: ['clear', 'dusk', 'mist'],
    gorge: ['embers', 'dusk', 'clear'],
    citadel: ['embers', 'dusk', 'mist'],
    tundra: ['mist', 'clear', 'rain'],
    sanctum: ['dusk', 'clear', 'mist'],
    eclipse: ['embers', 'dusk'],
    stormpeak: ['rain', 'dusk', 'mist'],
    elysium: ['clear', 'dusk'],
  };
  const propsByBiome: Record<BiomeId, RoadsidePropKind[]> = {
    forest: ['signpost', 'mushroom', 'rock', 'banner'],
    marsh: ['mushroom', 'rock', 'signpost', 'brazier'],
    ruins: ['statue', 'brazier', 'banner', 'rock'],
    gorge: ['brazier', 'rock', 'banner'],
    citadel: ['brazier', 'banner', 'statue'],
    tundra: ['rock', 'banner', 'signpost', 'statue'],
    sanctum: ['statue', 'brazier', 'banner'],
    eclipse: ['brazier', 'statue', 'banner'],
    stormpeak: ['rock', 'brazier', 'banner'],
    elysium: ['statue', 'banner', 'brazier'],
  };

  const sList = surfacesByBiome[biome];
  const wList = weathersByBiome[biome];
  const pList = propsByBiome[biome];

  const weather = wList[Math.floor(Math.random() * wList.length)];
  const tintMap: Record<RoadWeather, string> = {
    clear: 'rgba(255, 248, 220, 0.05)',
    mist: 'rgba(180, 225, 215, 0.14)',
    dusk: 'rgba(120, 50, 140, 0.14)',
    embers: 'rgba(255, 90, 20, 0.12)',
    rain: 'rgba(40, 80, 130, 0.18)',
  };

  const props: RoadsideProp[] = [];
  const propCount = Math.max(18, Math.round(targetDistance / 52));
  for (let i = 0; i < propCount; i++) {
    props.push({
      distance: 45 + (i / propCount) * (targetDistance - 70) + (Math.random() - 0.5) * 28,
      side: i % 2 === 0 ? -1 : 1,
      offsetX: 115 + Math.random() * 85,
      kind: pList[Math.floor(Math.random() * pList.length)],
    });
  }

  return {
    seed,
    curveAmp: (Math.random() * 2 - 1) * 72,
    curveFreq: 0.0045 + Math.random() * 0.0045,
    curvePhase: Math.random() * Math.PI * 2,
    surface: sList[Math.floor(Math.random() * sList.length)],
    weather,
    skyTint: tintMap[weather],
    props,
  };
}

const MINIBOSS_NAMES: Record<BiomeId, string> = {
  forest: 'Warden Grimgut (Mini-Boss)',
  marsh: 'Venomtail Alpha (Mini-Boss)',
  ruins: 'Captain Aegis (Mini-Boss)',
  gorge: 'Ashwing Matriarch (Mini-Boss)',
  citadel: 'Dread-Marshal Vane (Mini-Boss)',
  tundra: 'Frostfang Yeti-Lord (Mini-Boss)',
  sanctum: 'Seraphim Lancer (Mini-Boss)',
  eclipse: 'Solar Inquisitor (Mini-Boss)',
  stormpeak: 'Volt-Warden Volkar (Mini-Boss)',
  elysium: 'Dawnblade Exemplar (Mini-Boss)',
};

const VARIANT_CONFIGS: Record<
  GuardianVariant,
  {
    label: string;
    color: string;
    hpMul: number;
    dmgMul: number;
    windup: number;
    speed: number;
    scaleMul: number;
    shielded: boolean;
    armored: boolean;
  }
> = {
  brute: {
    label: 'Brute',
    color: '#ff9100',
    hpMul: 1.45,
    dmgMul: 1.28,
    windup: 0.58,
    speed: 98,
    scaleMul: 1.24,
    shielded: false,
    armored: false,
  },
  swift: {
    label: 'Swift',
    color: '#69f0ae',
    hpMul: 0.92,
    dmgMul: 1.05,
    windup: 0.34,
    speed: 195,
    scaleMul: 0.94,
    shielded: false,
    armored: false,
  },
  shielded: {
    label: 'Vanguard',
    color: '#ffd54f',
    hpMul: 1.22,
    dmgMul: 1.08,
    windup: 0.48,
    speed: 115,
    scaleMul: 1.08,
    shielded: true,
    armored: false,
  },
  berserker: {
    label: 'Frenzied',
    color: '#ff5252',
    hpMul: 1.12,
    dmgMul: 1.32,
    windup: 0.4,
    speed: 158,
    scaleMul: 1.06,
    shielded: false,
    armored: false,
  },
  trickster: {
    label: 'Feintblade',
    color: '#ce93d8',
    hpMul: 1.02,
    dmgMul: 1.22,
    windup: 0.52,
    speed: 175,
    scaleMul: 1.0,
    shielded: false,
    armored: false,
  },
  ironclad: {
    label: 'Ironclad',
    color: '#90caf9',
    hpMul: 1.65,
    dmgMul: 1.15,
    windup: 0.56,
    speed: 92,
    scaleMul: 1.16,
    shielded: false,
    armored: true,
  },
  executioner: {
    label: 'Reaper',
    color: '#ff4081',
    hpMul: 1.15,
    dmgMul: 1.55,
    windup: 0.66,
    speed: 125,
    scaleMul: 1.14,
    shielded: false,
    armored: false,
  },
  miniboss: {
    label: 'ROAD WARDEN',
    color: '#ffea00',
    hpMul: 1.85,
    dmgMul: 1.4,
    windup: 0.46,
    speed: 150,
    scaleMul: 1.42,
    shielded: true,
    armored: true,
  },
};

function createMinigameOfKind(kind: RoadMinigameKind, distance: number): RoadMinigameState {
  const base = {
    kind,
    distance,
    active: false,
    completed: false,
    succeeded: false,
    timer: 0,
    score: 0,
    cursor: 0,
    cursorDir: 1,
    promptKey: 'K' as 'K' | 'J' | 'L',
    stanceDir: 'LEFT' as StanceDir,
    lanes: [] as Array<{ lane: number; y: number; speed: number }>,
    playerLane: 1,
    flashMsg: '',
    flashTimer: 0,
  };

  if (kind === 'anvil_timing') {
    return {
      ...base,
      title: 'Roadside Forge Anvil',
      instructions: 'Tap J or K when the hammer hits the GOLD zone (3 hits)!',
      maxTimer: 9,
      targetScore: 3,
      cursor: 0.1,
      promptKey: 'J',
    };
  }
  if (kind === 'parry_gauntlet') {
    return {
      ...base,
      title: 'Ambush Arrow Volley',
      instructions: 'Tap L (Parry) when the arrow ring reaches the GOLD center (4 times)!',
      maxTimer: 9.5,
      targetScore: 4,
      promptKey: 'L',
    };
  }
  if (kind === 'boulder_dodge') {
    return {
      ...base,
      title: 'Tumbling Rockslide',
      instructions: 'Move Left / Right (A / D or Stick) to dodge boulders for 6s!',
      maxTimer: 6.2,
      targetScore: 6,
      lanes: [
        { lane: 0, y: -0.2, speed: 0.65 },
        { lane: 2, y: -0.65, speed: 0.72 },
      ],
    };
  }
  if (kind === 'coin_catch') {
    return {
      ...base,
      title: 'Spilled Treasure Cart',
      instructions: 'Move Left / Right (A / D or Stick) to catch 5 falling Gold Pouches!',
      maxTimer: 8.5,
      targetScore: 5,
      lanes: [
        { lane: 0, y: -0.1, speed: 0.62 },
        { lane: 2, y: -0.55, speed: 0.68 },
      ],
    };
  }
  if (kind === 'blade_clash') {
    return {
      ...base,
      title: 'Steel Lock Tug-of-War',
      instructions: 'Mash K or J rapidly to overpower the rival blade before time runs out!',
      maxTimer: 7.5,
      targetScore: 100,
      cursor: 0.38,
    };
  }
  if (kind === 'stance_mirror') {
    const dirs: StanceDir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
    return {
      ...base,
      title: "Sensei's Stance Test",
      instructions: 'Push the shown direction (WASD or Thumbstick) 5 times!',
      maxTimer: 8.5,
      targetScore: 5,
      stanceDir: dirs[Math.floor(Math.random() * dirs.length)],
    };
  }
  if (kind === 'whetstone_rhythm') {
    return {
      ...base,
      title: 'Master Whetstone Drill',
      instructions: 'Alternate K then J (6 strokes) to hone your Oathblade!',
      maxTimer: 8.0,
      targetScore: 6,
      promptKey: 'K',
    };
  }
  const keys: Array<'K' | 'J' | 'L'> = ['K', 'J', 'L'];
  return {
    ...base,
    title: 'Master Dummy Drill',
    instructions: 'Match the flashed swordplay key (K, J, or L) 5 times quickly!',
    maxTimer: 8.5,
    targetScore: 5,
    promptKey: keys[Math.floor(Math.random() * keys.length)],
  };
}

/**
 * Generates 2 to 3 DISTINCT randomized minigames per road level!
 * Because they re-roll every run, dying and returning to the same road
 * gives different minigames in those spots!
 */
export function generateRoadMinigames(targetDistance: number, tier = 1): RoadMinigameState[] {
  const pool: RoadMinigameKind[] = [
    'anvil_timing',
    'parry_gauntlet',
    'boulder_dodge',
    'target_slash',
    'coin_catch',
    'blade_clash',
    'stance_mirror',
    'whetstone_rhythm',
  ];
  const count = tier >= 3 ? 3 : 2;
  const fracs = count === 3 ? [0.27, 0.54, 0.8] : [0.34, 0.68];
  const games: RoadMinigameState[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const kind = pool.splice(idx, 1)[0];
    games.push(createMinigameOfKind(kind, Math.round(targetDistance * fracs[i])));
  }
  return games;
}

export function spawnRoadGuardians(
  biome: BiomeId,
  bossMaxHp: number,
  bossDamage: number,
  bossGold: number,
  bossXp: number,
  targetDistance: number,
  tier = 1,
  playerBaseAttack = 28
): RoadGuardian[] {
  // 10 enemies on Tiers 1-2, 11 on Tiers 3-4, 13 on Tier 5+ (with 1 crowned Mini-Boss!)
  const count = bossMaxHp >= 12000 ? 13 : bossMaxHp >= 2800 ? 11 : 10;
  const miniBossIndices = new Set([count - 2]);
  const names = GUARDIAN_NAMES[biome];
  const regularVariants: GuardianVariant[] = [
    'brute',
    'swift',
    'shielded',
    'berserker',
    'trickster',
    'ironclad',
    'executioner',
  ];
  const looks: NpcLookId[] = ['goblin', 'knight', 'beast', 'assassin', 'golem', 'lancer', 'drake', 'warlord'];
  const guardians: RoadGuardian[] = [];

  for (let i = 0; i < count; i++) {
    const frac = (i + 1) / (count + 1);
    const distPos = Math.round(targetDistance * (0.07 + frac * 0.87));
    const isMiniBoss = miniBossIndices.has(i);
    const variant: GuardianVariant = isMiniBoss
      ? 'miniboss'
      : regularVariants[(i + Math.floor(Math.random() * regularVariants.length)) % regularVariants.length];
    const vc = VARIANT_CONFIGS[variant];
    const look: NpcLookId = isMiniBoss
      ? 'warlord'
      : looks[(i * 3 + Math.floor(Math.random() * looks.length)) % looks.length];

    const attackPattern: RoadGuardian['attackPattern'] =
      isMiniBoss
        ? 'multi_chain'
        : variant === 'brute'
        ? 'leap_slam'
        : variant === 'executioner'
        ? 'delayed_heavy'
        : variant === 'trickster'
        ? 'feint_flank'
        : variant === 'berserker'
        ? 'multi_chain'
        : 'standard';

    // Mini-Bosses = 50% as strong as that tier's Boss (50% HP and 50% Attack)!
    // Regular minions = 5 hits on World 1 (+4 hits per world without upgrades).
    const unupgradedBaseHit = 28;
    const baseHitsForWorld = 5 + (Math.max(1, tier) - 1) * 4;
    const hp = isMiniBoss
      ? Math.max(72, Math.round(bossMaxHp * 0.5))
      : Math.round(unupgradedBaseHit * baseHitsForWorld * 0.9);
    const dmg = isMiniBoss
      ? Math.max(12, Math.round(bossDamage * 0.5))
      : Math.max(22, Math.round(bossDamage * (0.62 + Math.random() * 0.1) * vc.dmgMul));

    guardians.push({
      id: `guard_${biome}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      name: isMiniBoss ? MINIBOSS_NAMES[biome] : `${vc.label} ${names[i % names.length]}`,
      look,
      variant,
      variantLabel: vc.label,
      variantColor: vc.color,
      scaleMul: vc.scaleMul,
      isMiniBoss,
      biome,
      distance: distPos,
      x: isMiniBoss ? 0 : (i % 2 === 0 ? -1 : 1) * (42 + Math.random() * 78),
      z: 0,
      vz: 0,
      hp,
      maxHp: hp,
      damage: dmg,
      windupDuration: vc.windup,
      moveSpeed: vc.speed,
      burstHitsLeft: 1,
      isShielded: vc.shielded,
      isArmored: vc.armored,
      feintTriggered: false,
      attackPattern,
      goldReward: Math.max(22, Math.round(bossGold * (isMiniBoss ? 0.42 : 0.18))),
      xpReward: Math.max(22, Math.round(bossXp * (isMiniBoss ? 0.42 : 0.18))),
      state: 'idle',
      stateTimer: 0,
      stateDuration: 0,
      attackCooldown: 0.42 + Math.random() * 0.28,
      animFrame: 0,
      animElapsed: 0,
      hitDealt: false,
    });
  }

  return guardians;
}
