export type FightingStyleId =
  | 'balanced'
  | 'berserker'
  | 'gale'
  | 'bastion'
  | 'colossus'
  | 'phantom';

export interface FightingStyleSpec {
  id: FightingStyleId;
  name: string;
  tagline: string;
  description: string;
  unlockCostXp: number;
  upgradeBaseCost: number;
  upgradeCostStep: number;
  maxLevel: number;
  /** Primary visual effect color for blade, slashes, and aura */
  primaryColor: string;
  secondaryColor: string;
  /** Per-level stat bonuses (applied at level >= 1) */
  attackPctBase: number;
  attackPctPerLv: number;
  speedPctBase: number;
  speedPctPerLv: number;
  poisePctBase: number;
  poisePctPerLv: number;
  critPctBase: number;
  critPctPerLv: number;
  parryMsBase: number;
  parryMsPerLv: number;
  armorPctBase: number;
  armorPctPerLv: number;
  comboPctBase: number;
  comboPctPerLv: number;
}

export const FIGHTING_STYLES: FightingStyleSpec[] = [
  {
    id: 'balanced',
    name: 'Oathblade Classic',
    tagline: 'Balanced Steel • Silver-Cyan Arcs',
    description: 'Versatile knightly swordsmanship with clean steel arcs and steady all-around scaling.',
    unlockCostXp: 0,
    upgradeBaseCost: 90,
    upgradeCostStep: 80,
    maxLevel: 10,
    primaryColor: '#80deea',
    secondaryColor: '#ffffff',
    attackPctBase: 0.05,
    attackPctPerLv: 0.06,
    speedPctBase: 0.04,
    speedPctPerLv: 0.02,
    poisePctBase: 0.06,
    poisePctPerLv: 0.05,
    critPctBase: 0.03,
    critPctPerLv: 0.015,
    parryMsBase: 10,
    parryMsPerLv: 4,
    armorPctBase: 0.02,
    armorPctPerLv: 0.01,
    comboPctBase: 0.05,
    comboPctPerLv: 0.05,
  },
  {
    id: 'berserker',
    name: 'Crimson Berserker',
    tagline: 'Furious Offense • Blazing Crimson Slashes',
    description: 'Unleash ferocious high-damage swings wreathed in crimson impact flares.',
    unlockCostXp: 140,
    upgradeBaseCost: 110,
    upgradeCostStep: 95,
    maxLevel: 10,
    primaryColor: '#ff5252',
    secondaryColor: '#ffab40',
    attackPctBase: 0.22,
    attackPctPerLv: 0.1,
    speedPctBase: 0.05,
    speedPctPerLv: 0.02,
    poisePctBase: 0.1,
    poisePctPerLv: 0.05,
    critPctBase: 0.05,
    critPctPerLv: 0.02,
    parryMsBase: 0,
    parryMsPerLv: 0,
    armorPctBase: 0,
    armorPctPerLv: 0,
    comboPctBase: 0.1,
    comboPctPerLv: 0.06,
  },
  {
    id: 'gale',
    name: 'Gale Duelist',
    tagline: 'Blistering Speed • Emerald Wind Rings',
    description: 'Razor-fast footwork and whirlwind pressure trailing emerald gale currents.',
    unlockCostXp: 160,
    upgradeBaseCost: 110,
    upgradeCostStep: 90,
    maxLevel: 10,
    primaryColor: '#69f0ae',
    secondaryColor: '#b9f6ca',
    attackPctBase: 0.08,
    attackPctPerLv: 0.06,
    speedPctBase: 0.18,
    speedPctPerLv: 0.04,
    poisePctBase: 0.05,
    poisePctPerLv: 0.04,
    critPctBase: 0.08,
    critPctPerLv: 0.025,
    parryMsBase: 12,
    parryMsPerLv: 4,
    armorPctBase: 0.02,
    armorPctPerLv: 0.01,
    comboPctBase: 0.14,
    comboPctPerLv: 0.07,
  },
  {
    id: 'bastion',
    name: 'Iron Bastion',
    tagline: 'Immovable Counter • Golden Aegis Waves',
    description: 'Fortress-like defense and punishing golden counter-waves on every parry.',
    unlockCostXp: 180,
    upgradeBaseCost: 115,
    upgradeCostStep: 95,
    maxLevel: 10,
    primaryColor: '#ffd54f',
    secondaryColor: '#fff8e1',
    attackPctBase: 0.08,
    attackPctPerLv: 0.06,
    speedPctBase: 0,
    speedPctPerLv: 0.01,
    poisePctBase: 0.18,
    poisePctPerLv: 0.08,
    critPctBase: 0,
    critPctPerLv: 0.01,
    parryMsBase: 40,
    parryMsPerLv: 8,
    armorPctBase: 0.1,
    armorPctPerLv: 0.02,
    comboPctBase: 0.08,
    comboPctPerLv: 0.05,
  },
  {
    id: 'colossus',
    name: 'Sunder Colossus',
    tagline: 'Posture Crusher • Seismic Amber Shockwaves',
    description: 'Earth-shaking heavy blows that shatter shields and stagger bosses rapidly.',
    unlockCostXp: 210,
    upgradeBaseCost: 125,
    upgradeCostStep: 100,
    maxLevel: 10,
    primaryColor: '#ff9100',
    secondaryColor: '#ffe082',
    attackPctBase: 0.16,
    attackPctPerLv: 0.09,
    speedPctBase: 0,
    speedPctPerLv: 0.01,
    poisePctBase: 0.35,
    poisePctPerLv: 0.12,
    critPctBase: 0.04,
    critPctPerLv: 0.015,
    parryMsBase: 10,
    parryMsPerLv: 3,
    armorPctBase: 0.06,
    armorPctPerLv: 0.015,
    comboPctBase: 0.12,
    comboPctPerLv: 0.06,
  },
  {
    id: 'phantom',
    name: 'Phantom Iaijutsu',
    tagline: 'Lethal Precision • Violet Crescent Flashes',
    description: 'Lightning-quick unsheathe strikes with massive critical and combo lethality.',
    unlockCostXp: 260,
    upgradeBaseCost: 135,
    upgradeCostStep: 110,
    maxLevel: 10,
    primaryColor: '#d580ff',
    secondaryColor: '#ffffff',
    attackPctBase: 0.12,
    attackPctPerLv: 0.08,
    speedPctBase: 0.12,
    speedPctPerLv: 0.03,
    poisePctBase: 0.08,
    poisePctPerLv: 0.05,
    critPctBase: 0.18,
    critPctPerLv: 0.035,
    parryMsBase: 15,
    parryMsPerLv: 5,
    armorPctBase: 0,
    armorPctPerLv: 0.01,
    comboPctBase: 0.24,
    comboPctPerLv: 0.1,
  },
];

export function getFightingStyle(id: FightingStyleId): FightingStyleSpec {
  return FIGHTING_STYLES.find((s) => s.id === id) ?? FIGHTING_STYLES[0];
}

export function getStyleUpgradeCost(spec: FightingStyleSpec, currentLevel: number): number {
  return Math.round(spec.upgradeBaseCost * 1.3 * Math.pow(1.35, Math.max(0, currentLevel - 1)));
}
