import type { PhysicsConfig } from './types';

/**
 * Single source of truth for all physics & combat-feel parameters.
 * Modify these values (or tweak them live in the Physics Lab drawer via F1)
 * to tune responsiveness, dodge feel, parry generosity, and hitstop crunch.
 */
export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  fixedDt: 1 / 60,
  maxFrameDt: 0.05,
  gravityZ: 1650,

  // Player locomotion in combat arena (world units ~ pixels at 1280x720)
  playerAccel: 2600,
  playerMaxSpeed: 310,
  playerFriction: 11.5,
  playerRadius: 28,

  // Dodge & Parry timings (seconds)
  dodgeSpeed: 640,
  dodgeDuration: 0.28,
  dodgeIFrameStart: 0.02,
  dodgeIFrameEnd: 0.22,
  dodgeCooldown: 0.14,

  parryWindow: 0.22,
  parryRecovery: 0.18,
  parryCooldown: 0.26,
  counterWindowDuration: 0.85,

  // Knockback & body separation
  knockbackDecay: 10.5,
  separationStrength: 9.0,

  // Hitstop freeze durations (seconds)
  hitstopQuick: 0.032,
  hitstopStrong: 0.068,
  hitstopComboFinisher: 0.095,
  hitstopParry: 0.11,
  hitstopBossHit: 0.075,

  // Combat arena floor in world coordinates
  // X: left (-340) to right (+340), Y: near player (+210) to boss backline (-210)
  arenaBounds: {
    minX: -340,
    maxX: 340,
    minY: -200,
    maxY: 215,
  },
};

export function clonePhysicsConfig(cfg: PhysicsConfig = DEFAULT_PHYSICS_CONFIG): PhysicsConfig {
  return {
    ...cfg,
    arenaBounds: { ...cfg.arenaBounds },
  };
}
