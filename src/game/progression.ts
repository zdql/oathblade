import type { ComboDefinition } from '../combos';
import { getFightingStyle, type FightingStyleId } from './fightingStyles';

export type UpgradeCategory = 'hero' | 'gear' | 'pet';

export type UpgradeId =
  | 'vitality'
  | 'blade'
  | 'stamina'
  | 'parry'
  | 'footwork'
  | 'poise'
  | 'armor'
  | 'crit'
  | 'lifesteal'
  | 'shrine'
  | 'combo_mastery'
  | 'greed'
  | 'second_breath'
  | 'counter_edge'
  | 'boss_slayer'
  | 'greaves'
  | 'gauntlets'
  | 'war_banner'
  | 'pet'
  | 'pet_hawk'
  | 'pet_boar'
  | 'pet_bear'
  | 'pet_fangs'
  | 'gear';

export interface UpgradeSpec {
  id: UpgradeId;
  category: UpgradeCategory;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  baseXpCost: number;
  xpCostStep: number;
  effectPerLevel: string;
}

export const UPGRADE_SPECS: UpgradeSpec[] = [
  // ---- HERO TRAINING ----
  {
    id: 'vitality',
    category: 'hero',
    name: 'Heart Vessel',
    description: 'Forge additional vitality hearts to withstand exponentially heavier boss blows.',
    maxLevel: 25,
    baseCost: 50,
    costStep: 60,
    baseXpCost: 30,
    xpCostStep: 35,
    effectPerLevel: '+42 Max HP & +4% Vitality',
  },
  {
    id: 'stamina',
    category: 'hero',
    name: 'Knight Endurance',
    description: 'Expand stamina pool and speed up breath recovery between flurries.',
    maxLevel: 15,
    baseCost: 45,
    costStep: 50,
    baseXpCost: 25,
    xpCostStep: 30,
    effectPerLevel: '+20 Stamina & +12% Regen',
  },
  {
    id: 'parry',
    category: 'hero',
    name: 'Iron Reflexes',
    description: 'Widen your L-parry deflection window and boost counter-riposte lethality.',
    maxLevel: 12,
    baseCost: 60,
    costStep: 65,
    baseXpCost: 35,
    xpCostStep: 40,
    effectPerLevel: '+15ms Parry & +20% Counter Dmg',
  },
  {
    id: 'footwork',
    category: 'hero',
    name: 'Trailborn Footwork',
    description: 'Swifter strafing in the arena and lighter stamina drain on evades.',
    maxLevel: 12,
    baseCost: 45,
    costStep: 55,
    baseXpCost: 25,
    xpCostStep: 32,
    effectPerLevel: '+17 Move Speed',
  },
  {
    id: 'crit',
    category: 'hero',
    name: "Duelist's Precision",
    description: 'Strike weak seams in monster hides for devastating 1.75× Critical Hits.',
    maxLevel: 12,
    baseCost: 70,
    costStep: 80,
    baseXpCost: 40,
    xpCostStep: 45,
    effectPerLevel: '+6% Crit Chance (1.75× Dmg)',
  },
  {
    id: 'lifesteal',
    category: 'hero',
    name: 'Battle Adrenaline',
    description: 'Recover HP mid-fight whenever you land a Parry, Combo Finisher, or Minion Kill.',
    maxLevel: 10,
    baseCost: 80,
    costStep: 90,
    baseXpCost: 45,
    xpCostStep: 50,
    effectPerLevel: '+8 HP on Parry / Combo / Kill',
  },
  {
    id: 'combo_mastery',
    category: 'hero',
    name: 'Swordmaster Cadence',
    description: 'Supercharge your martial combo finishers and reduce their stamina cost.',
    maxLevel: 12,
    baseCost: 75,
    costStep: 85,
    baseXpCost: 45,
    xpCostStep: 50,
    effectPerLevel: '+15% Combo Dmg & -5% Stamina',
  },
  {
    id: 'greed',
    category: 'hero',
    name: "Warlord's Spoils",
    description: 'Claim larger Gold & XP bounties from every guardian, mini-boss, and boss.',
    maxLevel: 10,
    baseCost: 60,
    costStep: 75,
    baseXpCost: 35,
    xpCostStep: 42,
    effectPerLevel: '+Gold & XP Bounties (diminishing)',
  },
  {
    id: 'second_breath',
    category: 'hero',
    name: 'Iron Will',
    description: 'Steady your breathing under pressure for faster stamina recovery & grit.',
    maxLevel: 10,
    baseCost: 65,
    costStep: 70,
    baseXpCost: 40,
    xpCostStep: 42,
    effectPerLevel: '+Stamina Regen & +Max HP',
  },
  {
    id: 'counter_edge',
    category: 'hero',
    name: 'Riposte Mastery',
    description: 'Hone lethal follow-up instincts right after a Steel Parry or Perfect Evade.',
    maxLevel: 10,
    baseCost: 75,
    costStep: 80,
    baseXpCost: 45,
    xpCostStep: 48,
    effectPerLevel: '+Counter Multiplier & +Poise Break',
  },
  {
    id: 'boss_slayer',
    category: 'hero',
    name: 'Titan Slayer',
    description: 'Study giant monster anatomy to deal amplified damage to Bosses.',
    maxLevel: 12,
    baseCost: 85,
    costStep: 90,
    baseXpCost: 50,
    xpCostStep: 55,
    effectPerLevel: '+All Attack Power (diminishing)',
  },

  // ---- GEAR ARMORY ----
  {
    id: 'blade',
    category: 'gear',
    name: 'Folded Steel Blade',
    description: 'Hone your Oathblade edge for deadlier strikes and combos.',
    maxLevel: 20,
    baseCost: 55,
    costStep: 65,
    baseXpCost: 30,
    xpCostStep: 38,
    effectPerLevel: '+Blade Attack (diminishing)',
  },
  {
    id: 'armor',
    category: 'gear',
    name: 'Tempered Plate',
    description: 'Rivet layered steel plates beneath your tunic to cut incoming damage.',
    maxLevel: 12,
    baseCost: 65,
    costStep: 75,
    baseXpCost: 35,
    xpCostStep: 42,
    effectPerLevel: '-Incoming Damage (diminishing)',
  },
  {
    id: 'gear',
    category: 'gear',
    name: 'Masterwork Harness',
    description: 'Equip spiked gauntlets & war-clasp gear boosting attack, armor, and vitality.',
    maxLevel: 12,
    baseCost: 95,
    costStep: 105,
    baseXpCost: 50,
    xpCostStep: 55,
    effectPerLevel: '+Dmg, +Armor & +HP (diminishing)',
  },
  {
    id: 'poise',
    category: 'gear',
    name: 'Weighted Pommel',
    description: 'Every sword blow and guard-break shatters high-tier boss posture faster.',
    maxLevel: 12,
    baseCost: 55,
    costStep: 60,
    baseXpCost: 30,
    xpCostStep: 36,
    effectPerLevel: '+Poise Break (diminishing)',
  },
  {
    id: 'shrine',
    category: 'gear',
    name: "Vanguard's Mantle",
    description: 'Boost Trail Shrine healing between bosses and start each duel with Grit Guard.',
    maxLevel: 10,
    baseCost: 70,
    costStep: 80,
    baseXpCost: 40,
    xpCostStep: 45,
    effectPerLevel: '+Shrine Heal & +Grit Shield',
  },
  {
    id: 'greaves',
    category: 'gear',
    name: 'Spurred Greaves',
    description: 'Lightweight forged greaves for agile arena positioning and dodge efficiency.',
    maxLevel: 10,
    baseCost: 65,
    costStep: 70,
    baseXpCost: 38,
    xpCostStep: 42,
    effectPerLevel: '+Move Speed & -Dodge Cost',
  },
  {
    id: 'gauntlets',
    category: 'gear',
    name: 'Crushing Gauntlets',
    description: 'Reinforced steel vambraces that add brutal impact to every strike.',
    maxLevel: 10,
    baseCost: 80,
    costStep: 85,
    baseXpCost: 45,
    xpCostStep: 50,
    effectPerLevel: '+Attack & +Poise Break',
  },
  {
    id: 'war_banner',
    category: 'gear',
    name: "Oathkeeper's Banner",
    description: 'A battle-worn standard strapped to your pack inspiring resilience and fortune.',
    maxLevel: 10,
    baseCost: 90,
    costStep: 95,
    baseXpCost: 55,
    xpCostStep: 58,
    effectPerLevel: '+HP, +Grit Shield & +Bounties',
  },

  // ---- PET KENNEL ----
  {
    id: 'pet',
    category: 'pet',
    name: 'War-Hound Companion',
    description: 'Recruit & train a loyal hound that fights alongside you on the road and in boss duels.',
    maxLevel: 12,
    baseCost: 90,
    costStep: 100,
    baseXpCost: 50,
    xpCostStep: 55,
    effectPerLevel: 'Summons Hound (+Bite Dmg & Poise)',
  },
  {
    id: 'pet_hawk',
    category: 'pet',
    name: 'Iron-Talon Hawk',
    description: 'Trains your companion pack with swift aerial strikes, boosting Crit & Pet Power.',
    maxLevel: 10,
    baseCost: 95,
    costStep: 105,
    baseXpCost: 55,
    xpCostStep: 60,
    effectPerLevel: '+Pet Dmg & +Crit Chance',
  },
  {
    id: 'pet_boar',
    category: 'pet',
    name: 'Tusked War-Boar',
    description: 'Adds armored charge training to your companion, boosting Poise Break & Armor.',
    maxLevel: 10,
    baseCost: 95,
    costStep: 105,
    baseXpCost: 55,
    xpCostStep: 60,
    effectPerLevel: '+Pet Dmg, +Poise & +Armor',
  },
  {
    id: 'pet_bear',
    category: 'pet',
    name: 'Armored War-Bear',
    description: 'Heavy beast companion training granting huge Pet Damage & Vitality.',
    maxLevel: 10,
    baseCost: 115,
    costStep: 120,
    baseXpCost: 65,
    xpCostStep: 70,
    effectPerLevel: '+Heavy Pet Dmg & +Max HP',
  },
  {
    id: 'pet_fangs',
    category: 'pet',
    name: 'Tempered Pet Fangs',
    description: 'Steel-capped fangs and harness sharpening your companion strikes.',
    maxLevel: 10,
    baseCost: 105,
    costStep: 110,
    baseXpCost: 60,
    xpCostStep: 65,
    effectPerLevel: '+Pet Dmg & +Combo Damage',
  },
];

