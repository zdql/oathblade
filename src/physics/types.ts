export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PhysicsConfig {
  /** Fixed simulation step in seconds (default 1/60) */
  fixedDt: number;
  /** Maximum frame dt to prevent spiral of death */
  maxFrameDt: number;
  /** Gravity for 2.5D vertical arcs (leaps, wyvern dives, stagger hops) */
  gravityZ: number;

  // Player movement
  playerAccel: number;
  playerMaxSpeed: number;
  playerFriction: number;
  playerRadius: number;

  // Dodge & Parry timings (seconds)
  dodgeSpeed: number;
  dodgeDuration: number;
  dodgeIFrameStart: number;
  dodgeIFrameEnd: number;
  dodgeCooldown: number;

  parryWindow: number;
  parryRecovery: number;
  parryCooldown: number;
  counterWindowDuration: number;

  // Knockback & separation
  knockbackDecay: number;
  separationStrength: number;

  // Hitstop freeze frames (seconds)
  hitstopQuick: number;
  hitstopStrong: number;
  hitstopComboFinisher: number;
  hitstopParry: number;
  hitstopBossHit: number;

  // Arena bounds in logical combat space (-1..1 normalized or world pixels)
  arenaBounds: Bounds2D;
}

export type Faction = 'player' | 'boss';

export type DefenseMode = 'none' | 'dodge' | 'parry' | 'guard';

export interface DefenseWindow {
  mode: DefenseMode;
  timer: number;
  duration: number;
  iFrameStart: number;
  iFrameEnd: number;
  direction: Vec2;
  /** True if this parry/dodge already triggered a counter this window */
  triggered: boolean;
}

export interface Body2D {
  id: string;
  faction: Faction;
  pos: Vec2;
  vel: Vec2;
  knockbackVel: Vec2;
  /** 2.5D elevation above the arena floor */
  z: number;
  vz: number;
  radius: number;
  mass: number;
  facing: Vec2;
  friction: number;
  maxSpeed: number;
  /** Optional custom bounds override */
  bounds?: Bounds2D;
  /** Whether body participates in soft separation */
  solid: boolean;
  /** Current defensive state evaluated by physics on incoming hits */
  defense: DefenseWindow;
  /** Hurtbox radius multiplier (e.g. shrinks slightly during crouch/dodge) */
  hurtboxScale: number;
  /** Whether currently airborne / untargetable by ground sweeps */
  airborneThresholdZ: number;
}

export type AttackArcType = 'circle' | 'cone' | 'sweep_left' | 'sweep_right' | 'overhead' | 'thrust';

export interface Hitbox {
  id: string;
  ownerId: string;
  faction: Faction;
  /** World-space center of the hitbox */
  pos: Vec2;
  /** Radius of hit circle */
  radius: number;
  /** Optional offset from owner position if attached */
  attachOffset?: Vec2;
  /** Remaining active lifetime in seconds */
  ttl: number;
  /** Attack metadata forwarded on collision */
  damage: number;
  poiseDamage: number;
  knockback: number;
  attackKind: 'quick' | 'strong' | 'combo' | 'boss_light' | 'boss_heavy' | 'boss_unblockable';
  /** Direction vector of the strike (used for directional dodge bonus & knockback) */
  direction: Vec2;
  /** Whether a parry can deflect this strike */
  parryable: boolean;
  /** Whether this strike hits airborne targets */
  hitsAirborne: boolean;
  /** Label for telemetry / combo tracking */
  tag: string;
  /** IDs of bodies already struck by this hitbox instance */
  hitTargets: Set<string>;
}

export type HitResolution = 'hit' | 'parried' | 'dodged' | 'guarded';

export interface HitEvent {
  hitboxId: string;
  attackerId: string;
  targetId: string;
  resolution: HitResolution;
  damage: number;
  poiseDamage: number;
  knockbackVec: Vec2;
  contactPoint: Vec2;
  attackKind: Hitbox['attackKind'];
  tag: string;
}

export interface PhysicsDebugSnapshot {
  time: number;
  hitstopRemaining: number;
  bodies: Array<{
    id: string;
    faction: Faction;
    x: number;
    y: number;
    z: number;
    radius: number;
    hurtRadius: number;
    defenseMode: DefenseMode;
    isInvulnerable: boolean;
  }>;
  hitboxes: Array<{
    id: string;
    faction: Faction;
    x: number;
    y: number;
    radius: number;
    parryable: boolean;
    tag: string;
  }>;
  arenaBounds: Bounds2D;
}
