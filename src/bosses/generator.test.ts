import { describe, expect, it } from 'vitest';
import { BOSS_TEMPLATES, generateBossInstance, generateGauntletRun } from './index';

describe('Procedural Boss Generator & 10-Tier Gauntlet', () => {
  it('defines all 10 escalating fantasy bosses in succession', () => {
    expect(BOSS_TEMPLATES).toHaveLength(10);
    expect(BOSS_TEMPLATES.map((b) => b.name)).toEqual([
      'Brambleback',
      'Vexis',
      'Ironjaw',
      'Skarrath',
      'Malakor',
      'Frostmaw',
      'Nyxara',
      'Vaelkor',
      'Kaelthas',
      'Aurelion',
    ]);
    for (let i = 1; i < BOSS_TEMPLATES.length; i++) {
      expect(BOSS_TEMPLATES[i].baseHp).toBeGreaterThan(BOSS_TEMPLATES[i - 1].baseHp);
      expect(BOSS_TEMPLATES[i].baseDamage).toBeGreaterThan(BOSS_TEMPLATES[i - 1].baseDamage);
    }
    // Every single boss has 3 unique signature Area Attacks!
    for (const tpl of BOSS_TEMPLATES) {
      const areaMoves = tpl.moves.filter((m) => m.steps.some((s) => Boolean(s.areaAttack)));
      expect(areaMoves.length, `${tpl.name} unique area attacks`).toBeGreaterThanOrEqual(3);
    }
  });

  it('rolls procedural attribute variance and traits per seed', () => {
    const runA = generateGauntletRun(101);
    const runB = generateGauntletRun(99999);

    expect(runA).toHaveLength(10);
    expect(runA[0].traits.length).toBeGreaterThanOrEqual(1);
    expect(runA[2].traits.length).toBe(2);

    // Different seeds should produce different rolled stats across the 5 bosses
    const hpDiffs = runA.filter((b, i) => b.stats.maxHp !== runB[i].stats.maxHp);
    expect(hpDiffs.length).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed', () => {
    const a = generateBossInstance(4, 424242);
    const b = generateBossInstance(4, 424242);
    expect(a.stats).toEqual(b.stats);
    expect(a.traits.map((t) => t.id)).toEqual(b.traits.map((t) => t.id));
  });
});