export interface PlayerProgress {
  gold: number;
  xp: number;
  level: number;
  levelCap: number;
  skillPoints: number;
  runCount: number;
  highestTierCleared: number;
  totalBossesDefeated: number;
  upgrades: Record<UpgradeId, number>;
  activeStyleId: FightingStyleId;
  styleLevels: Record<FightingStyleId, number>;
  unlockedComboIds: string[];
  comboLevels: Record<string, number>;
  customCombos: ComboDefinition[];
}

/** Escalating XP required to advance from `level` to `level + 1`. */
export function getXpForNextLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return Math.round(120 * Math.pow(1.26, lv - 1) + (lv - 1) * 35);
}

/** Applies XP to PlayerProgress, advancing levels up to `levelCap` and granting 1 Upgrade Point per level earned. */
export function applyXpGain(
  progress: PlayerProgress,
  amount: number
): { leveledUp: boolean; levelsGained: number; newLevel: number } {
  const cap = Math.max(1, progress.levelCap ?? 25);
  if (amount <= 0 || progress.level >= cap) {
    if (progress.level >= cap) {
      progress.xp = Math.min(progress.xp, getXpForNextLevel(progress.level) - 1);
    }
    return { leveledUp: false, levelsGained: 0, newLevel: progress.level };
  }
  progress.xp += amount;
  let levelsGained = 0;
  let needed = getXpForNextLevel(progress.level);
  while (progress.xp >= needed && progress.level < cap) {
    progress.xp -= needed;
    progress.level += 1;
    progress.skillPoints += 1;
    levelsGained += 1;
    needed = getXpForNextLevel(progress.level);
  }
  if (progress.level >= cap) {
    progress.xp = Math.min(progress.xp, getXpForNextLevel(progress.level) - 1);
  }
  return {
    leveledUp: levelsGained > 0,
    levelsGained,
    newLevel: progress.level,
  };
}

