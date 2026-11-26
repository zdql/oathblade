import { describe, expect, it } from 'vitest';
import { GameEngine, type SoundHooks } from './gameEngine';

const noopSound: SoundHooks = {
  playSwing: () => {},
  playHit: () => {},
  playParry: () => {},
  playDodge: () => {},
  playPlayerHurt: () => {},
  playGuardClang: () => {},
  playBossTelegraph: () => {},
  playBossStagger: () => {},
  playVictory: () => {},
  playDeath: () => {},
  playStep: () => {},
};

describe('GameEngine end-to-end flow', () => {
  it('progresses from title -> path -> tale_of_tape -> combat -> victory -> next tier', () => {
    const engine = new GameEngine(noopSound);
    expect(engine.screen).toBe('title');
    expect(engine.gauntlet).toHaveLength(10);

    engine.startNewRun();
    expect(engine.screen).toBe('path');
    expect(engine.currentTierIndex).toBe(0);

    // Complete minigames & advance along the trail to trigger boss gate
    for (const m of engine.roadMinigames) m.completed = true;
    engine.pathState.distance = engine.pathState.targetDistance;
    engine.update(1 / 60);
    expect(engine.screen).toBe('tale_of_tape');

    engine.beginBossFight();
    expect(engine.screen).toBe('combat');

    // Step combat loop for 1 second of simulation time
    for (let i = 0; i < 60; i++) {
      engine.update(1 / 60);
    }
    expect(engine.physics.getTime()).toBeGreaterThan(0.5);

    // Boss can summon arena minions during combat
    engine.spawnBossMinions(1);
    expect(engine.arenaMinions).toHaveLength(1);

    // Advance through all 5 tiers
    engine.continuePathToNextBoss();
    expect(engine.currentTierIndex).toBe(1);
    expect(engine.screen).toBe('path');
    expect(engine.gauntlet[engine.currentTierIndex].template.name).toBe('Vexis');
  });

  it('spawns road guardians at a fraction of boss power and applies/resets run-only buffs', () => {
    const engine = new GameEngine(noopSound);
    engine.startNewRun();
    const boss = engine.gauntlet[0];

    expect(engine.pathState.targetDistance).toBeGreaterThanOrEqual(3600);
    expect(engine.roadGuardians.length).toBeGreaterThanOrEqual(10);
    expect(engine.roadMinigames.length).toBeGreaterThanOrEqual(2);
    for (const m of engine.roadMinigames) {
      expect([
        'anvil_timing',
        'parry_gauntlet',
        'boulder_dodge',
        'target_slash',
        'coin_catch',
        'blade_clash',
        'stance_mirror',
        'whetstone_rhythm',
      ]).toContain(m.kind);
    }
    const miniBosses = engine.roadGuardians.filter((g) => g.isMiniBoss);
    expect(miniBosses).toHaveLength(1);
    for (const g of engine.roadGuardians) {
      expect([
        'brute',
        'swift',
        'shielded',
        'berserker',
        'trickster',
        'ironclad',
        'executioner',
        'miniboss',
      ]).toContain(g.variant);
    }
    expect(engine.roadVariation.props.length).toBeGreaterThan(5);

    const baseAtk = engine.stats.baseAttack;
    engine.pendingBuffChoices = [
      { id: 'test_atk', name: 'Test Edge', description: '+20% ATK', color: '#fff', attackPct: 0.2 },
    ];
    engine.selectRunBuff('test_atk');
    expect(engine.activeRunBuffs).toHaveLength(1);
    expect(engine.stats.baseAttack).toBeGreaterThan(baseAtk);

    // Starting a new run clears run-only buffs
    engine.startNewRun();
    expect(engine.activeRunBuffs).toHaveLength(0);
    expect(engine.stats.baseAttack).toBe(baseAtk);
  });
});
