import { describe, expect, it } from 'vitest';
import {
  PhysicsWorld,
  createIdleDefense,
  startDodgeDefense,
  startParryDefense,
} from './index';

function makeBody(world: PhysicsWorld, id: string, faction: 'player' | 'boss', x: number, y: number) {
  return world.addBody({
    id,
    faction,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    knockbackVel: { x: 0, y: 0 },
    z: 0,
    vz: 0,
    radius: 28,
    mass: 1,
    facing: { x: 0, y: -1 },
    friction: 10,
    maxSpeed: 300,
    solid: true,
    defense: createIdleDefense(),
    hurtboxScale: 1,
    airborneThresholdZ: 55,
  });
}

describe('Isolated PhysicsWorld', () => {
  it('integrates movement and clamps bodies inside arena bounds', () => {
    const world = new PhysicsWorld();
    const player = makeBody(world, 'player', 'player', 0, 0);

    for (let i = 0; i < 120; i++) {
      world.applyMoveInput('player', { x: 1, y: 0 }, 3000, world.config.fixedDt);
      world.fixedStep(world.config.fixedDt);
    }

    expect(player.pos.x).toBeLessThanOrEqual(world.config.arenaBounds.maxX - player.radius);
    expect(player.pos.x).toBeGreaterThan(250);
  });

  it('resolves parry deflection and triggers hitstop', () => {
    const world = new PhysicsWorld();
    const player = makeBody(world, 'player', 'player', 0, 40);
    makeBody(world, 'boss', 'boss', 0, -40);

    player.defense = startParryDefense(world.config);

    world.spawnHitbox({
      ownerId: 'boss',
      faction: 'boss',
      pos: { x: 0, y: 40 },
      radius: 40,
      ttl: 0.1,
      damage: 25,
      poiseDamage: 20,
      knockback: 200,
      attackKind: 'boss_heavy',
      direction: { x: 0, y: 1 },
      parryable: true,
      hitsAirborne: true,
      tag: 'test_parry',
    });

    const events = world.step(world.config.fixedDt);
    expect(events).toHaveLength(1);
    expect(events[0].resolution).toBe('parried');
    expect(events[0].damage).toBe(0);
    expect(world.isInHitstop()).toBe(true);
  });

  it('grants dodge i-frames against incoming attacks', () => {
    const world = new PhysicsWorld();
    const player = makeBody(world, 'player', 'player', 0, 40);
    makeBody(world, 'boss', 'boss', 0, -40);

    player.defense = startDodgeDefense({ x: 1, y: 0 }, world.config);
    // Advance slightly into i-frame window
    world.fixedStep(0.03);

    world.spawnHitbox({
      ownerId: 'boss',
      faction: 'boss',
      pos: { x: player.pos.x, y: player.pos.y },
      radius: 50,
      ttl: 0.1,
      damage: 25,
      poiseDamage: 20,
      knockback: 200,
      attackKind: 'boss_light',
      direction: { x: 0, y: 1 },
      parryable: true,
      hitsAirborne: true,
      tag: 'test_dodge',
    });

    const events = world.step(world.config.fixedDt);
    expect(events).toHaveLength(1);
    expect(events[0].resolution).toBe('dodged');
    expect(events[0].damage).toBe(0);
  });

  it('simulates 2.5D vertical Z gravity arcs', () => {
    const world = new PhysicsWorld();
    const boss = makeBody(world, 'boss', 'boss', 0, 0);
    boss.vz = 500;

    world.fixedStep(0.1);
    expect(boss.z).toBeGreaterThan(20);

    for (let i = 0; i < 60; i++) {
      world.fixedStep(world.config.fixedDt);
    }
    expect(boss.z).toBe(0);
    expect(boss.vz).toBe(0);
  });
});