export interface DerivedPlayerStats {
  maxHp: number;
  baseAttack: number;
  maxStamina: number;
  staminaRegen: number;
  parryWindowBonus: number;
  counterMultiplier: number;
  moveSpeed: number;
  dodgeStaminaCost: number;
  poiseBreakMultiplier: number;
  damageReduction: number;
  critChance: number;
  critMultiplier: number;
  adrenalineHeal: number;
  comboDamageMultiplier: number;
  comboStaminaMultiplier: number;
  shrineHealPct: number;
  startingGritShield: number;
  bountyMultiplier: number;
  petLevel: number;
  petDamage: number;
}

const STORAGE_KEY = 'oathblade_gauntlet_save_v1';

export function createDefaultProgress(): PlayerProgress {
  return {
    gold: 0,
    xp: 0,
    level: 1,
    levelCap: 25,
    skillPoints: 0,
    runCount: 1,
    highestTierCleared: 0,
    totalBossesDefeated: 0,
    upgrades: {
      vitality: 0,
      blade: 0,
      stamina: 0,
      parry: 0,
      footwork: 0,
      poise: 0,
      armor: 0,
      crit: 0,
      lifesteal: 0,
      shrine: 0,
      combo_mastery: 0,
      greed: 0,
      second_breath: 0,
      counter_edge: 0,
      boss_slayer: 0,
      greaves: 0,
      gauntlets: 0,
      war_banner: 0,
      pet: 0,
      pet_hawk: 0,
      pet_boar: 0,
      pet_bear: 0,
      pet_fangs: 0,
      gear: 0,
    },
    activeStyleId: 'balanced',
    styleLevels: {
      balanced: 1,
      berserker: 0,
      gale: 0,
      bastion: 0,
      colossus: 0,
      phantom: 0,
    },
    unlockedComboIds: ['cross_slash', 'steel_riposte'],
    comboLevels: {
      cross_slash: 1,
      steel_riposte: 1,
    },
    customCombos: [],
  };
}

