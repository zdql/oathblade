import { describe, expect, it } from 'vitest';
import { ComboEngine } from './index';

describe('ComboEngine', () => {
  it('matches starter Cross-Slash (K -> K -> J)', () => {
    const engine = new ComboEngine();
    expect(engine.pushInput('K', false).matched).toBeNull();
    expect(engine.pushInput('K', false).matched).toBeNull();
    const res = engine.pushInput('J', false);
    expect(res.matched?.id).toBe('cross_slash');
  });

  it('requires active counter window for Steel Riposte (L -> J)', () => {
    const engine = new ComboEngine();
    engine.pushInput('L', false);
    expect(engine.pushInput('J', false).matched).toBeNull();

    engine.resetBuffer();
    engine.pushInput('L', true);
    const res = engine.pushInput('J', true);
    expect(res.matched?.id).toBe('steel_riposte');
  });

  it('allows creating and triggering custom combos', () => {
    const engine = new ComboEngine();
    const custom = engine.registerCustomCombo({
      name: 'Dragon Fang',
      sequence: ['J', 'K', 'J'],
      style: 'lunge',
    });

    expect(engine.isUnlocked(custom.id)).toBe(true);
    engine.pushInput('J', false);
    engine.pushInput('K', false);
    const res = engine.pushInput('J', false);
    expect(res.matched?.name).toBe('Dragon Fang');
    expect(res.matched?.isCustom).toBe(true);
  });

  it('expires input buffer after combo window elapses', () => {
    const engine = new ComboEngine(0.5);
    engine.pushInput('K', false);
    engine.tick(0.6);
    expect(engine.getBuffer()).toHaveLength(0);
  });
});
