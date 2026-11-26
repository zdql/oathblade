import { describe, expect, it } from 'vitest';
import { applyXpGain, createDefaultProgress, getXpForNextLevel } from './progression';

describe('Player Leveling & Skill Points', () => {
  it('requires strictly more XP for later levels', () => {
    let prev = getXpForNextLevel(1);
    for (let lv = 2; lv <= 15; lv++) {
      const next = getXpForNextLevel(lv);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('grants 1 skill point per level gained and preserves remainder XP', () => {
    const p = createDefaultProgress();
    const lv1Need = getXpForNextLevel(1);
    const lv2Need = getXpForNextLevel(2);

    const res = applyXpGain(p, lv1Need + lv2Need + 25);
    expect(res.leveledUp).toBe(true);
    expect(res.levelsGained).toBe(2);
    expect(p.level).toBe(3);
    expect(p.skillPoints).toBe(2);
    expect(p.xp).toBe(25);
  });
});
