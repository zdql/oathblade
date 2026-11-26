import type { BossInstance, BossTemplate, BossTrait, RolledBossStats } from './types';
import { BOSS_TEMPLATES, BOSS_TRAITS } from './templates';

/** Simple deterministic Mulberry32 PRNG for reproducible boss rolls */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollVariance(rng: () => number, range: number): number {
  return 1 + (rng() * 2 - 1) * range;
}

export function generateBossInstance(tierIndex: number, seed?: number): BossInstance {
  const clampedIdx = Math.max(0, Math.min(BOSS_TEMPLATES.length - 1, tierIndex));
  const template: BossTemplate = BOSS_TEMPLATES[clampedIdx];
  const actualSeed = seed ?? Math.floor(Math.random() * 2_000_000_000);
  const rng = createRng(actualSeed);

  // Pick 1 trait for tiers 1-2, 2 distinct traits for tiers 3-5
  const traitCount = template.tier >= 3 ? 2 : 1;
  const pool = [...BOSS_TRAITS];
  const traits: BossTrait[] = [];
  for (let i = 0; i < traitCount && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    traits.push(pool.splice(idx, 1)[0]);
  }

  // Base procedural % variance (±15% HP, ±14% dmg, ±12% speed, ±15% poise, ±16% aggression)
  let hpMul = rollVariance(rng, 0.15);
  let dmgMul = rollVariance(rng, 0.14);
  let spdMul = rollVariance(rng, 0.12);
  let poiseMul = rollVariance(rng, 0.15);
  let aggMul = rollVariance(rng, 0.16);
  let goldMul = 1.0;
  let xpMul = 1.0;

  // Apply trait modifiers
  for (const tr of traits) {
    if (tr.hpMul) hpMul *= tr.hpMul;
    if (tr.damageMul) dmgMul *= tr.damageMul;
    if (tr.speedMul) spdMul *= tr.speedMul;
    if (tr.poiseMul) poiseMul *= tr.poiseMul;
    if (tr.aggressionMul) aggMul *= tr.aggressionMul;
    if (tr.goldMul) goldMul *= tr.goldMul;
    if (tr.xpMul) xpMul *= tr.xpMul;
  }

  // Exponential tier speed escalation: each tier multiplies attack speed by 1.09x
  const tierSpeedEscalation = Math.pow(1.09, template.tier - 1);
  spdMul *= tierSpeedEscalation;

  // Keep attack speed within blistering yet humanly parryable bounds
  spdMul = Math.max(0.88, Math.min(1.65, spdMul));

  // Tougher rolls slightly boost rewards so harder RNG feels exciting
  const difficultyScore = (hpMul + dmgMul + spdMul + poiseMul) / 4;
  const bountyScale = Math.max(0.9, Math.min(1.35, difficultyScore));

  const stats: RolledBossStats = {
    maxHp: Math.round(template.baseHp * hpMul),
    attackDamage: Math.round(template.baseDamage * dmgMul),
    maxPoise: Math.round(template.basePoise * poiseMul),
    attackSpeedMul: Number(spdMul.toFixed(2)),
    moveSpeed: Math.round(template.baseMoveSpeed * (0.5 + spdMul * 0.5)),
    aggression: Number((template.baseAggression * aggMul).toFixed(2)),
    goldReward: Math.round(template.baseGold * goldMul * bountyScale),
    xpReward: Math.round(template.baseXp * xpMul * bountyScale),
    variancePct: {
      hp: Math.round((hpMul - 1) * 100),
      damage: Math.round((dmgMul - 1) * 100),
      speed: Math.round((spdMul - 1) * 100),
      poise: Math.round((poiseMul - 1) * 100),
      aggression: Math.round((aggMul - 1) * 100),
    },
  };

  return {
    template,
    traits,
    stats,
    seed: actualSeed,
  };
}

export function generateGauntletRun(baseSeed?: number): BossInstance[] {
  const rootSeed = baseSeed ?? Math.floor(Math.random() * 2_000_000_000);
  return BOSS_TEMPLATES.map((_, idx) => generateBossInstance(idx, rootSeed + idx * 7919));
}
