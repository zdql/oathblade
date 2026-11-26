export type BiomeId =
  | 'forest'
  | 'marsh'
  | 'ruins'
  | 'gorge'
  | 'citadel'
  | 'tundra'
  | 'sanctum'
  | 'eclipse'
  | 'stormpeak'
  | 'elysium';

export type BossVisualId =
  | 'troll'
  | 'stalker'
  | 'ogre_knight'
  | 'wyvern'
  | 'sovereign'
  | 'behemoth'
  | 'valkyrie'
  | 'titan'
  | 'colossus'
  | 'eternal';

export type BossAttackSide = 'left' | 'right' | 'center' | 'feint_left_to_right' | 'aerial' | 'guard';

export interface BossMoveStep {
  /** Windup duration in seconds before hitbox spawns */
  windup: number;
  /** Active hitbox duration in seconds */
  active: number;
  /** Recovery duration after this hit (or gap before next chain step) */
  recovery: number;
  /** Attack direction / visual telegraph side */
  side: BossAttackSide;
  /** Damage multiplier relative to boss's rolled attackDamage */
  damageMul: number;
  /** Hitbox radius */
  hitboxRadius: number;
  /** Forward lunge speed when strike triggers */
  lungeSpeed: number;
  /** Knockback applied to player */
  knockback: number;
  /** Whether player can parry with L */
  parryable: boolean;
  /** Vertical jump velocity (for pounces / wyvern aerial dives) */
  jumpVz?: number;
  /** If true, boss enters armored guard stance during this step */
  guardStance?: boolean;
  /** If true, boss is taunting/vulnerable and taking a hit deals 2x poise */
  vulnerableTaunt?: boolean;
  /** Short telegraph cue text/hint */
  tellLabel: string;
}

export interface BossMove {
  id: string;
  name: string;
  minPhase: 1 | 2;
  weight: number;
  steps: BossMoveStep[];
}

export interface BossTrait {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  hpMul?: number;
  damageMul?: number;
  speedMul?: number;
  poiseMul?: number;
  aggressionMul?: number;
  goldMul?: number;
  xpMul?: number;
}

export interface BossTemplate {
  tier: number;
  id: string;
  name: string;
  title: string;
  biome: BiomeId;
  visualId: BossVisualId;
  fightingStyle: string;
  lore: string;
  /** Base attributes before procedural % roll */
  baseHp: number;
  baseDamage: number;
  basePoise: number;
  baseMoveSpeed: number;
  baseAggression: number; // 1.0 = normal pause, higher = faster cadence
  baseGold: number;
  baseXp: number;
  bodyRadius: number;
  mass: number;
  /** Has passive shield mechanic */
  usesShield: boolean;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    eye: string;
    weapon: string;
  };
  moves: BossMove[];
}

export interface RolledBossStats {
  maxHp: number;
  attackDamage: number;
  maxPoise: number;
  attackSpeedMul: number;
  moveSpeed: number;
  aggression: number;
  goldReward: number;
  xpReward: number;
  /** Percentage deltas vs base template for Tale of the Tape UI */
  variancePct: {
    hp: number;
    damage: number;
    speed: number;
    poise: number;
    aggression: number;
  };
}

export interface BossInstance {
  template: BossTemplate;
  traits: BossTrait[];
  stats: RolledBossStats;
  seed: number;
}