/** Exponentially diminishing sum: rank 1 = 1.0, rank 2 = 0.87, rank 3 = 0.76, etc. */
export function diminishing(level: number, decay = 0.87): number {
  if (level <= 0) return 0;
  return (1 - Math.pow(decay, level)) / (1 - decay);
}

/** Exponential Gold cost per upgrade level */
export function getUpgradeCost(id: UpgradeId, currentLevel: number): number {
  const spec = UPGRADE_SPECS.find((u) => u.id === id);
  if (!spec) return 999999;
  return Math.round(spec.baseCost * 1.25 * Math.pow(1.36, currentLevel));
}

/** Exponential XP cost per upgrade level */
export function getUpgradeXpCost(id: UpgradeId, currentLevel: number): number {
  const spec = UPGRADE_SPECS.find((u) => u.id === id);
  if (!spec) return 999999;
  return Math.round(spec.baseXpCost * 1.25 * Math.pow(1.36, currentLevel));
}

export const MAX_COMBO_LEVEL = 10;

export function getComboUpgradeCosts(baseXpCost: number, currentLevel: number): { gold: number; xp: number } {
  const base = Math.max(200, baseXpCost);
  const scale = Math.pow(1.36, Math.max(0, currentLevel - 1));
  return {
    gold: Math.round(base * 0.72 * scale),
    xp: Math.round(base * 0.65 * scale),
  };
}

export function getComboLevelMultiplier(level: number): number {
  return 1 + diminishing(Math.max(0, level - 1), 0.86) * 0.2;
}

/** True when EVERY upgrade in UPGRADE_SPECS is maxed — unlocks the Flaming Oathblade! */
export function isEverythingMaxed(progress: PlayerProgress): boolean {
  return UPGRADE_SPECS.every((u) => (progress.upgrades[u.id] ?? 0) >= u.maxLevel);
}

export function getMaxedUpgradeSummary(progress: PlayerProgress): { current: number; total: number } {
  let current = 0;
  let total = 0;
  for (const u of UPGRADE_SPECS) {
    current += Math.min(u.maxLevel, progress.upgrades[u.id] ?? 0);
    total += u.maxLevel;
  }
  return { current, total };
}

