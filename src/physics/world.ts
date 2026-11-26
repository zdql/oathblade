import type {
  Body2D,
  Hitbox,
  HitEvent,
  PhysicsConfig,
  PhysicsDebugSnapshot,
  Vec2,
} from './types';
import { clonePhysicsConfig } from './config';
import { circlesOverlap, clampVecToBounds, dist, len, normalize, scale, sub } from './math';
import {
  applyImpulse,
  computeKnockbackVector,
  createIdleDefense,
  evaluateHitResolution,
  isDefenseActive,
} from './combatPhysics';

/**
 * Completely isolated, DOM-free 2.5D combat physics world.
 * Owns fixed-timestep simulation, kinematics, hitstop, arena clamping,
 * body separation, and hitbox/hurtbox resolution.
 */
export class PhysicsWorld {
  public config: PhysicsConfig;
  private bodies = new Map<string, Body2D>();
  private hitboxes: Hitbox[] = [];
  private accumulator = 0;
  private simTime = 0;
  private hitstopTimer = 0;
  private pendingEvents: HitEvent[] = [];
  private nextHitboxSeq = 1;

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = clonePhysicsConfig();
    if (config) {
      this.updateConfig(config);
    }
  }

  public updateConfig(partial: Partial<PhysicsConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      arenaBounds: partial.arenaBounds
        ? { ...partial.arenaBounds }
        : { ...this.config.arenaBounds },
    };
  }

  public reset(): void {
    this.bodies.clear();
    this.hitboxes = [];
    this.accumulator = 0;
    this.simTime = 0;
    this.hitstopTimer = 0;
    this.pendingEvents = [];
  }

  public addBody(body: Body2D): Body2D {
    this.bodies.set(body.id, body);
    return body;
  }

  public getBody(id: string): Body2D | undefined {
    return this.bodies.get(id);
  }

  public removeBody(id: string): void {
    this.bodies.delete(id);
  }

  public getAllBodies(): Body2D[] {
    return Array.from(this.bodies.values());
  }

  public spawnHitbox(
    params: Omit<Hitbox, 'id' | 'hitTargets'> & { id?: string }
  ): Hitbox {
    const hb: Hitbox = {
      ...params,
      id: params.id ?? `hb_${this.nextHitboxSeq++}`,
      hitTargets: new Set<string>(),
    };
    this.hitboxes.push(hb);
    return hb;
  }

  public clearHitboxesForOwner(ownerId: string): void {
    this.hitboxes = this.hitboxes.filter((h) => h.ownerId !== ownerId);
  }

  public triggerHitstop(seconds: number): void {
    this.hitstopTimer = Math.max(this.hitstopTimer, seconds);
  }

  public isInHitstop(): boolean {
    return this.hitstopTimer > 0;
  }

  public getTime(): number {
    return this.simTime;
  }

  /**
   * Apply directional steering acceleration to a body (e.g. WASD input).
   */
  public applyMoveInput(bodyId: string, inputDir: Vec2, accelOverride?: number, dt?: number): void {
    const body = this.bodies.get(bodyId);
    if (!body) return;
    const stepDt = dt ?? this.config.fixedDt;
    const n = normalize(inputDir);
    const accel = accelOverride ?? this.config.playerAccel;
    body.vel.x += n.x * accel * stepDt;
    body.vel.y += n.y * accel * stepDt;

    const speed = len(body.vel);
    if (speed > body.maxSpeed) {
      body.vel.x = (body.vel.x / speed) * body.maxSpeed;
      body.vel.y = (body.vel.y / speed) * body.maxSpeed;
    }
    if (n.x !== 0 || n.y !== 0) {
      body.facing = { x: n.x, y: n.y };
    }
  }

  /**
   * Advance the physics simulation using a fixed-timestep accumulator.
   * Returns all HitEvents generated during this update.
   */
  public step(frameDt: number): HitEvent[] {
    const clampedDt = Math.min(Math.max(frameDt, 0), this.config.maxFrameDt);
    this.accumulator += clampedDt;
    this.pendingEvents = [];

    const fixed = this.config.fixedDt;
    while (this.accumulator >= fixed) {
      this.accumulator -= fixed;
      this.fixedStep(fixed);
    }

    return this.pendingEvents;
  }

  /**
   * Execute a single deterministic fixed physics tick.
   */
  public fixedStep(dt: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.simTime += dt;

    // 1. Update defense timers & integrate body velocities
    for (const body of this.bodies.values()) {
      this.stepDefense(body, dt);

      // Combine voluntary velocity + knockback velocity
      body.pos.x += (body.vel.x + body.knockbackVel.x) * dt;
      body.pos.y += (body.vel.y + body.knockbackVel.y) * dt;

      // Apply exponential friction damping
      const damp = Math.exp(-body.friction * dt);
      body.vel.x *= damp;
      body.vel.y *= damp;

      const kbDamp = Math.exp(-this.config.knockbackDecay * dt);
      body.knockbackVel.x *= kbDamp;
      body.knockbackVel.y *= kbDamp;
      if (Math.hypot(body.knockbackVel.x, body.knockbackVel.y) < 4) {
        body.knockbackVel.x = 0;
        body.knockbackVel.y = 0;
      }

      // 2.5D Z elevation physics
      if (body.z > 0 || body.vz !== 0) {
        body.vz -= this.config.gravityZ * dt;
        body.z += body.vz * dt;
        if (body.z <= 0) {
          body.z = 0;
          body.vz = 0;
        }
      }

      // Clamp to arena bounds
      const bounds = body.bounds ?? this.config.arenaBounds;
      body.pos = clampVecToBounds(body.pos, body.radius, bounds);
    }

    // 2. Soft body-to-body separation so player and boss never overlap awkwardly
    this.resolveSeparations(dt);

    // 3. Update hitboxes & test collisions against opposing hurtboxes
    this.stepHitboxes(dt);
  }

  private stepDefense(body: Body2D, dt: number): void {
    const def = body.defense;
    if (def.mode === 'none') return;
    def.timer += dt;
    if (def.mode === 'dodge') {
      // Sustain dodge dash velocity during active dodge curve
      const progress = def.timer / Math.max(0.01, def.duration);
      const speedMul = Math.max(0.15, 1 - progress * 0.75);
      body.vel.x = def.direction.x * this.config.dodgeSpeed * speedMul;
      body.vel.y = def.direction.y * this.config.dodgeSpeed * speedMul;
    }
    if (def.timer >= def.duration) {
      body.defense = createIdleDefense();
    }
  }

  private resolveSeparations(dt: number): void {
    const list = Array.from(this.bodies.values()).filter((b) => b.solid);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        // Skip separation if either is high in the air (e.g., diving wyvern)
        if (Math.abs(a.z - b.z) > 65) continue;

        const minDist = a.radius + b.radius;
        const d = dist(a.pos, b.pos);
        if (d < minDist) {
          const overlap = minDist - d;
          const dir = d > 1e-4 ? normalize(sub(b.pos, a.pos)) : { x: 0, y: -1 };
          const totalMass = a.mass + b.mass;
          const ratioA = b.mass / totalMass;
          const ratioB = a.mass / totalMass;
          const push = overlap * Math.min(1, this.config.separationStrength * dt * 10);

          a.pos.x -= dir.x * push * ratioA;
          a.pos.y -= dir.y * push * ratioA;
          b.pos.x += dir.x * push * ratioB;
          b.pos.y += dir.y * push * ratioB;

          a.pos = clampVecToBounds(a.pos, a.radius, a.bounds ?? this.config.arenaBounds);
          b.pos = clampVecToBounds(b.pos, b.radius, b.bounds ?? this.config.arenaBounds);
        }
      }
    }
  }

  private stepHitboxes(dt: number): void {
    const surviving: Hitbox[] = [];

    for (const hb of this.hitboxes) {
      // Follow attached owner if specified
      if (hb.attachOffset) {
        const owner = this.bodies.get(hb.ownerId);
        if (owner) {
          hb.pos = {
            x: owner.pos.x + hb.attachOffset.x,
            y: owner.pos.y + hb.attachOffset.y,
          };
        }
      }

      // Check against all opposing faction bodies
      for (const target of this.bodies.values()) {
        if (target.faction === hb.faction) continue;
        if (hb.hitTargets.has(target.id)) continue;
        if (!hb.hitsAirborne && target.z > target.airborneThresholdZ) continue;

        const hurtRadius = target.radius * target.hurtboxScale;
        if (!circlesOverlap(hb.pos, hb.radius, target.pos, hurtRadius)) continue;

        hb.hitTargets.add(target.id);
        const resolution = evaluateHitResolution(target, hb);
        const owner = this.bodies.get(hb.ownerId);
        const ownerPos = owner ? owner.pos : hb.pos;

        let kbVec: Vec2 = { x: 0, y: 0 };
        if (resolution === 'hit') {
          kbVec = computeKnockbackVector(ownerPos, target.pos, hb.direction, hb.knockback, target.mass);
          applyImpulse(target, kbVec);
          if (hb.attackKind === 'quick') this.triggerHitstop(this.config.hitstopQuick);
          else if (hb.attackKind === 'strong') this.triggerHitstop(this.config.hitstopStrong);
          else if (hb.attackKind === 'combo') this.triggerHitstop(this.config.hitstopComboFinisher);
          else this.triggerHitstop(this.config.hitstopBossHit);
        } else if (resolution === 'parried') {
          target.defense.triggered = true;
          this.triggerHitstop(this.config.hitstopParry);
          if (owner) {
            const recoil = computeKnockbackVector(target.pos, owner.pos, scale(hb.direction, -1), 160, owner.mass);
            applyImpulse(owner, recoil);
          }
        } else if (resolution === 'dodged') {
          target.defense.triggered = true;
        } else if (resolution === 'guarded') {
          kbVec = computeKnockbackVector(ownerPos, target.pos, hb.direction, hb.knockback * 0.35, target.mass);
          applyImpulse(target, kbVec);
          this.triggerHitstop(this.config.hitstopQuick);
        }

        const contactPoint = {
          x: (hb.pos.x + target.pos.x) * 0.5,
          y: (hb.pos.y + target.pos.y) * 0.5,
        };

        this.pendingEvents.push({
          hitboxId: hb.id,
          attackerId: hb.ownerId,
          targetId: target.id,
          resolution,
          damage: resolution === 'hit' ? hb.damage : resolution === 'guarded' ? Math.round(hb.damage * 0.15) : 0,
          poiseDamage: resolution === 'hit' ? hb.poiseDamage : resolution === 'guarded' ? Math.round(hb.poiseDamage * 0.25) : 0,
          knockbackVec: kbVec,
          contactPoint,
          attackKind: hb.attackKind,
          tag: hb.tag,
        });
      }

      hb.ttl -= dt;
      if (hb.ttl > 0) {
        surviving.push(hb);
      }
    }

    this.hitboxes = surviving;
  }

  public getDebugSnapshot(): PhysicsDebugSnapshot {
    return {
      time: this.simTime,
      hitstopRemaining: this.hitstopTimer,
      arenaBounds: { ...this.config.arenaBounds },
      bodies: Array.from(this.bodies.values()).map((b) => ({
        id: b.id,
        faction: b.faction,
        x: b.pos.x,
        y: b.pos.y,
        z: b.z,
        radius: b.radius,
        hurtRadius: b.radius * b.hurtboxScale,
        defenseMode: b.defense.mode,
        isInvulnerable: isDefenseActive(b.defense),
      })),
      hitboxes: this.hitboxes.map((h) => ({
        id: h.id,
        faction: h.faction,
        x: h.pos.x,
        y: h.pos.y,
        radius: h.radius,
        parryable: h.parryable,
        tag: h.tag,
      })),
    };
  }
}
