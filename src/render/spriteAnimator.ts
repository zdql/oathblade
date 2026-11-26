/**
 * Explicit frame-based sprite animation specification & playback controller.
 * Every distinct gameplay event is guaranteed 12 to 24 discrete frames!
 */

export type PlayerAnimEvent =
  | 'idle'
  | 'walk'
  | 'quick_slash'
  | 'strong_cleave'
  | 'combo_finisher'
  | 'parry_stance'
  | 'parry_success'
  | 'dodge_roll'
  | 'hurt'
  | 'victory_pose'
  | 'death';

export type BossAnimEvent =
  | 'intro'
  | 'idle'
  | 'windup'
  | 'attack'
  | 'recovery'
  | 'guard'
  | 'stagger'
  | 'phase_shift'
  | 'hurt'
  | 'defeated';

export type VfxAnimEvent =
  | 'slash_arc'
  | 'heavy_cleave'
  | 'combo_burst'
  | 'parry_spark'
  | 'dodge_afterimage'
  | 'impact_hit'
  | 'guard_clang'
  | 'stagger_burst'
  | 'phase_nova'
  | 'shrine_heal';

export interface AnimClipSpec {
  frames: number;
  fps: number;
  loop: boolean;
}

export const PLAYER_ANIM_CLIPS: Record<PlayerAnimEvent, AnimClipSpec> = {
  idle: { frames: 16, fps: 12, loop: true },
  walk: { frames: 16, fps: 18, loop: true },
  quick_slash: { frames: 14, fps: 38, loop: false },
  strong_cleave: { frames: 18, fps: 32, loop: false },
  combo_finisher: { frames: 22, fps: 36, loop: false },
  parry_stance: { frames: 14, fps: 34, loop: false },
  parry_success: { frames: 18, fps: 30, loop: false },
  dodge_roll: { frames: 14, fps: 44, loop: false },
  hurt: { frames: 14, fps: 34, loop: false },
  victory_pose: { frames: 20, fps: 16, loop: true },
  death: { frames: 20, fps: 18, loop: false },
};

export const BOSS_ANIM_CLIPS: Record<BossAnimEvent, AnimClipSpec> = {
  intro: { frames: 20, fps: 24, loop: false },
  idle: { frames: 16, fps: 12, loop: true },
  windup: { frames: 16, fps: 24, loop: false },
  attack: { frames: 14, fps: 36, loop: false },
  recovery: { frames: 14, fps: 20, loop: false },
  guard: { frames: 14, fps: 16, loop: true },
  stagger: { frames: 18, fps: 14, loop: true },
  phase_shift: { frames: 24, fps: 24, loop: false },
  hurt: { frames: 12, fps: 36, loop: false },
  defeated: { frames: 24, fps: 18, loop: false },
};

export const VFX_ANIM_CLIPS: Record<VfxAnimEvent, AnimClipSpec> = {
  slash_arc: { frames: 12, fps: 42, loop: false },
  heavy_cleave: { frames: 16, fps: 38, loop: false },
  combo_burst: { frames: 20, fps: 36, loop: false },
  parry_spark: { frames: 16, fps: 34, loop: false },
  dodge_afterimage: { frames: 12, fps: 36, loop: false },
  impact_hit: { frames: 12, fps: 40, loop: false },
  guard_clang: { frames: 14, fps: 36, loop: false },
  stagger_burst: { frames: 16, fps: 28, loop: false },
  phase_nova: { frames: 22, fps: 26, loop: false },
  shrine_heal: { frames: 18, fps: 22, loop: false },
};

export class SpriteAnimator<TEvent extends string> {
  private clips: Record<TEvent, AnimClipSpec>;
  public currentEvent: TEvent;
  public frame = 0;
  private elapsed = 0;
  /** Optional override duration to stretch/compress all N frames evenly over an action */
  private customDuration: number | null = null;

  constructor(clips: Record<TEvent, AnimClipSpec>, initialEvent: TEvent) {
    this.clips = clips;
    this.currentEvent = initialEvent;
  }

  public play(event: TEvent, forceRestart = false, durationOverride?: number): void {
    if (this.currentEvent === event && !forceRestart) {
      if (durationOverride !== undefined) this.customDuration = durationOverride;
      return;
    }
    this.currentEvent = event;
    this.frame = 0;
    this.elapsed = 0;
    this.customDuration = durationOverride ?? null;
  }

  public getClip(): AnimClipSpec {
    return this.clips[this.currentEvent];
  }

  public getProgress(): number {
    const clip = this.getClip();
    return clip.frames <= 1 ? 1 : this.frame / (clip.frames - 1);
  }

  public isFinished(): boolean {
    const clip = this.getClip();
    return !clip.loop && this.frame >= clip.frames - 1;
  }

  public update(dt: number): void {
    const clip = this.getClip();
    this.elapsed += dt;
    const totalDuration = this.customDuration ?? clip.frames / clip.fps;
    const safeDuration = Math.max(0.05, totalDuration);
    const rawFrame = Math.floor((this.elapsed / safeDuration) * clip.frames);

    if (clip.loop) {
      this.frame = ((rawFrame % clip.frames) + clip.frames) % clip.frames;
    } else {
      this.frame = Math.min(clip.frames - 1, Math.max(0, rawFrame));
    }
  }
}