export function computePlayerStats(progress: PlayerProgress, baseMoveSpeed: number): DerivedPlayerStats {
  const u = progress.upgrades;
  const d = (id: UpgradeId) => diminishing(u[id] ?? 0, 0.87);

  const gearD = d('gear');
  const petLv = u.pet ?? 0;
  const totalPetLv =
    petLv + (u.pet_hawk ?? 0) + (u.pet_boar ?? 0) + (u.pet_bear ?? 0) + (u.pet_fangs ?? 0);
  const petD =
    d('pet') + d('pet_hawk') * 0.8 + d('pet_boar') * 0.8 + d('pet_bear') * 1.15 + d('pet_fangs') * 0.9;

  // Active upgradeable Fighting Style bonuses (with diminishing returns)
  const style = getFightingStyle(progress.activeStyleId ?? 'balanced');
  const styleLv = Math.max(1, progress.styleLevels?.[style.id] ?? 1);
  const sD = diminishing(styleLv - 1, 0.87);
  const styleAtkMul = 1 + (style.attackPctBase + sD * style.attackPctPerLv) * 0.85;
  const styleSpdMul = 1 + (style.speedPctBase + sD * style.speedPctPerLv) * 0.85;
  const stylePoiseMul = 1 + (style.poisePctBase + sD * style.poisePctPerLv) * 0.85;
  const styleCritAdd = (style.critPctBase + sD * style.critPctPerLv) * 0.85;
  const styleParrySec = ((style.parryMsBase + sD * style.parryMsPerLv) * 0.85) / 1000;
  const styleArmorAdd = (style.armorPctBase + sD * style.armorPctPerLv) * 0.85;
  const styleComboMul = 1 + (style.comboPctBase + sD * style.comboPctPerLv) * 0.85;

  const maxedBonus = isEverythingMaxed(progress) ? 1.25 : 1.0;

  const rawAtk =
    (28 + d('blade') * 28 + d('gauntlets') * 18) *
    (1 + d('blade') * 0.14 + d('boss_slayer') * 0.12 + gearD * 0.09);

  return {
    maxHp: Math.round(
      (110 + d('vitality') * 85 + gearD * 36 + d('second_breath') * 32 + d('war_banner') * 40 + d('pet_bear') * 45) *
        (1 + d('vitality') * 0.08) *
        maxedBonus *
        0.9
    ),
    baseAttack: Math.round(rawAtk * styleAtkMul * maxedBonus * 0.95 * 0.85),
    maxStamina: Math.round(100 + d('stamina') * 34),
    staminaRegen: 32 * (1 + d('stamina') * 0.16 + d('second_breath') * 0.14) * (style.id === 'gale' ? 1.18 : 1.0),
    parryWindowBonus: d('parry') * 0.02 + styleParrySec,
    counterMultiplier: 1.35 + d('parry') * 0.25 + d('counter_edge') * 0.28 + (style.id === 'bastion' ? 0.2 : 0),
    moveSpeed: Math.round((baseMoveSpeed + d('footwork') * 24 + d('greaves') * 20) * styleSpdMul),
    dodgeStaminaCost: Math.max(6, Math.round(18 - d('footwork') * 1.3 - d('greaves') * 1.1)),
    poiseBreakMultiplier:
      (1 + d('poise') * 0.28 + d('gauntlets') * 0.2 + d('counter_edge') * 0.18 + d('pet_boar') * 0.14) *
      stylePoiseMul,
    damageReduction: Math.min(0.66, d('armor') * 0.055 + gearD * 0.03 + d('pet_boar') * 0.02 + styleArmorAdd),
    critChance: Math.min(0.88, d('crit') * 0.09 + d('pet_hawk') * 0.045 + styleCritAdd),
    critMultiplier: 1.75,
    adrenalineHeal: Math.round(d('lifesteal') * 14),
    comboDamageMultiplier: (1 + d('combo_mastery') * 0.22 + d('pet_fangs') * 0.1) * styleComboMul,
    comboStaminaMultiplier: Math.max(0.4, 1 - d('combo_mastery') * 0.07),
    shrineHealPct: Math.min(0.88, 0.3 + d('shrine') * 0.07),
    startingGritShield: Math.round(d('shrine') * 42 + d('war_banner') * 36),
    bountyMultiplier: 1 + d('greed') * 0.24 + d('war_banner') * 0.14,
    petLevel: totalPetLv,
    petDamage: totalPetLv > 0 ? Math.round((22 + petD * 34) * (1 + petD * 0.08) * maxedBonus * 0.85) : 0,
  };
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota / private mode issues
  }
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const def = createDefaultProgress();
    const merged: PlayerProgress = {
      ...def,
      ...parsed,
      level: typeof parsed.level === 'number' && parsed.level >= 1 ? Math.floor(parsed.level) : 1,
      levelCap: typeof parsed.levelCap === 'number' && parsed.levelCap >= 25 ? Math.floor(parsed.levelCap) : 25,
      skillPoints: typeof parsed.skillPoints === 'number' && parsed.skillPoints >= 0 ? Math.floor(parsed.skillPoints) : 0,
      upgrades: {
        ...def.upgrades,
        ...(parsed.upgrades ?? {}),
      },
      activeStyleId: parsed.activeStyleId ?? def.activeStyleId,
      styleLevels: {
        ...def.styleLevels,
        ...(parsed.styleLevels ?? {}),
      },
      unlockedComboIds: Array.isArray(parsed.unlockedComboIds)
        ? parsed.unlockedComboIds
        : def.unlockedComboIds,
      comboLevels: {
        ...def.comboLevels,
        ...(parsed.comboLevels ?? {}),
      },
      customCombos: Array.isArray(parsed.customCombos) ? parsed.customCombos : [],
    };
    // Migrate legacy saves that stored raw unspent XP without a level
    if (parsed.level === undefined && merged.xp >= getXpForNextLevel(1)) {
      const legacyXp = merged.xp;
      merged.xp = 0;
      applyXpGain(merged, legacyXp);
    }
    return merged;
  } catch {
    return createDefaultProgress();
  }
}

export function resetProgress(): PlayerProgress {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}
