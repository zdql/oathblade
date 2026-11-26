export type ComboInput = 'K' | 'J' | 'L';

export type ComboVisualStyle = 'slash' | 'sunder' | 'whirlwind' | 'lunge' | 'breaker' | 'riposte';

export interface ComboDefinition {
  id: string;
  name: string;
  description: string;
  sequence: ComboInput[];
  /** XP cost to unlock in Sanctuary (0 = unlocked by default) */
  xpCost: number;
  /** Damage multiplier applied to player's base attack power */
  damageMultiplier: number;
  /** Poise/stagger damage dealt */
  poiseDamage: number;
  /** Stamina cost of the finisher trigger */
  staminaCost: number;
  /** Forward lunge speed applied via physics engine */
  lungeSpeed: number;
  /** Hitbox radius for the finisher */
  hitboxRadius: number;
  /** Knockback impulse */
  knockback: number;
  /** Whether this combo shatters boss shields / guard stances */
  guardBreak: boolean;
  /** Requires active counter window (from recent parry/dodge) if sequence starts with L */
  requiresCounterWindow?: boolean;
  visualStyle: ComboVisualStyle;
  accentColor: string;
  isCustom?: boolean;
}

export interface CustomComboDraft {
  name: string;
  sequence: ComboInput[];
  style: ComboVisualStyle;
}

export interface ComboMatchResult {
  matched: ComboDefinition | null;
  /** Combos that currently share the active input prefix (for HUD hints) */
  candidates: ComboDefinition[];
  buffer: ComboInput[];
}
