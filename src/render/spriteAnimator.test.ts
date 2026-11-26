import { describe, expect, it } from 'vitest';
import {
  BOSS_ANIM_CLIPS,
  PLAYER_ANIM_CLIPS,
  SpriteAnimator,
  VFX_ANIM_CLIPS,
} from './spriteAnimator';
import { PixelVfxManager } from './vfxSprites';

describe('Pokemon-style SpriteAnimator & 10-25 Frame Event Guarantee', () => {
  it('ensures every player, boss, and VFX event clip has between 10 and 25 frames', () => {
    for (const [name, clip] of Object.entries(PLAYER_ANIM_CLIPS)) {
      expect(clip.frames, `player:${name}`).toBeGreaterThanOrEqual(10);
      expect(clip.frames, `player:${name}`).toBeLessThanOrEqual(25);
    }
    for (const [name, clip] of Object.entries(BOSS_ANIM_CLIPS)) {
      expect(clip.frames, `boss:${name}`).toBeGreaterThanOrEqual(10);
      expect(clip.frames, `boss:${name}`).toBeLessThanOrEqual(25);
    }
    for (const [name, clip] of Object.entries(VFX_ANIM_CLIPS)) {
      expect(clip.frames, `vfx:${name}`).toBeGreaterThanOrEqual(10);
      expect(clip.frames, `vfx:${name}`).toBeLessThanOrEqual(25);
    }
  });

  it('plays through all frames of an event cleanly', () => {
    const anim = new SpriteAnimator(PLAYER_ANIM_CLIPS, 'quick_slash');
    const seen = new Set<number>();
    const totalFrames = PLAYER_ANIM_CLIPS.quick_slash.frames;

    for (let i = 0; i < 60; i++) {
      seen.add(anim.frame);
      anim.update(1 / 60);
    }

    expect(seen.size).toBeGreaterThanOrEqual(10);
    expect(anim.frame).toBe(totalFrames - 1);
    expect(anim.isFinished()).toBe(true);
  });

  it('steps PixelVfxManager multi-frame effects to completion', () => {
    const vfx = new PixelVfxManager();
    vfx.spawn('parry_spark', 0, 0, 20, '#ffd54f');
    expect(vfx.effects).toHaveLength(1);

    for (let i = 0; i < 60; i++) {
      vfx.update(1 / 60);
    }
    expect(vfx.effects).toHaveLength(0);
  });
});
