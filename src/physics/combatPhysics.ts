import type { Body2D, DefenseWindow, Hitbox, HitResolution, PhysicsConfig, Vec2 } from './types';
import { normalize, scale, sub } from './math';

export function createIdleDefense(): DefenseWindow {
  return {
    mode: 'none',
    timer: 0,
    duration: 0,
    iFrameStart: 0,
    iFrameEnd: 0,
    direction: { x: 0, y: 0 },
    triggered: false,
  };
}

export function startDodgeDefense(direction: Vec2, config: PhysicsConfig): DefenseWindow {
  const dir = normalize(direction);
  return {
    mode: 'dodge',
    timer: 0,
    duration: config.dodgeDuration,
    iFrameStart: config.dodgeIFrameStart,
    iFrameEnd: config.dodgeIFrameEnd,
    direction: dir.x === 0 && dir.y === 0 ? { x: 0, y: 1 } : dir,
    triggered: false,
  };
}

export function startParryDefense(config: PhysicsConfig, bonusWindow = 0): DefenseWindow {
  const totalWindow = config.parryWindow + bonusWindow;
  return {
    mode: 'parry',
    timer: 0,
    duration: totalWindow + config.parryRecovery,
    iFrameStart: 0,
    iFrameEnd: totalWindow,
    direction: { x: 0, y: -1 },
    triggered: false,
  };
}

export function isDefenseActive(def: DefenseWindow): boolean {
  if (def.mode === 'none') return false;
  return def.timer >= def.iFrameStart && def.timer <= def.iFrameEnd;
}

export function evaluateHitResolution(target: Body2D, hitbox: Hitbox): HitResolution {
  const def = target.defense;
  if (def.mode === 'parry' && isDefenseActive(def) && hitbox.parryable) {
    return 'parried';
  }
  if (def.mode === 'dodge' && isDefenseActive(def)) {
    return 'dodged';
  }
  if (def.mode === 'guard' && hitbox.attackKind !== 'boss_unblockable') {
    return 'guarded';
  }
  return 'hit';
}

export function computeKnockbackVector(
  attackerPos: Vec2,
  targetPos: Vec2,
  hitboxDir: Vec2,
  magnitude: number,
  targetMass: number
): Vec2 {
  const away = normalize(sub(targetPos, attackerPos));
  const blended = normalize({
    x: away.x * 0.65 + hitboxDir.x * 0.35,
    y: away.y * 0.65 + hitboxDir.y * 0.35,
  });
  const effectiveMag = magnitude / Math.max(0.4, targetMass);
  return scale(blended, effectiveMag);
}

export function applyImpulse(body: Body2D, impulse: Vec2): void {
  body.knockbackVel.x += impulse.x;
  body.knockbackVel.y += impulse.y;
}

export function applyLunge(body: Body2D, dir: Vec2, speed: number, verticalPop = 0): void {
  const n = normalize(dir);
  body.vel.x = n.x * speed;
  body.vel.y = n.y * speed;
  if (verticalPop > 0) {
    body.vz = Math.max(body.vz, verticalPop);
  }
}
