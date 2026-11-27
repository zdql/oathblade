import {
  PhysicsWorld,
  applyLunge,
  createIdleDefense,
  dist,
  normalize,
  scale,
  startDodgeDefense,
  startParryDefense,
  sub,
  type Body2D,
  type HitEvent,
} from '../physics';
import { ComboEngine, type ComboDefinition, type ComboInput } from '../combos';
import { generateGauntletRun, generateRaidBossInstance, type BossInstance, type BossMove, type BossMoveStep } from '../bosses';
import {
  UPGRADE_SPECS,
  applyXpGain,
  computePlayerStats,
  getComboLevelMultiplier,
  isEverythingMaxed,
  loadProgress,
  saveProgress,
  type DerivedPlayerStats,
  type PlayerProgress,
} from './progression';
import { getActiveSwordPalette } from '../render/playerPixelSprite';
import { EffectsManager } from './effects';
import { InputManager } from './input';
import {
  BOSS_ANIM_CLIPS,
  PLAYER_ANIM_CLIPS,
  SpriteAnimator,
  type BossAnimEvent,
  type PlayerAnimEvent,
} from '../render/spriteAnimator';
import { PixelVfxManager } from '../render/vfxSprites';
import type { ActiveBossAreaAttack } from '../render/bossAreaRenderer';
import {
  createMinigameOfKind,
  generateRoadHealthPacks,
  generateRoadMinigames,
  generateRoadRaidPortal,
  generateRoadTreasureChests,
  generateRoadVariation,
  rollRunBuffChoices,
  spawnRoadGuardians,
  type RoadGuardian,
  type RoadHealthPack,
  type RoadMinigameKind,
  type RoadMinigameState,
  type RoadRaidPortal,
  type RoadTreasureChest,
  type RoadVariation,
  type RunBuff,
  type StanceDir,
} from './runContent';
import { getFightingStyle } from './fightingStyles';

export type GameScreen =
  | 'title'
  | 'path'
  | 'raid_prompt'
  | 'tale_of_tape'
  | 'combat'
  | 'victory_boss'
  | 'victory_raid'
  | 'victory_run'
  | 'run_summary'
  | 'sanctuary'
  | 'minigame_portal'
  | 'minigame_arcade';

export type PlayerActionState =
  | 'idle'
  | 'windup'
  | 'active'
  | 'recovery'
  | 'dodge'
  | 'dash'
  | 'parry'
  | 'hurt'
  | 'dead';

export type BossActionState =
  | 'intro'
  | 'neutral'
  | 'windup'
  | 'active'
  | 'recovery'
  | 'guarding'
  | 'staggered'
  | 'phase_shift'
  | 'defeated';

export interface PlayerCombatState {
  hp: number;
  maxHp: number;
  gritShield: number;
  stamina: number;
  maxStamina: number;
  state: PlayerActionState;
  stateTimer: number;
  stateDuration: number;
  attackKind: 'quick' | 'strong' | 'combo' | null;
  activeCombo: ComboDefinition | null;
  hitboxSpawned: boolean;
  dodgeCooldown: number;
  dashCooldown: number;
  dashDir: { x: number; y: number };
  dashHitBoss: boolean;
  parryCooldown: number;
  quickAttackCooldown: number;
  heavyAttackCooldown: number;
  counterWindowTimer: number;
  comboCount: number;
  comboDecayTimer: number;
  lastComboBanner: { name: string; color: string; timer: number } | null;
  /** Facing angle for blade rendering */
  swingAngle: number;
  swingDir: number;
  /** Candidate combo hints from ComboEngine */
  comboHints: ComboDefinition[];
  inputBuffer: ComboInput[];
}

export interface BossCombatState {
  instance: BossInstance;
  hp: number;
  maxHp: number;
  poise: number;
  maxPoise: number;
  phase: 1 | 2;
  phaseShifted: boolean;
  state: BossActionState;
  stateTimer: number;
  stateDuration: number;
  currentMove: BossMove | null;
  stepIndex: number;
  hitboxSpawned: boolean;
  decisionCooldown: number;
  strafeDir: number;
  strafeTimer: number;
  tellLabel: string;
  flashTimer: number;
  isShielding: boolean;
  /** Counts greedy hits landed while boss is braced in neutral -> triggers instant retaliation! */
  spamHitsTaken: number;
}

export interface PathState {
  /** Player X across the path (-260..260) */
  playerX: number;
  /** Forward distance along the current biome trail (0..1000) */
  distance: number;
  targetDistance: number;
  walkCycle: number;
  facingX: number;
  shrineHealed: boolean;
}

export interface RunSummary {
  tierReached: number;
  bossesDefeatedThisRun: number;
  guardiansSlainThisRun: number;
  minigamesWonThisRun: number;
  goldEarnedThisRun: number;
  xpEarnedThisRun: number;
  levelsGainedThisRun: number;
  outcome: 'in_progress' | 'defeat' | 'victory';
  lastBossReward?: { gold: number; xp: number; bossName: string };
  lastRaidReward?: {
    bossName: string;
    gold: number;
    xp: number;
    skillPoints: number;
    skillCapUpgradeAvailable: boolean;
    skillCapUpgradeClaimed: boolean;
    upgradedSkillName?: string;
    upgradedSkillNewMax?: number;
  };
}

export interface SoundHooks {
  playSwing(heavy: boolean): void;
  playHit(heavy: boolean, isCombo: boolean): void;
  playParry(): void;
  playDodge(): void;
  playPlayerHurt(): void;
  playGuardClang(): void;
  playBossTelegraph(): void;
  playBossStagger(): void;
  playVictory(): void;
  playDeath(): void;
  playStep(): void;
}

export class GameEngine {
  public screen: GameScreen = 'title';
  public physics: PhysicsWorld;
  public combos: ComboEngine;
  public effects: EffectsManager;
  public vfx: PixelVfxManager;
  public playerAnim: SpriteAnimator<PlayerAnimEvent>;
  public bossAnim: SpriteAnimator<BossAnimEvent>;
  public input: InputManager;
  public progress: PlayerProgress;
  public stats: DerivedPlayerStats;
  public gauntlet: BossInstance[] = [];
  public currentTierIndex = 0;

  public playerBody!: Body2D;
  public bossBody!: Body2D;
  public player!: PlayerCombatState;
  public boss!: BossCombatState;
  public pathState: PathState;
  public roadVariation!: RoadVariation;
  public roadGuardians: RoadGuardian[] = [];
  public roadHealthPacks: RoadHealthPack[] = [];
  public roadChests: RoadTreasureChest[] = [];
  public roadRaidPortal: RoadRaidPortal | null = null;
  public pendingRaidBoss: BossInstance | null = null;
  public isRaidFight = false;
  public roadMinigames: RoadMinigameState[] = [];
  public activeRoadMinigame: RoadMinigameState | null = null;
  public arcadeMode = false;
  public portalTimer = 0;
  public arcadeResult: {
    kind: RoadMinigameKind;
    title: string;
    won: boolean;
    score: number;
    targetScore: number;
  } | null = null;
  public minigameLaneCooldown = 0;
  /** Minions dynamically summoned by bosses during combat! */
  public arenaMinions: Array<RoadGuardian & { y: number }> = [];
  public arenaHealthPacks: Array<{ id: string; x: number; y: number; healPct: number; life: number }> = [];
  public activeAreaAttacks: ActiveBossAreaAttack[] = [];
  public bossSummonCooldown = 7.5;
  public petAttackTimer = 2.4;
  public petAttackFlash = 0;
  public pathAttackCooldown = 0;
  public pathHeavyCooldown = 0;
  public pathDashTimer = 0;
  public pathDashCooldown = 0;
  public pathDashDirX = 0;
  public pathDefenseTimer = 0;
  public pathDefenseMode: 'none' | 'parry' | 'dodge' = 'none';
  public activeRunBuffs: RunBuff[] = [];
  public pendingBuffChoices: RunBuff[] = [];
  public runSummary: RunSummary;

  public showPhysicsDebug = false;
  public tapeTimer = 0;
  public stepSoundTimer = 0;
  public bossDefeatTimer = 0;
  public bossDefeatBurstStage = 0;
  public playerDeathTimer = 0;
  public uiDirtyCallback?: () => void;
  public sound: SoundHooks;

  constructor(sound: SoundHooks) {
    this.sound = sound;
    this.physics = new PhysicsWorld();
    this.combos = new ComboEngine();
    this.effects = new EffectsManager();
    this.vfx = new PixelVfxManager();
    this.playerAnim = new SpriteAnimator<PlayerAnimEvent>(PLAYER_ANIM_CLIPS, 'idle');
    this.bossAnim = new SpriteAnimator<BossAnimEvent>(BOSS_ANIM_CLIPS, 'intro');
    this.input = new InputManager();
    this.progress = loadProgress();
    this.combos.setUnlockedIds(this.progress.unlockedComboIds);
    this.combos.loadCustomCombos(this.progress.customCombos);
    this.stats = computePlayerStats(this.progress, this.physics.config.playerMaxSpeed);

    this.pathState = this.createFreshPathState();
    this.runSummary = {
      tierReached: 1,
      bossesDefeatedThisRun: 0,
      guardiansSlainThisRun: 0,
      minigamesWonThisRun: 0,
      goldEarnedThisRun: 0,
      xpEarnedThisRun: 0,
      levelsGainedThisRun: 0,
      outcome: 'in_progress',
    };

    this.gauntlet = generateGauntletRun();
    this.setupRoadForCurrentTier();
    this.setupCombatEntities(this.gauntlet[0]);
  }

  private setupRoadForCurrentTier(): void {
    const bossInst = this.gauntlet[this.currentTierIndex] ?? this.gauntlet[0];
    this.pathState = this.createFreshPathState();
    this.roadVariation = generateRoadVariation(bossInst.template.biome, this.pathState.targetDistance);
    this.roadHealthPacks = generateRoadHealthPacks(this.pathState.targetDistance);
    this.roadMinigames = generateRoadMinigames(this.pathState.targetDistance, bossInst.template.tier);
    this.activeRoadMinigame = null;
    this.minigameLaneCooldown = 0;
    this.roadGuardians = spawnRoadGuardians(
      bossInst.template.biome,
      bossInst.stats.maxHp,
      bossInst.stats.attackDamage,
      bossInst.stats.goldReward,
      bossInst.stats.xpReward,
      this.pathState.targetDistance,
      bossInst.template.tier,
      this.stats.baseAttack
    );
    this.roadChests = generateRoadTreasureChests(
      this.roadGuardians,
      bossInst.stats.goldReward,
      bossInst.stats.xpReward
    );
    this.roadRaidPortal = generateRoadRaidPortal(this.pathState.targetDistance, bossInst.template.tier);
    this.pendingRaidBoss = this.roadRaidPortal ? generateRaidBossInstance(bossInst) : null;
    this.isRaidFight = false;
    this.pathAttackCooldown = 0;
    this.pathDashTimer = 0;
    this.pathDashCooldown = 0;
    this.pathDashDirX = 0;
    this.pathDefenseTimer = 0;
    this.pathDefenseMode = 'none';
  }

  private createFreshPathState(): PathState {
    return {
      playerX: 0,
      distance: 0,
      targetDistance: 3800,
      walkCycle: 0,
      facingX: 0,
      shrineHealed: false,
    };
  }

  public notifyUI(): void {
    if (this.uiDirtyCallback) this.uiDirtyCallback();
  }

  public syncStatsFromProgress(): void {
    this.combos.setUnlockedIds(this.progress.unlockedComboIds);
    this.combos.loadCustomCombos(this.progress.customCombos);
    const base = computePlayerStats(this.progress, this.physics.config.playerMaxSpeed);

    // Apply run-only boss buffs on top of persistent Sanctuary upgrades
    let hpPct = 0;
    let atkPct = 0;
    let stamRegenPct = 0;
    let parryMs = 0;
    let counterPct = 0;
    let movePct = 0;
    let poisePct = 0;
    for (const buff of this.activeRunBuffs) {
      if (buff.hpPct) hpPct += buff.hpPct;
      if (buff.attackPct) atkPct += buff.attackPct;
      if (buff.staminaRegenPct) stamRegenPct += buff.staminaRegenPct;
      if (buff.parryBonusMs) parryMs += buff.parryBonusMs;
      if (buff.counterPct) counterPct += buff.counterPct;
      if (buff.moveSpeedPct) movePct += buff.moveSpeedPct;
      if (buff.poiseBreakPct) poisePct += buff.poiseBreakPct;
    }

    this.stats = {
      ...base,
      maxHp: Math.round(base.maxHp * (1 + hpPct)),
      baseAttack: Math.round(base.baseAttack * (1 + atkPct)),
      staminaRegen: base.staminaRegen * (1 + stamRegenPct),
      parryWindowBonus: base.parryWindowBonus + parryMs / 1000,
      counterMultiplier: base.counterMultiplier * (1 + counterPct),
      moveSpeed: Math.round(base.moveSpeed * (1 + movePct)),
      poiseBreakMultiplier: base.poiseBreakMultiplier * (1 + poisePct),
    };

    if (this.player) {
      this.player.maxHp = this.stats.maxHp;
      this.player.hp = Math.min(this.player.hp, this.stats.maxHp);
    }

    saveProgress(this.progress);
    this.notifyUI();
  }

  public getComboDamageBonusMultiplier(): number {
    return (
      this.stats.comboDamageMultiplier *
      (1 + this.activeRunBuffs.reduce((sum, b) => sum + (b.comboDmgPct ?? 0), 0))
    );
  }

  public getBountyBonusMultiplier(): number {
    return (
      this.stats.bountyMultiplier *
      (1 + this.activeRunBuffs.reduce((sum, b) => sum + (b.bountyPct ?? 0), 0))
    );
  }

  private awardGold(amount: number, fromX = 640, fromY = 340): number {
    if (amount <= 0) return 0;
    const scaled = Math.max(1, Math.round(amount * 0.75));
    this.progress.gold += scaled;
    this.runSummary.goldEarnedThisRun += scaled;
    this.effects.spawnGoldGain(scaled, fromX, fromY);
    return scaled;
  }

  private awardXp(amount: number, fromX = 640, fromY = 374): number {
    if (amount <= 0) return 0;
    const scaled = Math.max(1, Math.round(amount * 1.5 * 1.5));
    this.runSummary.xpEarnedThisRun += scaled;
    const res = applyXpGain(this.progress, scaled);
    this.effects.spawnXpGain(scaled, fromX, fromY);
    if (res.leveledUp) {
      this.runSummary.levelsGainedThisRun += res.levelsGained;
      this.effects.spawnLevelUp(res.newLevel);
      this.sound.playVictory();
    }
    return scaled;
  }

  private healPlayer(amount: number, label?: string): number {
    if (amount <= 0 || this.player.hp >= this.player.maxHp) return 0;
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    const actual = this.player.hp - before;
    if (actual > 0) {
      this.effects.spawnHealFeedback(actual, 190, 598);
      if (label && this.screen === 'combat') {
        this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 72, `+${actual} HP`, '#69f0ae', 0.95, 0.75);
      }
    }
    return actual;
  }

  private applyPlayerIncomingDamage(rawDmg: number): number {
    const mitigated = Math.max(1, Math.round(rawDmg * (1 - this.stats.damageReduction)));
    let remaining = mitigated;
    if (this.player.gritShield > 0) {
      const absorbed = Math.min(this.player.gritShield, remaining);
      this.player.gritShield -= absorbed;
      remaining -= absorbed;
    }
    this.player.hp = Math.max(0, this.player.hp - remaining);
    if (remaining > 0) {
      this.effects.spawnDamageFeedback(remaining, 190, 598);
    }
    return remaining;
  }

  private triggerAdrenalineHeal(label?: string): void {
    if (this.stats.adrenalineHeal <= 0 || this.player.hp >= this.player.maxHp) return;
    this.healPlayer(this.stats.adrenalineHeal, label);
  }

  public selectRunBuff(buffId: string): void {
    const chosen = this.pendingBuffChoices.find((b) => b.id === buffId);
    if (!chosen) return;
    this.activeRunBuffs.push(chosen);
    this.pendingBuffChoices = [];
    this.syncStatsFromProgress();
    if (chosen.healFlat) {
      this.healPlayer(chosen.healFlat);
    }
    this.continuePathToNextBoss();
  }

  public startNewRun(): void {
    this.activeRunBuffs = [];
    this.pendingBuffChoices = [];
    this.syncStatsFromProgress();
    this.gauntlet = generateGauntletRun();
    this.currentTierIndex = 0;
    this.runSummary = {
      tierReached: 1,
      bossesDefeatedThisRun: 0,
      guardiansSlainThisRun: 0,
      minigamesWonThisRun: 0,
      goldEarnedThisRun: 0,
      xpEarnedThisRun: 0,
      levelsGainedThisRun: 0,
      outcome: 'in_progress',
    };
    this.player = this.createFreshPlayerCombatState();
    this.setupRoadForCurrentTier();
    this.screen = 'path';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public continuePathToNextBoss(): void {
    if (this.currentTierIndex >= this.gauntlet.length - 1) {
      this.runSummary.outcome = 'victory';
      this.screen = 'victory_run';
      this.notifyUI();
      return;
    }
    this.currentTierIndex += 1;
    this.runSummary.tierReached = this.currentTierIndex + 1;
    // Heal at the trail shrine between bosses (scaled by Vanguard's Resolve!)
    this.healPlayer(Math.round(this.player.maxHp * this.stats.shrineHealPct));
    this.player.stamina = this.player.maxStamina;
    this.setupRoadForCurrentTier();
    this.pathState.shrineHealed = true;
    this.screen = 'path';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public openTaleOfTape(): void {
    const bossInst = this.gauntlet[this.currentTierIndex];
    this.isRaidFight = false;
    this.setupCombatEntities(bossInst, this.player?.hp);
    this.tapeTimer = 0;
    this.screen = 'tale_of_tape';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public enterAreaRaid(): void {
    if (!this.roadRaidPortal || !this.pendingRaidBoss) {
      this.screen = 'path';
      this.notifyUI();
      return;
    }
    this.roadRaidPortal.entered = true;
    this.isRaidFight = true;
    this.setupCombatEntities(this.pendingRaidBoss, this.player?.hp);
    this.beginBossFight();
  }

  public declineAreaRaid(): void {
    if (this.roadRaidPortal) {
      this.roadRaidPortal.declined = true;
    }
    this.isRaidFight = false;
    this.screen = 'path';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public returnFromRaidToRoad(): void {
    this.isRaidFight = false;
    this.healPlayer(Math.round(this.player.maxHp * 0.35));
    this.player.stamina = this.player.maxStamina;
    this.screen = 'path';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public applyRaidSkillCapUpgrade(id: keyof PlayerProgress['upgrades']): void {
    const r = this.runSummary.lastRaidReward;
    if (!r || !r.skillCapUpgradeAvailable || r.skillCapUpgradeClaimed) return;
    const spec = UPGRADE_SPECS.find((u) => u.id === id);
    if (!spec) return;
    const currentBonus = this.progress.upgradeCapBonuses[id] ?? 0;
    this.progress.upgradeCapBonuses[id] = currentBonus + 3;
    r.skillCapUpgradeClaimed = true;
    r.upgradedSkillName = spec.name;
    r.upgradedSkillNewMax = spec.maxLevel + this.progress.upgradeCapBonuses[id]!;
    this.sound.playVictory();
    saveProgress(this.progress);
    this.notifyUI();
  }

  public beginBossFight(): void {
    this.screen = 'combat';
    this.bossDefeatTimer = 0;
    this.bossDefeatBurstStage = 0;
    this.playerDeathTimer = 0;
    this.arenaMinions = [];
    this.arenaHealthPacks = [];
    this.activeAreaAttacks = [];
    this.bossSummonCooldown = 6.5;
    this.petAttackTimer = 2.2;
    this.petAttackFlash = 0;
    this.effects.reset();
    this.vfx.reset();
    this.combos.resetBuffer();
    this.input.clearBuffers();
    this.playerAnim.play('idle', true);
    this.bossAnim.play('intro', true, 0.75);
    this.notifyUI();
  }

  public openSanctuary(): void {
    this.arcadeMode = false;
    this.arcadeResult = null;
    this.activeRoadMinigame = null;
    this.syncStatsFromProgress();
    this.screen = 'sanctuary';
    this.input.clearBuffers();
    this.notifyUI();
  }

  public openMinigamePortal(): void {
    this.arcadeMode = false;
    this.arcadeResult = null;
    this.activeRoadMinigame = null;
    this.portalTimer = 60;
    this.screen = 'minigame_portal';
    this.input.clearBuffers();
    this.sound.playBossTelegraph();
    this.notifyUI();
  }

  public startPracticeMinigame(kind: RoadMinigameKind): void {
    if (this.portalTimer <= 0) return;
    const mg = createMinigameOfKind(kind, 0, true);
    mg.active = true;
    this.arcadeMode = true;
    this.arcadeResult = null;
    this.activeRoadMinigame = mg;
    this.minigameLaneCooldown = 0;
    this.screen = 'minigame_arcade';
    this.input.clearBuffers();
    this.sound.playBossTelegraph();
    this.notifyUI();
  }

  public exitPracticeMinigame(): void {
    this.arcadeMode = false;
    this.arcadeResult = null;
    this.activeRoadMinigame = null;
    this.screen = 'minigame_portal';
    this.input.clearBuffers();
    this.notifyUI();
  }

  private createFreshPlayerCombatState(carryHp?: number): PlayerCombatState {
    return {
      hp: carryHp !== undefined ? Math.max(1, Math.min(this.stats.maxHp, carryHp)) : this.stats.maxHp,
      maxHp: this.stats.maxHp,
      gritShield: this.stats.startingGritShield,
      stamina: this.stats.maxStamina,
      maxStamina: this.stats.maxStamina,
      state: 'idle',
      stateTimer: 0,
      stateDuration: 0,
      attackKind: null,
      activeCombo: null,
      hitboxSpawned: false,
      dodgeCooldown: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: -1 },
      dashHitBoss: false,
      parryCooldown: 0,
      quickAttackCooldown: 0,
      heavyAttackCooldown: 0,
      counterWindowTimer: 0,
      comboCount: 0,
      comboDecayTimer: 0,
      lastComboBanner: null,
      swingAngle: -Math.PI / 2,
      swingDir: 1,
      comboHints: [],
      inputBuffer: [],
    };
  }

  private setupCombatEntities(instance: BossInstance, carryHp?: number): void {
    this.physics.reset();
    this.effects.reset();
    this.combos.resetBuffer();

    this.playerBody = this.physics.addBody({
      id: 'player',
      faction: 'player',
      pos: { x: 0, y: 140 },
      vel: { x: 0, y: 0 },
      knockbackVel: { x: 0, y: 0 },
      z: 0,
      vz: 0,
      radius: this.physics.config.playerRadius,
      mass: 1.0,
      facing: { x: 0, y: -1 },
      friction: this.physics.config.playerFriction,
      maxSpeed: this.stats.moveSpeed,
      solid: true,
      defense: createIdleDefense(),
      hurtboxScale: 0.92,
      airborneThresholdZ: 55,
    });

    this.bossBody = this.physics.addBody({
      id: 'boss',
      faction: 'boss',
      pos: { x: 0, y: -115 },
      vel: { x: 0, y: 0 },
      knockbackVel: { x: 0, y: 0 },
      z: 0,
      vz: 0,
      radius: instance.template.bodyRadius,
      mass: instance.template.mass,
      facing: { x: 0, y: 1 },
      friction: 8.5,
      maxSpeed: instance.stats.moveSpeed,
      solid: true,
      defense: createIdleDefense(),
      hurtboxScale: 1.0,
      airborneThresholdZ: 70,
    });

    this.player = this.createFreshPlayerCombatState(carryHp);
    this.boss = {
      instance,
      hp: instance.stats.maxHp,
      maxHp: instance.stats.maxHp,
      poise: instance.stats.maxPoise,
      maxPoise: instance.stats.maxPoise,
      phase: 1,
      phaseShifted: false,
      state: 'intro',
      stateTimer: 0,
      stateDuration: 0.7,
      currentMove: null,
      stepIndex: 0,
      hitboxSpawned: false,
      decisionCooldown: 0.55,
      strafeDir: 1,
      strafeTimer: 1.2,
      tellLabel: '',
      flashTimer: 0,
      isShielding: false,
      spamHitsTaken: 0,
    };
  }

  public update(dt: number): void {
    this.input.tick(dt);
    this.effects.update(dt);
    this.vfx.update(dt);
    this.playerAnim.update(dt);
    this.bossAnim.update(dt);

    if (this.input.consumeAction('debug')) {
      this.showPhysicsDebug = !this.showPhysicsDebug;
      this.notifyUI();
    }

    if (this.screen === 'path') {
      this.updatePath(dt);
    } else if (this.screen === 'minigame_portal' || this.screen === 'minigame_arcade') {
      if (this.portalTimer > 0) {
        this.portalTimer = Math.max(0, this.portalTimer - dt);
        if (typeof document !== 'undefined') {
          const el = document.getElementById('portal-timer-val');
          if (el) el.textContent = `${this.portalTimer.toFixed(1)}s`;
        }
        if (this.portalTimer === 0) {
          // 30-second portal rule reached: collapse out of any active minigame!
          this.arcadeMode = false;
          this.arcadeResult = null;
          this.activeRoadMinigame = null;
          this.screen = 'minigame_portal';
          this.sound.playBossTelegraph();
          this.notifyUI();
          return;
        }
      }
      if (this.screen === 'minigame_arcade') {
        if (this.input.consumeAction('escape')) {
          this.exitPracticeMinigame();
          return;
        }
        if (this.activeRoadMinigame && this.activeRoadMinigame.active) {
          this.updateRoadMinigame(dt);
        }
      }
    } else if (this.screen === 'tale_of_tape') {
      this.tapeTimer += dt;
      if (
        this.input.consumeAction('confirm') ||
        this.input.consumeAction('strong') ||
        this.input.consumeAction('quick')
      ) {
        this.beginBossFight();
      }
    } else if (this.screen === 'combat') {
      this.updateCombat(dt);
    } else if (this.screen === 'victory_boss') {
      if (this.input.consumeAction('confirm')) {
        if (this.pendingBuffChoices.length > 0) {
          this.selectRunBuff(this.pendingBuffChoices[0].id);
        } else {
          this.continuePathToNextBoss();
        }
      }
    }
  }

  private updatePath(dt: number): void {
    // Handle active Roadside Minigame encounter!
    if (this.activeRoadMinigame && this.activeRoadMinigame.active) {
      this.updateRoadMinigame(dt);
      return;
    }

    // Trigger next uncompleted Roadside Minigame when reaching its shrine distance
    const nextMg = this.roadMinigames.find((m) => !m.completed && this.pathState.distance >= m.distance);
    if (nextMg) {
      nextMg.active = true;
      this.activeRoadMinigame = nextMg;
      this.input.clearBuffers();
      this.sound.playBossTelegraph();
      return;
    }

    const move = this.input.getMoveVector();
    const walkSpeed = 240;
    const strafeSpeed = 225;

    if (this.pathAttackCooldown > 0) this.pathAttackCooldown = Math.max(0, this.pathAttackCooldown - dt);
    if (this.pathHeavyCooldown > 0) this.pathHeavyCooldown = Math.max(0, this.pathHeavyCooldown - dt);
    if (this.pathDashCooldown > 0) this.pathDashCooldown = Math.max(0, this.pathDashCooldown - dt);
    if (this.pathDefenseTimer > 0) {
      this.pathDefenseTimer = Math.max(0, this.pathDefenseTimer - dt);
      if (this.pathDefenseTimer === 0) this.pathDefenseMode = 'none';
    }

    // Find nearest living guardian ahead on the road
    const blockingGuardian = this.roadGuardians.find(
      (g) => g.state !== 'dead' && g.distance >= this.pathState.distance - 18
    );
    const maxWalkDist = blockingGuardian ? blockingGuardian.distance - 38 : this.pathState.targetDistance;

    // H: Road Dash Strike (shoots forward ~1.5s of walking distance; stuns guardians on impact!)
    if (this.pathDashTimer <= 0 && this.pathDashCooldown <= 0 && this.input.consumeAction('dash')) {
      this.pathDashTimer = 0.24;
      this.pathDashCooldown = 2.2;
      this.pathDashDirX = move.x;
      this.playerAnim.play('dodge_roll', true, 0.24);
      this.sound.playDodge();
      this.effects.addFlash('#00e5ff', 0.14);
    }

    if (this.pathDashTimer > 0) {
      this.pathDashTimer = Math.max(0, this.pathDashTimer - dt);
      const dashSpeedForward = (walkSpeed * 1.5) / 0.24;
      this.pathState.distance = Math.min(maxWalkDist, this.pathState.distance + dashSpeedForward * dt);
      if (this.pathDashDirX !== 0) {
        this.pathState.playerX = Math.max(
          -230,
          Math.min(230, this.pathState.playerX + this.pathDashDirX * strafeSpeed * 1.35 * dt)
        );
      }
      // Check dash collision against blocking road guardian -> low damage + STUN!
      if (
        blockingGuardian &&
        blockingGuardian.state !== 'dead' &&
        blockingGuardian.distance - this.pathState.distance <= 52 &&
        Math.abs(blockingGuardian.x - this.pathState.playerX) < 115
      ) {
        this.pathDashTimer = 0;
        const dashDmg = Math.max(4, Math.round(this.stats.baseAttack * 0.35));
        blockingGuardian.isShielded = false;
        blockingGuardian.hp = Math.max(0, blockingGuardian.hp - dashDmg);
        blockingGuardian.state = blockingGuardian.hp <= 0 ? 'dead' : 'hurt';
        blockingGuardian.stunned = blockingGuardian.hp > 0;
        blockingGuardian.stateTimer = 0;
        blockingGuardian.stateDuration = blockingGuardian.hp <= 0 ? (blockingGuardian.isMiniBoss ? 1.55 : 1.15) : 1.7;
        blockingGuardian.burstHitsLeft = 0;
        blockingGuardian.animFrame = 0;
        blockingGuardian.animElapsed = 0;
        this.sound.playBossStagger();
        this.effects.addShake(8, 0.22);
        this.effects.addFlash('#00e5ff', 0.22);
        const popX = 640 + blockingGuardian.x * 0.8;
        this.effects.hudPopups.push({
          x: popX,
          y: 350,
          vx: 0,
          vy: -48,
          text: blockingGuardian.hp <= 0 ? `DASH KO! -${dashDmg}` : `DASH STUN! -${dashDmg}`,
          color: '#ffd740',
          scale: 1.15,
          life: 1.05,
          maxLife: 1.05,
          kind: 'gold',
        });
        if (blockingGuardian.hp <= 0) {
          const bountyMul = this.getBountyBonusMultiplier();
          const gold = Math.max(1, Math.round(blockingGuardian.goldReward * bountyMul));
          const xp = Math.round(blockingGuardian.xpReward * bountyMul);
          this.runSummary.guardiansSlainThisRun += 1;
          this.awardGold(gold, popX, 410);
          this.awardXp(xp, popX, 444);
          if (blockingGuardian.isMiniBoss) {
            this.healPlayer(Math.round(this.player.maxHp * 0.2));
            this.sound.playVictory();
          }
          saveProgress(this.progress);
        }
      }
    }

    // Road Combat Actions: L (Parry/Dodge), K (Quick), J (Strong)
    if (this.input.consumeAction('defense') && this.pathDefenseTimer <= 0) {
      const hasDir = move.x !== 0 || move.y !== 0;
      if (hasDir) {
        this.pathDefenseMode = 'dodge';
        this.pathDefenseTimer = 0.28;
        this.pathState.playerX = Math.max(-230, Math.min(230, this.pathState.playerX + move.x * 88));
        this.playerAnim.play('dodge_roll', true, 0.28);
        this.sound.playDodge();
      } else {
        this.pathDefenseMode = 'parry';
        this.pathDefenseTimer = 0.34;
        this.playerAnim.play('parry_stance', true, 0.34);
        this.sound.playSwing(false);
      }
    } else if (this.pathAttackCooldown <= 0) {
      const quick = this.input.consumeAction('quick');
      const strong = !quick && this.pathHeavyCooldown <= 0 && this.input.consumeAction('strong');
      if (quick || strong) {
        // Light attack = 1.0s cooldown; Heavy attack = 2.0s delay!
        this.pathAttackCooldown = strong ? 0.85 : 1.0;
        if (strong) this.pathHeavyCooldown = 2.0;
        this.player.swingDir *= -1;
        this.playerAnim.play(strong ? 'strong_cleave' : 'quick_slash', true, strong ? 0.85 : 0.5);
        this.sound.playSwing(strong);

        // Strike any guardian within close range on the road!
        const baseHitDmg = Math.round(this.stats.baseAttack * (strong ? 1.55 : 0.95));
        for (const g of this.roadGuardians) {
          if (g.state === 'dead') continue;
          const distDelta = Math.abs(g.distance - this.pathState.distance);
          const xDelta = Math.abs(g.x - this.pathState.playerX);
          if (distDelta < 86 && xDelta < 120) {
            // Deals your actual upgraded attack damage so upgrades genuinely melt minions faster!
            let dealt = baseHitDmg;
            if (g.isShielded) {
              if (strong) {
                g.isShielded = false;
                this.sound.playGuardClang();
                this.effects.addFlash('#ffd54f', 0.18);
              } else {
                dealt = Math.max(5, Math.round(baseHitDmg * 0.4));
                this.sound.playGuardClang();
              }
            }
            g.hp = Math.max(0, g.hp - dealt);
            g.state = g.hp <= 0 ? 'dead' : 'hurt';
            g.stateTimer = 0;
            g.stateDuration = g.hp <= 0 ? (g.isMiniBoss ? 1.55 : 1.15) : 0.22;
            g.animFrame = 0;
            g.animElapsed = 0;
            this.sound.playHit(strong, g.hp <= 0);
            this.effects.addShake(g.hp <= 0 ? (g.isMiniBoss ? 11 : 7) : strong ? 6 : 3, g.hp <= 0 ? 0.26 : 0.12);
            if (g.hp <= 0) {
              const bountyMul = this.getBountyBonusMultiplier();
              const gold = Math.max(1, Math.round(g.goldReward * bountyMul));
              const xp = Math.round(g.xpReward * bountyMul);
              const popX = 640 + g.x * 0.8;
              this.runSummary.guardiansSlainThisRun += 1;
              this.awardGold(gold, popX, 410);
              this.awardXp(xp, popX, 444);
              if (g.isMiniBoss) {
                this.healPlayer(Math.round(this.player.maxHp * 0.2));
                this.effects.addFlash('#ffea00', 0.35);
                this.sound.playVictory();
              }
              // Random chance to drop a Health Pack on the road (22% minion, 45% mini-boss)!
              if (Math.random() < (g.isMiniBoss ? 0.45 : 0.22)) {
                this.roadHealthPacks.push({
                  id: `hp_drop_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                  distance: g.distance,
                  x: g.x,
                  healPct: g.isMiniBoss ? 0.28 : 0.18,
                  collected: false,
                });
              }
              saveProgress(this.progress);
            }
          }
        }
      }
    }

    // Walk & Steer along the road
    if (move.x !== 0 || move.y !== 0) {
      if (this.pathAttackCooldown <= 0 && this.pathDefenseTimer <= 0) {
        this.playerAnim.play('walk');
      }
      this.pathState.playerX = Math.max(-230, Math.min(230, this.pathState.playerX + move.x * strafeSpeed * dt));
      if (move.y < 0) {
        this.pathState.distance = Math.min(maxWalkDist, this.pathState.distance + walkSpeed * dt);
      } else if (move.y > 0) {
        this.pathState.distance = Math.max(0, this.pathState.distance - walkSpeed * 0.55 * dt);
      }
      this.pathState.walkCycle += dt * 9.5;
      this.pathState.facingX = move.x;

      this.stepSoundTimer -= dt;
      if (this.stepSoundTimer <= 0) {
        this.sound.playStep();
        this.stepSoundTimer = 0.28;
      }
    } else if (this.pathAttackCooldown <= 0 && this.pathDefenseTimer <= 0) {
      this.playerAnim.play('idle');
    }

    // Update Road Guardians AI & 12-18 frame animations (including full KO death sequence!)
    for (const g of this.roadGuardians) {
      g.animElapsed += dt;
      const frames = g.state === 'dead' ? 18 : g.state === 'windup' ? 14 : 12;
      if (g.state === 'dead') {
        const dur = Math.max(0.5, g.stateDuration);
        g.animFrame = Math.min(frames - 1, Math.floor((g.animElapsed / dur) * frames));
        continue;
      }
      const fps = g.state === 'idle' ? 12 : 24;
      g.animFrame = g.state === 'idle' ? Math.floor(g.animElapsed * fps) % frames : Math.min(frames - 1, Math.floor(g.animElapsed * fps));

      const distToPlayer = g.distance - this.pathState.distance;
      if (g.state === 'hurt') {
        g.stateTimer += dt;
        if (g.stateTimer >= g.stateDuration) {
          g.state = 'idle';
          g.stunned = false;
          g.stateTimer = 0;
        }
        continue;
      }

      if (g.state === 'idle') {
        if (distToPlayer < 245 && distToPlayer > -25) {
          if (distToPlayer > 52) {
            g.distance -= (g.variant === 'swift' ? 72 : g.isMiniBoss ? 56 : 50) * dt;
          }
          const dx = this.pathState.playerX - g.x;
          g.x += Math.sign(dx) * Math.min(Math.abs(dx), g.moveSpeed * dt);
          g.attackCooldown -= dt;
          if (g.attackCooldown <= 0 && distToPlayer < 102) {
            g.state = 'windup';
            g.stateTimer = 0;
            g.stateDuration = g.windupDuration;
            g.burstHitsLeft = g.isMiniBoss ? 3 : g.variant === 'berserker' ? 2 : 1;
            g.feintTriggered = false;
            g.hitDealt = false;
            g.animElapsed = 0;
            this.sound.playBossTelegraph();
          }
        }
      } else if (g.state === 'windup') {
        g.stateTimer += dt;
        // Complex road NPC attack patterns:
        if ((g.variant === 'trickster' || g.attackPattern === 'feint_flank') && !g.feintTriggered && g.stateTimer >= g.stateDuration * 0.45) {
          g.feintTriggered = true;
          g.x = Math.max(-210, Math.min(210, g.x + (g.x > this.pathState.playerX ? -82 : 82)));
        }
        if (g.attackPattern === 'leap_slam') {
          g.z = Math.sin((g.stateTimer / Math.max(0.05, g.stateDuration)) * Math.PI) * 58;
        }
        if (g.stateTimer >= g.stateDuration) {
          g.z = 0;
          g.state = 'attack';
          g.stateTimer = 0;
          g.stateDuration = 0.2;
          g.animElapsed = 0;
        }
      } else if (g.state === 'attack') {
        g.stateTimer += dt;
        if (!g.hitDealt && g.stateTimer >= 0.06) {
          g.hitDealt = true;
          if (Math.abs(g.distance - this.pathState.distance) < 92 && Math.abs(g.x - this.pathState.playerX) < 98) {
            if (this.pathDefenseMode === 'parry') {
              this.sound.playParry();
              this.playerAnim.play('parry_success', true, 0.4);
              this.effects.addFlash('#ffd54f', 0.24);
              // Parrying shatters Vanguard/Mini-Boss shield & armor and deals heavy riposte!
              g.isShielded = false;
              g.isArmored = false;
              g.burstHitsLeft = 0;
              g.hp = Math.max(0, g.hp - Math.round(this.stats.baseAttack * 1.25));
              g.state = g.hp <= 0 ? 'dead' : 'hurt';
              g.stateTimer = 0;
              g.stateDuration = g.hp <= 0 ? (g.isMiniBoss ? 1.55 : 1.15) : 0.65;
              g.animFrame = 0;
              g.animElapsed = 0;
              if (g.hp <= 0) {
                const bountyMul = this.getBountyBonusMultiplier();
                const gold = Math.max(1, Math.round(g.goldReward * bountyMul));
                const xp = Math.round(g.xpReward * bountyMul);
                const popX = 640 + g.x * 0.8;
                this.runSummary.guardiansSlainThisRun += 1;
                this.awardGold(gold, popX, 410);
                this.awardXp(xp, popX, 444);
                if (g.isMiniBoss) {
                  this.healPlayer(Math.round(this.player.maxHp * 0.2));
                  this.sound.playVictory();
                }
                saveProgress(this.progress);
              }
            } else if (this.pathDefenseMode === 'dodge') {
              this.sound.playDodge();
            } else {
              this.applyPlayerIncomingDamage(g.damage);
              this.playerAnim.play('hurt', true, 0.3);
              this.sound.playPlayerHurt();
              this.effects.addShake(8, 0.2);
              this.effects.addFlash('#ff1744', 0.26);
              if (this.player.hp <= 0) {
                this.handlePlayerDeath();
                return;
              }
            }
          }
        }
        if (g.stateTimer >= g.stateDuration) {
          g.burstHitsLeft -= 1;
          if (g.burstHitsLeft > 0 && g.hp > 0) {
            g.state = 'windup';
            g.stateTimer = 0;
            g.stateDuration = g.isMiniBoss ? 0.34 : 0.32;
            g.hitDealt = false;
            g.animElapsed = 0;
            this.sound.playBossTelegraph();
          } else {
            g.state = 'idle';
            g.stateTimer = 0;
            g.attackCooldown = (g.variant === 'swift' ? 0.45 : 0.62) + Math.random() * 0.3;
          }
        }
      }
    }

    // Collect any Road Health Packs when walking over them!
    for (const hpPack of this.roadHealthPacks) {
      if (hpPack.collected) continue;
      if (
        Math.abs(hpPack.distance - this.pathState.distance) < 62 &&
        Math.abs(hpPack.x - this.pathState.playerX) < 76
      ) {
        hpPack.collected = true;
        const healAmt = Math.max(15, Math.round(this.player.maxHp * hpPack.healPct));
        this.healPlayer(healAmt);
        this.effects.addFlash('#69f0ae', 0.24);
        this.sound.playVictory();
      }
    }

    // Unlock & Open Mini-Boss Guarded Treasure Chests (Gold + XP + Random Pet / Armor / Gear!)
    for (const chest of this.roadChests) {
      if (chest.openAnimTimer > 0) {
        chest.openAnimTimer = Math.max(0, chest.openAnimTimer - dt);
      }
      if (!chest.unlocked) {
        const guard = this.roadGuardians.find((g) => g.id === chest.guardianId);
        if (!guard || guard.state === 'dead') {
          chest.unlocked = true;
        }
      }
      if (
        chest.unlocked &&
        !chest.opened &&
        Math.abs(chest.distance - this.pathState.distance) < 78 &&
        Math.abs(chest.x - this.pathState.playerX) < 96
      ) {
        chest.opened = true;
        chest.openAnimTimer = 1.6;
        const bountyMul = this.getBountyBonusMultiplier();
        const gold = Math.max(6, Math.round(chest.goldReward * bountyMul));
        const xp = Math.round(chest.xpReward * bountyMul);
        const popX = 640 + chest.x * 0.8;
        const awardedGold = this.awardGold(gold, popX, 340);
        const awardedXp = this.awardXp(xp, popX, 375);

        // Roll a random non-maxed Pet, Armor, or Gear upgrade!
        const lootPool = UPGRADE_SPECS.filter(
          (u) => (u.category === 'pet' || u.category === 'gear') && (this.progress.upgrades[u.id] ?? 0) < u.maxLevel
        );
        if (lootPool.length > 0) {
          const picked = lootPool[Math.floor(Math.random() * lootPool.length)];
          const nextLv = (this.progress.upgrades[picked.id] ?? 0) + 1;
          this.progress.upgrades[picked.id] = nextLv;
          this.syncStatsFromProgress();
          const tag = picked.category === 'pet' ? 'PET LOOT' : 'ARMOR & GEAR';
          this.effects.spawnLootBanner(
            `✦ ${tag}: ${picked.name.toUpperCase()} (Lv.${nextLv}) ✦`,
            `+${awardedGold} Gold  •  +${awardedXp} XP  •  ${picked.effectPerLevel}`,
            picked.category === 'pet' ? '#69f0ae' : '#ffd740'
          );
        } else {
          // All gear & pets already maxed -> grant bonus gold & XP!
          const bonusGold = this.awardGold(Math.round(gold * 0.8), popX, 315);
          this.effects.spawnLootBanner(
            `✦ ROYAL TREASURE HOARD! ✦`,
            `+${awardedGold + bonusGold} Gold  •  +${awardedXp} XP`,
            '#ffd740'
          );
        }
        this.sound.playVictory();
        saveProgress(this.progress);
      }
    }

    // Optional 25%-chance Area Raid Rift encounter when player walks near it!
    if (
      this.roadRaidPortal &&
      !this.roadRaidPortal.entered &&
      !this.roadRaidPortal.declined &&
      !this.roadRaidPortal.cleared &&
      Math.abs(this.roadRaidPortal.distance - this.pathState.distance) < 86 &&
      Math.abs(this.roadRaidPortal.x - this.pathState.playerX) < 118
    ) {
      this.screen = 'raid_prompt';
      this.input.clearBuffers();
      this.sound.playBossTelegraph();
      this.notifyUI();
      return;
    }

    // Pressing Space/Enter fast-forwards ONLY once all road guardians & minigames are cleared!
    const allCleared =
      this.roadGuardians.every((g) => g.state === 'dead') &&
      this.roadMinigames.every((m) => m.completed);
    if (this.input.consumeAction('confirm') && allCleared) {
      this.pathState.distance = this.pathState.targetDistance;
    }

    if (this.pathState.distance >= this.pathState.targetDistance) {
      this.openTaleOfTape();
    }
  }

  private updateRoadMinigame(dt: number): void {
    const mg = this.activeRoadMinigame;
    if (!mg) return;
    mg.timer += dt;
    if (mg.flashTimer > 0) mg.flashTimer = Math.max(0, mg.flashTimer - dt);
    if (this.minigameLaneCooldown > 0) this.minigameLaneCooldown = Math.max(0, this.minigameLaneCooldown - dt);

    const finish = (won: boolean) => {
      mg.active = false;
      mg.completed = true;
      mg.succeeded = won;
      this.activeRoadMinigame = null;
      if (this.arcadeMode) {
        // Sanctuary Free-Play Arcade: strictly NO rewards (just for fun!)
        this.arcadeResult = {
          kind: mg.kind,
          title: mg.title,
          won,
          score: Math.floor(mg.score),
          targetScore: mg.targetScore,
        };
        if (won) {
          this.effects.addFlash('#69f0ae', 0.28);
          this.sound.playVictory();
        } else {
          this.sound.playPlayerHurt();
          this.effects.addShake(5, 0.18);
        }
        this.notifyUI();
        return;
      }
      const bossInst = this.gauntlet[this.currentTierIndex] ?? this.gauntlet[0];
      if (won) {
        const bountyMul = this.getBountyBonusMultiplier();
        const gold = Math.max(2, Math.round(bossInst.stats.goldReward * (mg.kind === 'coin_catch' ? 0.26 : 0.18) * bountyMul));
        const xp = Math.round(bossInst.stats.xpReward * 0.3 * bountyMul);
        this.runSummary.minigamesWonThisRun += 1;
        this.awardGold(gold, 640, 320);
        this.awardXp(xp, 640, 356);
        this.healPlayer(Math.round(this.player.maxHp * 0.18));
        this.effects.addFlash('#69f0ae', 0.3);
        this.sound.playVictory();
        saveProgress(this.progress);
      } else {
        this.sound.playPlayerHurt();
        this.effects.addShake(6, 0.2);
      }
    };

    if (mg.kind === 'anvil_timing') {
      mg.cursor += mg.cursorDir * dt * (this.arcadeMode ? 1.65 : 1.35);
      if (mg.cursor >= 1) {
        mg.cursor = 1;
        mg.cursorDir = -1;
      } else if (mg.cursor <= 0) {
        mg.cursor = 0;
        mg.cursorDir = 1;
      }
      if (this.input.consumeAction('strong') || this.input.consumeAction('quick')) {
        if (Math.abs(mg.cursor - 0.5) <= (this.arcadeMode ? 0.12 : 0.14)) {
          mg.score += 1;
          mg.flashMsg = 'PERFECT STRIKE!';
          mg.flashTimer = 0.5;
          this.sound.playParry();
          if (mg.score >= mg.targetScore) return finish(true);
        } else {
          mg.flashMsg = 'MISS!';
          mg.flashTimer = 0.4;
          this.sound.playGuardClang();
        }
      }
    } else if (mg.kind === 'parry_gauntlet') {
      mg.cursor += dt * (this.arcadeMode ? 1.05 : 0.85);
      if (this.input.consumeAction('defense')) {
        if (mg.cursor >= 0.72 && mg.cursor <= 1.05) {
          mg.score += 1;
          mg.cursor = 0;
          mg.flashMsg = 'DEFLECTED!';
          mg.flashTimer = 0.45;
          this.sound.playParry();
          if (mg.score >= mg.targetScore) return finish(true);
        } else {
          mg.flashMsg = 'EARLY!';
          mg.flashTimer = 0.35;
          this.sound.playGuardClang();
        }
      }
      if (mg.cursor > 1.08) {
        mg.cursor = 0;
        mg.flashMsg = 'GRAZED!';
        mg.flashTimer = 0.4;
        this.sound.playPlayerHurt();
      }
    } else if (mg.kind === 'boulder_dodge' || mg.kind === 'coin_catch' || mg.kind === 'arrow_volley') {
      const move = this.input.getMoveVector();
      if (this.minigameLaneCooldown <= 0) {
        if (move.x < -0.3 && mg.playerLane > 0) {
          mg.playerLane -= 1;
          this.minigameLaneCooldown = 0.18;
          this.sound.playDodge();
        } else if (move.x > 0.3 && mg.playerLane < 2) {
          mg.playerLane += 1;
          this.minigameLaneCooldown = 0.18;
          this.sound.playDodge();
        }
      }
      for (const b of mg.lanes) {
        b.y += b.speed * dt;
        if (b.y > 0.8 && b.y < 0.98 && b.lane === mg.playerLane) {
          b.y = -0.2;
          b.lane = Math.floor(Math.random() * 3);
          if (mg.kind === 'coin_catch' || mg.kind === 'arrow_volley') {
            mg.score += 1;
            mg.flashMsg = mg.kind === 'arrow_volley' ? 'ARROW BLOCKED!' : '+GOLD POUCH!';
            mg.flashTimer = 0.4;
            this.sound.playParry();
            if (mg.score >= mg.targetScore) return finish(true);
          } else {
            if (!this.arcadeMode) this.applyPlayerIncomingDamage(12);
            mg.flashMsg = 'HIT BY BOULDER!';
            mg.flashTimer = 0.45;
            this.sound.playPlayerHurt();
          }
        } else if (b.y >= 1.1) {
          b.y = -0.15;
          b.lane = Math.floor(Math.random() * 3);
          if (mg.kind === 'boulder_dodge') mg.score += 1;
        }
      }
      if (mg.kind === 'boulder_dodge' && mg.timer >= mg.maxTimer) return finish(true);
    } else if (mg.kind === 'combo_drill') {
      const seq = mg.comboSeq ?? ['K', 'K', 'J'];
      const step = mg.comboStep ?? 0;
      const pressed: 'K' | 'J' | 'L' | null = this.input.consumeAction('quick')
        ? 'K'
        : this.input.consumeAction('strong')
        ? 'J'
        : this.input.consumeAction('defense')
        ? 'L'
        : null;
      if (pressed) {
        if (pressed === seq[step]) {
          mg.comboStep = step + 1;
          this.sound.playHit(false, false);
          if (mg.comboStep >= seq.length) {
            mg.score += 1;
            mg.comboStep = 0;
            const seqs: Array<Array<'K' | 'J' | 'L'>> = [
              ['K', 'K', 'J'],
              ['J', 'K', 'L'],
              ['K', 'L', 'J'],
              ['L', 'K', 'K'],
            ];
            mg.comboSeq = seqs[Math.floor(Math.random() * seqs.length)];
            mg.flashMsg = 'COMBO COMPLETE!';
            mg.flashTimer = 0.45;
            this.sound.playParry();
            if (mg.score >= mg.targetScore) return finish(true);
          }
        } else {
          mg.comboStep = 0;
          mg.flashMsg = 'RESET!';
          mg.flashTimer = 0.35;
          this.sound.playGuardClang();
        }
      }
    } else if (mg.kind === 'forge_bellows') {
      mg.cursor = Math.max(0, mg.cursor - dt * 0.36);
      if (this.input.consumeAction('quick') || this.input.consumeAction('strong')) {
        mg.cursor = Math.min(1, mg.cursor + 0.16);
        this.sound.playSwing(false);
      }
      if (mg.cursor >= 0.48 && mg.cursor <= 0.78) {
        mg.score += dt * 10;
        if (mg.score >= mg.targetScore) return finish(true);
      }
    } else if (mg.kind === 'dash_hurdles') {
      mg.cursor += dt * 0.88;
      if (this.input.consumeAction('dash') || this.input.consumeAction('defense')) {
        if (mg.cursor >= 0.72 && mg.cursor <= 1.02) {
          mg.score += 1;
          mg.cursor = 0;
          mg.flashMsg = 'CLEAN DASH!';
          mg.flashTimer = 0.45;
          this.sound.playDodge();
          if (mg.score >= mg.targetScore) return finish(true);
        } else {
          mg.flashMsg = 'EARLY!';
          mg.flashTimer = 0.35;
          this.sound.playGuardClang();
        }
      }
      if (mg.cursor > 1.06) {
        mg.cursor = 0;
        mg.flashMsg = 'TRIPPED!';
        mg.flashTimer = 0.4;
        this.sound.playPlayerHurt();
      }
    } else if (mg.kind === 'blade_clash') {
      // Drains steadily; mashing K or J pushes it to 100%!
      mg.cursor = Math.max(0.05, mg.cursor - dt * (this.arcadeMode ? 0.34 : 0.24));
      if (this.input.consumeAction('quick') || this.input.consumeAction('strong')) {
        mg.cursor = Math.min(1, mg.cursor + (this.arcadeMode ? 0.08 : 0.11));
        mg.flashMsg = 'PUSH!';
        mg.flashTimer = 0.2;
        this.sound.playGuardClang();
        if (mg.cursor >= 0.99) return finish(true);
      }
    } else if (mg.kind === 'stance_mirror') {
      const move = this.input.getMoveVector();
      if (this.minigameLaneCooldown <= 0) {
        let dir: StanceDir | null = null;
        if (move.x < -0.45) dir = 'LEFT';
        else if (move.x > 0.45) dir = 'RIGHT';
        else if (move.y < -0.45) dir = 'UP';
        else if (move.y > 0.45) dir = 'DOWN';
        if (dir) {
          this.minigameLaneCooldown = 0.26;
          if (dir === mg.stanceDir) {
            mg.score += 1;
            mg.flashMsg = 'STANCE MATCHED!';
            mg.flashTimer = 0.35;
            this.sound.playParry();
            const dirs: StanceDir[] = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
            mg.stanceDir = dirs[Math.floor(Math.random() * dirs.length)];
            if (mg.score >= mg.targetScore) return finish(true);
          } else {
            mg.flashMsg = 'WRONG DIRECTION!';
            mg.flashTimer = 0.35;
            this.sound.playGuardClang();
          }
        }
      }
    } else if (mg.kind === 'whetstone_rhythm' || mg.kind === 'target_slash') {
      const pressed: 'K' | 'J' | 'L' | null = this.input.consumeAction('quick')
        ? 'K'
        : this.input.consumeAction('strong')
        ? 'J'
        : this.input.consumeAction('defense')
        ? 'L'
        : null;
      if (pressed) {
        if (pressed === mg.promptKey) {
          mg.score += 1;
          mg.flashMsg = mg.kind === 'whetstone_rhythm' ? 'SHARP!' : 'CRISP!';
          mg.flashTimer = 0.35;
          this.sound.playHit(true, false);
          if (mg.kind === 'whetstone_rhythm') {
            mg.promptKey = mg.promptKey === 'K' ? 'J' : 'K';
          } else {
            const keys: Array<'K' | 'J' | 'L'> = ['K', 'J', 'L'];
            mg.promptKey = keys[Math.floor(Math.random() * keys.length)];
          }
          if (mg.score >= mg.targetScore) return finish(true);
        } else {
          mg.flashMsg = 'WRONG KEY!';
          mg.flashTimer = 0.35;
          this.sound.playGuardClang();
        }
      }
    }

    if (mg.timer >= mg.maxTimer) {
      finish(mg.score >= mg.targetScore);
    }
  }

  private updateCombat(dt: number): void {
    // Dramatic Boss KO sequence plays out fully before showing Victory / Buff modal!
    if (this.bossDefeatTimer > 0) {
      this.bossDefeatTimer -= dt;
      const elapsed = 2.35 - this.bossDefeatTimer;
      const bx = this.bossBody.pos.x;
      const by = this.bossBody.pos.y;
      const accent = this.boss.instance.template.palette.accent;

      if (this.bossDefeatBurstStage === 0 && elapsed >= 0.45) {
        this.bossDefeatBurstStage = 1;
        this.effects.addShake(9, 0.25);
        this.vfx.spawn('combo_burst', bx - 22, by, 44, accent, 1.4);
        this.effects.spawnBurst(bx - 20, by, 40, '#ffd54f', 16, 260, 6);
        this.sound.playHit(true, true);
      } else if (this.bossDefeatBurstStage === 1 && elapsed >= 1.05) {
        this.bossDefeatBurstStage = 2;
        this.effects.addShake(11, 0.28);
        this.vfx.spawn('stagger_burst', bx + 20, by, 38, '#ffd54f', 1.5);
        this.effects.spawnBurst(bx + 18, by, 35, accent, 20, 300, 6);
        this.sound.playHit(true, true);
      } else if (this.bossDefeatBurstStage === 2 && elapsed >= 1.65) {
        this.bossDefeatBurstStage = 3;
        this.effects.addFlash('#fff59d', 0.55);
        this.effects.addShake(14, 0.35);
        this.vfx.spawn('phase_nova', bx, by, 32, '#ffd54f', 1.9);
        this.effects.spawnBurst(bx, by, 36, '#ffffff', 34, 360, 7);
        this.sound.playVictory();
      }

      if (this.bossDefeatTimer <= 0) {
        this.bossDefeatTimer = 0;
        if (this.isRaidFight) {
          this.pendingBuffChoices = [];
          this.screen = 'victory_raid';
        } else if (this.currentTierIndex >= this.gauntlet.length - 1) {
          this.pendingBuffChoices = [];
          this.runSummary.outcome = 'victory';
          this.screen = 'victory_run';
        } else {
          this.pendingBuffChoices = rollRunBuffChoices(3);
          this.screen = 'victory_boss';
        }
        this.notifyUI();
      }
      return;
    }

    // Brief dramatic Player Defeat animation before showing Post-Run Summary
    if (this.playerDeathTimer > 0) {
      this.playerDeathTimer -= dt;
      if (this.playerDeathTimer <= 0) {
        this.playerDeathTimer = 0;
        this.screen = 'run_summary';
        this.notifyUI();
      }
      return;
    }

    this.combos.tick(dt);
    this.player.inputBuffer = this.combos.getBuffer();

    if (this.player.dodgeCooldown > 0) this.player.dodgeCooldown = Math.max(0, this.player.dodgeCooldown - dt);
    if (this.player.dashCooldown > 0) this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    if (this.player.parryCooldown > 0) this.player.parryCooldown = Math.max(0, this.player.parryCooldown - dt);
    if (this.player.quickAttackCooldown > 0) {
      this.player.quickAttackCooldown = Math.max(0, this.player.quickAttackCooldown - dt);
    }
    if (this.player.heavyAttackCooldown > 0) {
      this.player.heavyAttackCooldown = Math.max(0, this.player.heavyAttackCooldown - dt);
    }
    if (this.player.counterWindowTimer > 0) {
      this.player.counterWindowTimer = Math.max(0, this.player.counterWindowTimer - dt);
    }
    if (this.player.comboDecayTimer > 0) {
      this.player.comboDecayTimer = Math.max(0, this.player.comboDecayTimer - dt);
      if (this.player.comboDecayTimer === 0) this.player.comboCount = 0;
    }
    if (this.player.lastComboBanner) {
      this.player.lastComboBanner.timer -= dt;
      if (this.player.lastComboBanner.timer <= 0) this.player.lastComboBanner = null;
    }
    if (this.boss.flashTimer > 0) {
      this.boss.flashTimer = Math.max(0, this.boss.flashTimer - dt);
    }

    // Stamina regeneration when not mid-swing or dodging
    if (this.player.state === 'idle' || this.player.state === 'recovery') {
      this.player.stamina = Math.min(
        this.player.maxStamina,
        this.player.stamina + this.stats.staminaRegen * dt
      );
    }

    // Update player actions & steering (only outside hitstop for crisp feel)
    if (!this.physics.isInHitstop()) {
      this.updatePlayerCombat(dt);
      this.updateBossCombat(dt);
      this.updateArenaMinions(dt);
      this.updateAreaAttacks(dt);
      this.updatePetCompanion(dt);
    }

    // Step isolated physics engine!
    const events = this.physics.step(dt);
    for (const ev of events) {
      this.handleHitEvent(ev);
    }
  }

  private updatePlayerCombat(dt: number): void {
    const p = this.player;
    const body = this.playerBody;
    const move = this.input.getMoveVector();

    if (p.state === 'dead') return;

    // Sync body max speed from config/stats
    body.maxSpeed = this.stats.moveSpeed;

    // Allow canceling late recovery into dodge/parry or next combo hit
    const canAct =
      p.state === 'idle' ||
      (p.state === 'recovery' && p.stateTimer >= p.stateDuration * 0.45);

    if (canAct) {
      // H: Dash Strike (shoots forward ~1.5s walking distance; low dmg + STUNS enemy on impact!)
      if (this.input.consumeAction('dash') && p.dashCooldown <= 0 && p.stamina >= 14) {
        const hasDir = move.x !== 0 || move.y !== 0;
        const dashDir = hasDir
          ? normalize(move)
          : normalize(sub(this.bossBody.pos, body.pos));
        const finalDir = dashDir.x === 0 && dashDir.y === 0 ? { x: 0, y: -1 } : dashDir;
        p.stamina -= 14;
        p.state = 'dash';
        p.stateTimer = 0;
        p.stateDuration = 0.24;
        p.dashCooldown = 2.2;
        p.dashDir = finalDir;
        p.dashHitBoss = false;
        body.facing = { ...finalDir };
        this.playerAnim.play('dodge_roll', true, 0.24);
        this.vfx.spawn('dodge_afterimage', body.pos.x, body.pos.y, 18, '#00e5ff', 1.25, finalDir.x < 0);
        this.sound.playDodge();
        this.effects.spawnBurst(body.pos.x, body.pos.y, 8, '#00e5ff', 10, 180, 4);
        return;
      }

      // L: Directional Dodge (WASD + L) OR Neutral Parry (L alone)
      if (this.input.consumeAction('defense')) {
        const hasDir = move.x !== 0 || move.y !== 0;
        if (hasDir && p.dodgeCooldown <= 0 && p.stamina >= this.stats.dodgeStaminaCost) {
          p.stamina -= this.stats.dodgeStaminaCost;
          p.state = 'dodge';
          p.stateTimer = 0;
          p.stateDuration = this.physics.config.dodgeDuration;
          p.dodgeCooldown = this.physics.config.dodgeDuration + this.physics.config.dodgeCooldown;
          body.defense = startDodgeDefense(move, this.physics.config);
          this.playerAnim.play('dodge_roll', true, this.physics.config.dodgeDuration);
          this.vfx.spawn('dodge_afterimage', body.pos.x, body.pos.y, 18, '#80deea', 1.1, move.x < 0);
          this.sound.playDodge();
          this.effects.spawnBurst(body.pos.x, body.pos.y, 4, '#cfd8dc', 7, 130, 4);
          return;
        } else if (!hasDir && p.parryCooldown <= 0 && p.stamina >= 10) {
          p.stamina -= 10;
          p.state = 'parry';
          p.stateTimer = 0;
          const totalParry =
            this.physics.config.parryWindow +
            this.stats.parryWindowBonus +
            this.physics.config.parryRecovery;
          p.stateDuration = totalParry;
          p.parryCooldown = totalParry + this.physics.config.parryCooldown;
          body.defense = startParryDefense(this.physics.config, this.stats.parryWindowBonus);
          this.playerAnim.play('parry_stance', true, totalParry);
          this.sound.playSwing(false);
          return;
        }
      }

      // K: Quick Strike
      if (this.input.consumeAction('quick')) {
        this.triggerPlayerAttack('K');
        return;
      }

      // J: Strong Strike
      if (this.input.consumeAction('strong')) {
        this.triggerPlayerAttack('J');
        return;
      }
    }

    // Free WASD movement in idle
    if (p.state === 'idle') {
      if (move.x !== 0 || move.y !== 0) {
        this.physics.applyMoveInput('player', move, this.physics.config.playerAccel, dt);
        this.playerAnim.play('walk');
      } else if (this.playerAnim.currentEvent !== 'parry_success' || this.playerAnim.isFinished()) {
        this.playerAnim.play('idle');
      }
      return;
    }

    // Advance timed states
    p.stateTimer += dt;

    if (p.state === 'dash') {
      const dashSpeed = (this.stats.moveSpeed * 1.5) / Math.max(0.05, p.stateDuration);
      body.vel.x = p.dashDir.x * dashSpeed;
      body.vel.y = p.dashDir.y * dashSpeed;

      // Check dash collision against Boss -> low damage + STUN + dash_stun animation!
      if (!p.dashHitBoss && this.boss.state !== 'defeated') {
        const dBoss = dist(body.pos, this.bossBody.pos);
        if (dBoss <= body.radius + this.bossBody.radius + 28) {
          p.dashHitBoss = true;
          const dashDmg = Math.max(4, Math.round(this.stats.baseAttack * 0.35));
          this.boss.hp = Math.max(0, this.boss.hp - dashDmg);
          this.boss.flashTimer = 0.16;
          this.vfx.spawn('dash_stun', this.bossBody.pos.x, this.bossBody.pos.y, 44, '#00e5ff', 1.45);
          this.effects.spawnBurst(this.bossBody.pos.x, this.bossBody.pos.y, 44, '#ffd740', 18, 280, 6);
          this.effects.addShake(9, 0.24);
          this.effects.addFlash('#00e5ff', 0.22);
          this.physics.triggerHitstop(0.06);

          if (this.boss.hp <= 0) {
            this.handleBossDefeated();
          } else {
            this.boss.state = 'staggered';
            this.boss.stateTimer = 0;
            this.boss.stateDuration = 1.45;
            this.boss.currentMove = null;
            this.boss.isShielding = false;
            this.boss.tellLabel = 'DASH STUNNED!';
            this.physics.clearHitboxesForOwner('boss');
            this.bossAnim.play('stagger', true);
            this.sound.playBossStagger();
            this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 96, `DASH STUN! -${dashDmg}`, '#ffd740', 1.35, 1.05);
          }

          // Stop cleanly in front of the stunned boss so player can follow up immediately
          body.vel.x = 0;
          body.vel.y = 0;
          p.state = 'recovery';
          p.stateTimer = 0;
          p.stateDuration = 0.12;
          return;
        }
      }

      // Check dash collision against Arena Minions -> low damage + STUN!
      for (const m of this.arenaMinions) {
        if (m.state === 'dead' || m.stunned) continue;
        if (Math.hypot(m.x - body.pos.x, m.y - body.pos.y) <= 64) {
          const dashDmg = Math.max(4, Math.round(this.stats.baseAttack * 0.35));
          m.isShielded = false;
          m.hp = Math.max(0, m.hp - dashDmg);
          m.state = m.hp <= 0 ? 'dead' : 'hurt';
          m.stunned = m.hp > 0;
          m.stateTimer = 0;
          m.stateDuration = m.hp <= 0 ? 1.15 : 1.65;
          m.animFrame = 0;
          m.animElapsed = 0;
          this.vfx.spawn('dash_stun', m.x, m.y, 32, '#00e5ff', 1.1);
          this.sound.playBossStagger();
          this.effects.spawnText(m.x, m.y, 58, m.hp <= 0 ? `DASH KO!` : `STUNNED! -${dashDmg}`, '#ffd740', 1.05, 0.9);
          if (m.hp <= 0) {
            const bountyMul = this.getBountyBonusMultiplier();
            const gold = Math.max(1, Math.round(m.goldReward * bountyMul));
            const xp = Math.round(m.xpReward * bountyMul);
            this.runSummary.guardiansSlainThisRun += 1;
            this.awardGold(gold, 640 + m.x * 0.7, 360);
            this.awardXp(xp, 640 + m.x * 0.7, 392);
            this.triggerAdrenalineHeal('kill');
            saveProgress(this.progress);
          }
        }
      }

      if (p.stateTimer >= p.stateDuration) {
        body.vel.x *= 0.25;
        body.vel.y *= 0.25;
        p.state = 'idle';
        p.stateTimer = 0;
      }
      return;
    }

    if (p.state === 'windup') {
      if (p.stateTimer >= p.stateDuration) {
        p.state = 'active';
        p.stateTimer = 0;
        p.stateDuration = p.attackKind === 'quick' ? 0.12 : p.attackKind === 'combo' ? 0.16 : 0.16;
        p.hitboxSpawned = false;
        this.spawnPlayerAttackHitbox();
      }
    } else if (p.state === 'active') {
      if (p.stateTimer >= p.stateDuration) {
        p.state = 'recovery';
        p.stateTimer = 0;
        p.stateDuration =
          p.attackKind === 'quick' ? 0.26 : p.attackKind === 'combo' ? 0.34 : 0.48;
      }
    } else if (
      p.state === 'recovery' ||
      p.state === 'dodge' ||
      p.state === 'parry' ||
      p.state === 'hurt'
    ) {
      if (p.stateTimer >= p.stateDuration) {
        p.state = 'idle';
        p.stateTimer = 0;
        p.activeCombo = null;
        p.attackKind = null;
      }
    }
  }

  private triggerPlayerAttack(input: 'K' | 'J'): void {
    const p = this.player;
    const hasCounter = p.counterWindowTimer > 0;
    const match = this.combos.pushInput(input, hasCounter);
    p.comboHints = match.candidates;
    p.inputBuffer = match.buffer;

    if (match.matched) {
      const combo = match.matched;
      const effectiveCost = Math.max(8, Math.round(combo.staminaCost * this.stats.comboStaminaMultiplier));
      if (p.stamina < effectiveCost * 0.5) {
        this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 45, 'LOW STAMINA', '#ffab91', 0.85, 0.5);
        return;
      }
      p.stamina = Math.max(0, p.stamina - effectiveCost);
      p.attackKind = 'combo';
      p.activeCombo = combo;
      p.state = 'windup';
      p.stateTimer = 0;
      p.stateDuration = 0.11;
      p.lastComboBanner = { name: combo.name, color: combo.accentColor, timer: 1.35 };
      this.playerAnim.play('combo_finisher', true, 0.52);
      this.sound.playSwing(true);
      return;
    }

    const isStrong = input === 'J';
    if (!isStrong && p.quickAttackCooldown > 0) {
      this.effects.spawnText(
        this.playerBody.pos.x,
        this.playerBody.pos.y,
        46,
        `QUICK CD (${p.quickAttackCooldown.toFixed(1)}s)`,
        '#80deea',
        0.78,
        0.35
      );
      return;
    }
    if (isStrong && p.heavyAttackCooldown > 0) {
      this.effects.spawnText(
        this.playerBody.pos.x,
        this.playerBody.pos.y,
        46,
        `HEAVY CD (${p.heavyAttackCooldown.toFixed(1)}s)`,
        '#ffab91',
        0.8,
        0.4
      );
      return;
    }
    const cost = isStrong ? 20 : 11;
    if (p.stamina < cost * 0.5) {
      this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 45, 'LOW STAMINA', '#ffab91', 0.85, 0.5);
      return;
    }
    p.stamina = Math.max(0, p.stamina - cost);
    p.attackKind = isStrong ? 'strong' : 'quick';
    p.activeCombo = null;
    p.state = 'windup';
    p.stateTimer = 0;
    // Light attack = 0.50s swing + 1.0s cooldown; Heavy attack = 1.0s swing + 2.0s cooldown
    p.stateDuration = isStrong ? 0.36 : 0.12;
    if (isStrong) p.heavyAttackCooldown = 2.0;
    else p.quickAttackCooldown = 1.0;
    p.swingDir = p.swingDir * -1;
    this.playerAnim.play(isStrong ? 'strong_cleave' : 'quick_slash', true, isStrong ? 1.0 : 0.5);
    this.sound.playSwing(isStrong);
  }

  private spawnPlayerAttackHitbox(): void {
    const p = this.player;
    const toBoss = normalize(sub(this.bossBody.pos, this.playerBody.pos));
    const dir = toBoss.x === 0 && toBoss.y === 0 ? { x: 0, y: -1 } : toBoss;
    const angle = Math.atan2(dir.y, dir.x);
    p.swingAngle = angle;

    const counterBonus = p.counterWindowTimer > 0 ? this.stats.counterMultiplier : 1.0;

    if (p.attackKind === 'combo' && p.activeCombo) {
      const c = p.activeCombo;
      const comboLv = Math.max(1, this.progress.comboLevels?.[c.id] ?? 1);
      const comboLvMul = getComboLevelMultiplier(comboLv);
      applyLunge(this.playerBody, dir, c.lungeSpeed);
      const dmg = Math.round(
        this.stats.baseAttack * c.damageMultiplier * comboLvMul * counterBonus * this.getComboDamageBonusMultiplier()
      );
      const poise = Math.round(c.poiseDamage * comboLvMul * this.stats.poiseBreakMultiplier * counterBonus);

      this.physics.spawnHitbox({
        ownerId: 'player',
        faction: 'player',
        pos: {
          x: this.playerBody.pos.x + dir.x * 50,
          y: this.playerBody.pos.y + dir.y * 50,
        },
        attachOffset: { x: dir.x * 52, y: dir.y * 52 },
        radius: c.hitboxRadius,
        ttl: 0.13,
        damage: dmg,
        poiseDamage: poise,
        knockback: c.knockback,
        attackKind: 'combo',
        direction: dir,
        parryable: false,
        hitsAirborne: true,
        tag: c.guardBreak ? `combo_guardbreak:${c.name}` : `combo:${c.name}`,
      });

      this.effects.spawnSlash(
        this.playerBody.pos.x + dir.x * 38,
        this.playerBody.pos.y + dir.y * 38,
        24,
        c.hitboxRadius,
        angle - 1.35,
        angle + 1.35,
        c.accentColor,
        18,
        0.26
      );
      this.vfx.spawn('combo_burst', this.playerBody.pos.x + dir.x * 46, this.playerBody.pos.y + dir.y * 46, 28, c.accentColor, 1.35);
      this.damageArenaMinionsInRange(
        this.playerBody.pos.x + dir.x * 46,
        this.playerBody.pos.y + dir.y * 46,
        c.hitboxRadius + 30,
        dmg,
        true
      );
      if (p.counterWindowTimer > 0) p.counterWindowTimer = 0;
      return;
    }

    const isStrong = p.attackKind === 'strong';
    applyLunge(this.playerBody, dir, isStrong ? 240 : 155);
    const dmg = Math.round(this.stats.baseAttack * (isStrong ? 1.4 : 0.82) * counterBonus);
    const poise = Math.round((isStrong ? 24 : 10) * this.stats.poiseBreakMultiplier * counterBonus);

    this.physics.spawnHitbox({
      ownerId: 'player',
      faction: 'player',
      pos: {
        x: this.playerBody.pos.x + dir.x * 46,
        y: this.playerBody.pos.y + dir.y * 46,
      },
      attachOffset: { x: dir.x * 48, y: dir.y * 48 },
      radius: isStrong ? 66 : 56,
      ttl: isStrong ? 0.11 : 0.09,
      damage: dmg,
      poiseDamage: poise,
      knockback: isStrong ? 210 : 120,
      attackKind: isStrong ? 'strong' : 'quick',
      direction: dir,
      parryable: false,
      hitsAirborne: false,
      tag: isStrong ? 'strong_slash' : 'quick_slash',
    });

    this.damageArenaMinionsInRange(
      this.playerBody.pos.x + dir.x * 42,
      this.playerBody.pos.y + dir.y * 42,
      isStrong ? 96 : 82,
      dmg,
      isStrong
    );

    const styleSpec = getFightingStyle(this.progress.activeStyleId);
    const swordPal = getActiveSwordPalette(
      this.progress.upgrades,
      this.progress.activeStyleId,
      isEverythingMaxed(this.progress)
    );
    this.effects.spawnSlash(
      this.playerBody.pos.x + dir.x * 34,
      this.playerBody.pos.y + dir.y * 34,
      20,
      isStrong ? 72 : 56,
      angle - (isStrong ? 1.15 : 0.85) * p.swingDir,
      angle + (isStrong ? 1.15 : 0.85) * p.swingDir,
      swordPal.edgeColor,
      isStrong ? 15 : 10,
      0.22
    );
    // Bespoke Fighting Style & Sword-Color visual effect on every strike!
    const styleVfx =
      swordPal.theme === 'inferno'
        ? 'heavy_cleave'
        : styleSpec.id === 'berserker'
        ? 'heavy_cleave'
        : styleSpec.id === 'gale'
        ? 'dodge_afterimage'
        : styleSpec.id === 'bastion'
        ? 'parry_spark'
        : styleSpec.id === 'colossus'
        ? 'stagger_burst'
        : styleSpec.id === 'phantom'
        ? 'combo_burst'
        : isStrong
        ? 'heavy_cleave'
        : 'slash_arc';
    this.vfx.spawn(
      styleVfx,
      this.playerBody.pos.x + dir.x * 44,
      this.playerBody.pos.y + dir.y * 44,
      24,
      swordPal.bladeColor,
      isStrong ? 1.25 : 1.0,
      p.swingDir < 0
    );
    this.effects.spawnBurst(
      this.playerBody.pos.x + dir.x * 36,
      this.playerBody.pos.y + dir.y * 36,
      22,
      swordPal.edgeColor,
      isStrong ? 10 : 6,
      220,
      swordPal.theme === 'inferno' ? 5 : 4
    );
    if (p.counterWindowTimer > 0) p.counterWindowTimer = 0;
  }

  private updateBossCombat(dt: number): void {
    const b = this.boss;
    const body = this.bossBody;
    const stats = b.instance.stats;

    if (b.state === 'defeated') return;

    // Trigger Phase 2 at 55% HP
    if (!b.phaseShifted && b.hp <= b.maxHp * 0.55) {
      b.phaseShifted = true;
      b.phase = 2;
      b.state = 'phase_shift';
      b.stateTimer = 0;
      b.stateDuration = 0.85;
      b.currentMove = null;
      b.isShielding = false;
      b.tellLabel = 'PHASE II — ENRAGED!';
      this.physics.clearHitboxesForOwner('boss');
      this.effects.addShake(11, 0.35);
      this.effects.addFlash(b.instance.template.palette.accent, 0.28);
      this.effects.spawnBurst(body.pos.x, body.pos.y, 30, b.instance.template.palette.accent, 22, 300, 7);
      this.effects.spawnText(body.pos.x, body.pos.y, 90, 'PHASE II!', b.instance.template.palette.accent, 1.45, 1.1);
      this.bossAnim.play('phase_shift', true, 0.85);
      this.vfx.spawn('phase_nova', body.pos.x, body.pos.y, 36, b.instance.template.palette.accent, 1.6);
      this.sound.playBossTelegraph();
      this.spawnBossMinions(2);
      // Guarantee at least 1 Health Pack appears in every Boss Arena!
      if (this.arenaHealthPacks.length === 0) {
        this.arenaHealthPacks.push({
          id: `hp_arena_guaranteed_${Date.now()}`,
          x: (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 110),
          y: 75 + Math.random() * 80,
          healPct: 0.22,
          life: 24,
        });
      }
      return;
    }

    // Boss minion summons (max 2 live minions at once, slightly more breathing room)
    if (b.state === 'neutral' && b.hp > 0) {
      this.bossSummonCooldown -= dt * (b.phase === 2 ? 1.25 : 0.9);
      const aliveMinions = this.arenaMinions.filter((m) => m.state !== 'dead').length;
      if (this.bossSummonCooldown <= 0 && aliveMinions < 2) {
        this.bossSummonCooldown = b.phase === 2 ? 9.5 : 12.5;
        this.spawnBossMinions(1);
      }
    }

    b.stateTimer += dt;

    if (b.state === 'intro' || b.state === 'phase_shift') {
      if (b.stateTimer >= b.stateDuration) {
        b.state = 'neutral';
        b.stateTimer = 0;
        b.tellLabel = '';
        this.bossAnim.play('idle');
      }
      return;
    }

    if (b.state === 'staggered') {
      if (b.stateTimer >= b.stateDuration) {
        b.state = 'neutral';
        b.stateTimer = 0;
        b.poise = b.maxPoise;
        b.tellLabel = '';
        b.decisionCooldown = 0.35;
        this.bossAnim.play('idle');
      }
      return;
    }

    // Regenerate poise when neutral (faster on higher tiers to reward pressure)
    if (b.state === 'neutral') {
      if (this.bossAnim.currentEvent !== 'hurt' || this.bossAnim.isFinished()) {
        this.bossAnim.play('idle');
      }
      b.poise = Math.min(b.maxPoise, b.poise + (6 + b.instance.template.tier * 1.8) * dt);
      b.isShielding = false;

      // Footwork: maintain ideal engagement distance & strafe around player
      const toPlayer = sub(this.playerBody.pos, body.pos);
      const d = dist(this.playerBody.pos, body.pos);
      const dirToPlayer = normalize(toPlayer);
      body.facing = dirToPlayer;

      b.strafeTimer -= dt;
      if (b.strafeTimer <= 0) {
        b.strafeDir = -b.strafeDir;
        b.strafeTimer = 0.75 + Math.random() * 0.9;
      }

      const perp = { x: -dirToPlayer.y * b.strafeDir, y: dirToPlayer.x * b.strafeDir };
      let moveVec = scale(perp, 0.55);
      if (d > 155) {
        moveVec = { x: moveVec.x + dirToPlayer.x * 1.15, y: moveVec.y + dirToPlayer.y * 1.15 };
      } else if (d < 88) {
        moveVec = { x: moveVec.x - dirToPlayer.x * 0.6, y: moveVec.y - dirToPlayer.y * 0.6 };
      }
      this.physics.applyMoveInput('boss', moveVec, 1750, dt);

      b.decisionCooldown -= dt * stats.aggression * (b.phase === 2 ? 1.32 : 1.0);
      if (b.decisionCooldown <= 0 && d < 290) {
        this.startNextBossMove();
      }
      return;
    }

    const move = b.currentMove;
    if (!move) {
      b.state = 'neutral';
      return;
    }
    const step = move.steps[b.stepIndex];
    const spdMul = stats.attackSpeedMul * (b.phase === 2 ? 1.12 : 1.0);

    if (b.state === 'windup') {
      b.isShielding = Boolean(step.guardStance);
      // Track player gently during first 65% of windup, then lock direction so dodging works!
      if (b.stateTimer < b.stateDuration * 0.65) {
        body.facing = normalize(sub(this.playerBody.pos, body.pos));
      }
      // Feint visual dash halfway through feint windup
      if (step.side === 'feint_left_to_right' && b.stateTimer > b.stateDuration * 0.45 && b.stateTimer < b.stateDuration * 0.55) {
        body.vel.x = 320;
      }
      if (b.stateTimer >= b.stateDuration) {
        b.state = 'active';
        b.stateTimer = 0;
        b.stateDuration = step.active;
        b.hitboxSpawned = false;
        this.bossAnim.play('attack', true, Math.max(0.22, step.active * 1.4));
        this.executeBossStepStrike(step);
      }
    } else if (b.state === 'active') {
      if (b.stateTimer >= b.stateDuration) {
        b.state = 'recovery';
        b.stateTimer = 0;
        b.stateDuration = step.recovery / spdMul;
        b.isShielding = false;
        this.bossAnim.play('recovery', true, b.stateDuration);
      }
    } else if (b.state === 'recovery') {
      if (b.stateTimer >= b.stateDuration) {
        // Chain into next step if multi-hit move
        if (b.stepIndex + 1 < move.steps.length) {
          b.stepIndex += 1;
          this.enterBossMoveStep(move.steps[b.stepIndex]);
        } else {
          b.state = 'neutral';
          b.stateTimer = 0;
          b.currentMove = null;
          b.tellLabel = '';
          b.decisionCooldown = (0.4 + Math.random() * 0.28) / stats.aggression;
          b.spamHitsTaken = 0;
          this.bossAnim.play('idle');
        }
      }
    }
  }

  private startNextBossMove(): void {
    const b = this.boss;
    const eligible = b.instance.template.moves.filter((m) => m.minPhase <= b.phase);
    const totalWeight = eligible.reduce((sum, m) => sum + m.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = eligible[0];
    for (const m of eligible) {
      r -= m.weight;
      if (r <= 0) {
        chosen = m;
        break;
      }
    }
    b.currentMove = chosen;
    b.stepIndex = 0;
    this.enterBossMoveStep(chosen.steps[0]);
  }

  private enterBossMoveStep(step: BossMoveStep): void {
    const b = this.boss;
    const spdMul = b.instance.stats.attackSpeedMul * (b.phase === 2 ? 1.12 : 1.0);
    b.state = 'windup';
    b.stateTimer = 0;
    b.stateDuration = Math.max(0.24, step.windup / spdMul);
    b.tellLabel = step.tellLabel;
    b.isShielding = Boolean(step.guardStance);
    this.bossAnim.play(step.guardStance ? 'guard' : 'windup', true, b.stateDuration);

    if (step.jumpVz && step.side === 'aerial') {
      // Leap upward on windup so player sees shadow expand below!
      this.bossBody.vz = step.jumpVz;
    }
    if (step.areaAttack) {
      this.spawnBossAreaTelegraph(step);
    }
    this.sound.playBossTelegraph();
  }

  private spawnBossAreaTelegraph(step: BossMoveStep): void {
    const spec = step.areaAttack!;
    const targets: Array<{ x: number; y: number; radius: number }> = [];
    const px = this.playerBody.pos.x;
    const py = this.playerBody.pos.y;
    const bx = this.bossBody.pos.x;
    const by = this.bossBody.pos.y;

    if (spec.shape === 'ring') {
      targets.push({ x: bx, y: by, radius: spec.radius });
    } else if (spec.shape === 'cross') {
      targets.push({ x: px, y: py, radius: spec.radius });
      targets.push({ x: bx, y: by + 70, radius: spec.radius });
    } else if (spec.shape === 'lanes') {
      const laneXs = [-210, 0, 210];
      for (let i = 0; i < Math.min(spec.count, laneXs.length); i++) {
        const lx = laneXs[i] + (Math.random() - 0.5) * 40;
        targets.push({ x: lx, y: -30, radius: spec.radius });
        targets.push({ x: lx, y: 115, radius: spec.radius });
      }
    } else {
      // Targeted zones: 1 directly under player + remaining spread across arena
      targets.push({ x: px, y: py, radius: spec.radius });
      for (let i = 1; i < spec.count; i++) {
        targets.push({
          x: (Math.random() * 2 - 1) * 265,
          y: -95 + Math.random() * 255,
          radius: spec.radius,
        });
      }
    }

    const dmg = Math.round(this.boss.instance.stats.attackDamage * step.damageMul);
    this.activeAreaAttacks.push({
      id: `area_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      spec,
      phase: 'telegraph',
      elapsed: 0,
      windupDuration: this.boss.stateDuration,
      activeDuration: Math.max(0.45, step.active),
      targets,
      damage: dmg,
      knockback: step.knockback,
      parryable: step.parryable,
      detonated: false,
    });
  }

  private updateAreaAttacks(dt: number): void {
    for (let i = this.activeAreaAttacks.length - 1; i >= 0; i--) {
      const atk = this.activeAreaAttacks[i];
      atk.elapsed += dt;
      if (atk.phase === 'telegraph') {
        if (this.boss.state === 'staggered' || this.boss.state === 'defeated') {
          this.activeAreaAttacks.splice(i, 1);
          continue;
        }
        if (atk.elapsed >= atk.windupDuration) {
          atk.phase = 'active';
          atk.elapsed = 0;
          if (!atk.detonated) {
            atk.detonated = true;
            this.effects.addShake(9, 0.24);
            this.sound.playHit(true, true);
            for (const tgt of atk.targets) {
              this.physics.spawnHitbox({
                ownerId: 'boss',
                faction: 'boss',
                pos: { x: tgt.x, y: tgt.y },
                radius: tgt.radius * 0.9,
                ttl: 0.22,
                damage: atk.damage,
                poiseDamage: 22,
                knockback: atk.knockback,
                attackKind: 'boss_heavy',
                direction: normalize(sub(this.playerBody.pos, tgt)),
                parryable: atk.parryable,
                hitsAirborne: true,
                tag: `area_${atk.spec.visual}`,
              });
              this.effects.spawnBurst(tgt.x, tgt.y, 18, atk.spec.color, 8, 220, 5);
            }
          }
        }
      } else if (atk.elapsed >= atk.activeDuration) {
        this.activeAreaAttacks.splice(i, 1);
      }
    }
  }

  private executeBossStepStrike(step: BossMoveStep): void {
    const b = this.boss;
    const body = this.bossBody;
    const dir = normalize(sub(this.playerBody.pos, body.pos));
    const attackDir = dir.x === 0 && dir.y === 0 ? { x: 0, y: 1 } : dir;
    body.facing = attackDir;

    if (step.damageMul <= 0 || step.hitboxRadius <= 0 || step.areaAttack) return;

    applyLunge(body, attackDir, step.lungeSpeed, step.side === 'center' && step.jumpVz ? step.jumpVz : 0);

    const dmg = Math.round(b.instance.stats.attackDamage * step.damageMul);
    const offsetDist = body.radius * 0.95;

    this.physics.spawnHitbox({
      ownerId: 'boss',
      faction: 'boss',
      pos: {
        x: body.pos.x + attackDir.x * offsetDist,
        y: body.pos.y + attackDir.y * offsetDist,
      },
      attachOffset: { x: attackDir.x * offsetDist, y: attackDir.y * offsetDist },
      radius: step.hitboxRadius,
      ttl: step.active,
      damage: dmg,
      poiseDamage: 20,
      knockback: step.knockback,
      attackKind: step.damageMul >= 1.3 ? 'boss_heavy' : 'boss_light',
      direction: attackDir,
      parryable: step.parryable,
      hitsAirborne: true,
      tag: `${b.currentMove?.id ?? 'boss_strike'}_${step.side}`,
    });

    const ang = Math.atan2(attackDir.y, attackDir.x);
    this.effects.spawnSlash(
      body.pos.x + attackDir.x * 42,
      body.pos.y + attackDir.y * 42,
      26,
      step.hitboxRadius,
      ang - 1.25,
      ang + 1.25,
      b.instance.template.palette.accent,
      16,
      0.22
    );
    this.sound.playSwing(true);
  }

  private handleHitEvent(ev: HitEvent): void {
    // -----------------------------------------------------------------------
    // PLAYER STRUCK BOSS
    // -----------------------------------------------------------------------
    if (ev.attackerId === 'player' && ev.targetId === 'boss') {
      const b = this.boss;
      const isGuardBreak = ev.tag.startsWith('combo_guardbreak:');
      const isCombo = ev.attackKind === 'combo';
      const isStrong = ev.attackKind === 'strong';

      // Check boss shield guard (Ironjaw)
      if (b.isShielding && !isGuardBreak) {
        const chip = Math.max(2, Math.round(ev.damage * 0.18));
        b.hp = Math.max(1, b.hp - chip);
        this.sound.playGuardClang();
        this.vfx.spawn('guard_clang', ev.contactPoint.x, ev.contactPoint.y, 32, '#ffd54f', 1.2);
        this.effects.spawnBurst(ev.contactPoint.x, ev.contactPoint.y, 28, '#ffd54f', 12, 220, 5);
        this.effects.spawnText(ev.contactPoint.x, ev.contactPoint.y, 60, `GUARDED (${chip})`, '#ffd54f', 0.95, 0.7);
        return;
      }

      let finalDmg = ev.damage;
      let finalPoise = ev.poiseDamage;
      const isCleanOpening =
        b.state === 'recovery' ||
        b.state === 'staggered' ||
        (b.state === 'windup' && Boolean(b.currentMove?.steps[b.stepIndex]?.vulnerableTaunt));

      // Timing Reward vs Anti-Spam Bracing (Punch-Out!! discipline!)
      if (b.state === 'staggered') {
        finalDmg = Math.round(finalDmg * 1.45);
      } else if (b.state === 'recovery') {
        finalDmg = Math.round(finalDmg * 1.15);
      } else if (!isCleanOpening) {
        // Boss is braced in neutral or mid-attack -> reduced chip + tracks spam retaliation!
        finalDmg = Math.max(6, Math.round(finalDmg * 0.65));
        finalPoise = Math.round(finalPoise * 0.65);
        b.spamHitsTaken += 1;
      }

      // Critical Hit roll (Duelist's Precision!)
      const isCrit = this.stats.critChance > 0 && Math.random() < this.stats.critChance;
      if (isCrit) {
        finalDmg = Math.round(finalDmg * this.stats.critMultiplier);
      }

      // Enforce minimum ~10-hit boss durability (10% normal, 13% on Crit/Staggered)
      const hitCap = Math.max(8, Math.floor(b.maxHp * (b.state === 'staggered' || isCrit ? 0.13 : 0.1)));
      finalDmg = Math.min(finalDmg, hitCap);

      if (isCombo) {
        this.triggerAdrenalineHeal('combo');
      }

      // Bonus poise & interrupt on vulnerable taunt
      const activeStep = b.currentMove?.steps[b.stepIndex];
      if (b.state === 'windup' && activeStep?.vulnerableTaunt) {
        finalPoise = Math.round(finalPoise * 2.5);
        this.effects.spawnText(ev.contactPoint.x, ev.contactPoint.y, 75, 'INTERRUPTED!', '#76ff03', 1.15, 0.8);
      }

      // Guard shatter!
      if (b.isShielding && isGuardBreak) {
        b.isShielding = false;
        finalPoise = b.poise + 10; // Force immediate stagger!
        this.effects.spawnText(ev.contactPoint.x, ev.contactPoint.y, 82, 'GUARD SHATTERED!', '#ff9100', 1.3, 0.95);
      }

      b.hp = Math.max(0, b.hp - finalDmg);
      b.poise = Math.max(0, b.poise - finalPoise);
      b.flashTimer = 0.12;

      this.player.comboCount += 1;
      this.player.comboDecayTimer = 2.4;

      this.sound.playHit(isStrong || isCombo, isCombo);
      if (b.state === 'neutral' || b.state === 'recovery') {
        this.bossAnim.play('hurt', true, 0.28);
      }
      this.vfx.spawn('impact_hit', ev.contactPoint.x, ev.contactPoint.y, 30, isCombo ? '#ffd54f' : '#ffffff', isCombo ? 1.3 : 1.0);
      this.effects.addShake(isCombo ? 9 : isStrong ? 6 : 3, isCombo ? 0.2 : 0.12);
      this.effects.spawnBurst(
        ev.contactPoint.x,
        ev.contactPoint.y,
        28,
        isCombo ? '#ffd966' : !isCleanOpening ? '#90a4ae' : '#ffffff',
        isCombo ? 16 : 9,
        240,
        isCombo ? 6 : 4
      );
      this.effects.spawnText(
        ev.contactPoint.x + (Math.random() - 0.5) * 24,
        ev.contactPoint.y,
        52,
        isCrit ? `${finalDmg} CRIT!` : !isCleanOpening ? `${finalDmg} (BRACED)` : `${finalDmg}${isCombo ? '!' : ''}`,
        isCrit ? '#ffea00' : b.state === 'staggered' ? '#ffd740' : !isCleanOpening ? '#b0bec5' : isCombo ? '#7be3ff' : '#ffffff',
        isCrit ? 1.38 : isCombo ? 1.25 : isStrong ? 1.1 : 0.95,
        0.78
      );

      // Anti-Spam Retaliation: 4 greedy hits into a braced neutral boss snaps an immediate counter-attack!
      if (b.state === 'neutral' && b.spamHitsTaken >= 4 && b.hp > 0 && b.poise > 0) {
        b.spamHitsTaken = 0;
        this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 88, 'COUNTER-ATTACK!', '#ff5252', 1.25, 0.85);
        this.startNextBossMove();
      }

      // Boss Stagger!
      if (b.poise <= 0 && b.state !== 'staggered' && b.hp > 0) {
        this.staggerBoss(2.25);
      }

      // Boss Defeated!
      if (b.hp <= 0) {
        this.handleBossDefeated();
      }
      return;
    }

    // -----------------------------------------------------------------------
    // BOSS STRUCK PLAYER (HIT, PARRIED, OR DODGED)
    // -----------------------------------------------------------------------
    if (ev.attackerId === 'boss' && ev.targetId === 'player') {
      if (ev.resolution === 'parried') {
        this.sound.playParry();
        this.triggerAdrenalineHeal('parry');
        this.playerAnim.play('parry_success', true, 0.45);
        this.vfx.spawn('parry_spark', ev.contactPoint.x, ev.contactPoint.y, 34, '#ffd54f', 1.45);
        this.player.counterWindowTimer = this.physics.config.counterWindowDuration;
        this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 24);
        // Feed 'L' into combo engine so L -> J (Steel Riposte) or L -> K -> J triggers!
        const match = this.combos.pushInput('L', true);
        this.player.comboHints = match.candidates;
        this.player.inputBuffer = match.buffer;

        this.effects.addShake(10, 0.22);
        this.effects.addFlash('#ffd966', 0.3);
        this.effects.spawnBurst(ev.contactPoint.x, ev.contactPoint.y, 32, '#ffd966', 24, 340, 6);
        this.effects.spawnText(ev.contactPoint.x, ev.contactPoint.y, 70, 'PARRY! COUNTER!', '#ffd966', 1.35, 0.95);

        // Heavy poise damage on boss; if boss was aerial diving or shield-bashing, instant stagger!
        this.boss.poise = Math.max(0, this.boss.poise - Math.round(this.boss.maxPoise * 0.45));
        const activeStep = this.boss.currentMove?.steps[this.boss.stepIndex];
        if (this.boss.poise <= 0 || activeStep?.side === 'aerial' || this.boss.currentMove?.id === 'shield_bash') {
          this.bossBody.z = 0;
          this.bossBody.vz = 0;
          this.staggerBoss(2.4);
        } else {
          // Interrupt current boss chain
          this.physics.clearHitboxesForOwner('boss');
          this.boss.state = 'recovery';
          this.boss.stateTimer = 0;
          this.boss.stateDuration = 0.85;
          this.boss.tellLabel = 'DEFLECTED!';
        }
        return;
      }

      if (ev.resolution === 'dodged') {
        this.sound.playDodge();
        this.player.counterWindowTimer = this.physics.config.counterWindowDuration;
        this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 14);
        const match = this.combos.pushInput('L', true);
        this.player.comboHints = match.candidates;
        this.player.inputBuffer = match.buffer;

        this.effects.spawnBurst(this.playerBody.pos.x, this.playerBody.pos.y, 20, '#80deea', 12, 200, 4);
        this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 64, 'PERFECT EVADE!', '#80deea', 1.15, 0.8);
        return;
      }

      // Direct hit on player (mitigated by Tempered Plate & Grit Shield!)
      const taken = this.applyPlayerIncomingDamage(ev.damage);
      this.player.state = 'hurt';
      this.player.stateTimer = 0;
      this.player.stateDuration = 0.28;
      this.player.comboCount = 0;
      this.combos.resetBuffer();
      this.physics.clearHitboxesForOwner('player');

      this.sound.playPlayerHurt();
      this.playerAnim.play('hurt', true, 0.34);
      this.vfx.spawn('impact_hit', ev.contactPoint.x, ev.contactPoint.y, 28, '#ff5252', 1.15);
      this.effects.addShake(11, 0.25);
      this.effects.addFlash('#ff1744', 0.34);
      this.effects.spawnBurst(ev.contactPoint.x, ev.contactPoint.y, 24, '#ff5252', 14, 240, 5);
      this.effects.spawnText(
        this.playerBody.pos.x,
        this.playerBody.pos.y,
        60,
        taken === 0 ? 'GRIT BLOCKED!' : `-${taken}`,
        taken === 0 ? '#80deea' : '#ff5252',
        1.2,
        0.85
      );

      if (this.player.hp <= 0) {
        this.handlePlayerDeath();
      }
    }
  }

  private staggerBoss(duration: number): void {
    const tierReduction = (this.boss.instance.template.tier - 1) * 0.16;
    const effectiveDuration = Math.max(1.35, duration - tierReduction);
    this.boss.state = 'staggered';
    this.boss.stateTimer = 0;
    this.boss.stateDuration = effectiveDuration;
    this.boss.currentMove = null;
    this.boss.isShielding = false;
    this.boss.tellLabel = 'STAGGERED — UNLEASH COMBOS!';
    this.physics.clearHitboxesForOwner('boss');
    this.sound.playBossStagger();
    this.bossAnim.play('stagger', true);
    this.vfx.spawn('stagger_burst', this.bossBody.pos.x, this.bossBody.pos.y, 52, '#ffd740', 1.4);
    this.effects.addShake(9, 0.25);
    this.effects.spawnBurst(this.bossBody.pos.x, this.bossBody.pos.y, 50, '#ffd740', 18, 260, 6);
    this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 92, 'STAGGERED!', '#ffd740', 1.4, 1.0);
  }

  private handleBossDefeated(): void {
    const inst = this.boss.instance;
    this.boss.state = 'defeated';
    this.boss.tellLabel = 'VANQUISHED';
    this.physics.clearHitboxesForOwner('boss');

    const bountyMul = this.getBountyBonusMultiplier();
    const gold = Math.max(3, Math.round(inst.stats.goldReward * bountyMul));
    const xp = Math.round(inst.stats.xpReward * bountyMul);

    const awardedGold = this.awardGold(gold, 640, 290);
    const awardedXp = this.awardXp(xp, 640, 326);
    this.progress.totalBossesDefeated += 1;

    if (this.isRaidFight) {
      // Area Raid Victory: Guaranteed +2 Level Points & 5% chance to choose ANY skill to boost its max level cap (+3)!
      this.progress.skillPoints += 2;
      const skillCapUpgradeAvailable = Math.random() < 0.05;
      if (this.roadRaidPortal) {
        this.roadRaidPortal.cleared = true;
      }
      this.runSummary.lastRaidReward = {
        bossName: inst.template.name,
        gold: awardedGold,
        xp: awardedXp,
        skillPoints: 2,
        skillCapUpgradeAvailable,
        skillCapUpgradeClaimed: false,
      };
    } else {
      this.progress.highestTierCleared = Math.max(this.progress.highestTierCleared, inst.template.tier);
      this.runSummary.lastBossReward = { gold: awardedGold, xp: awardedXp, bossName: inst.template.name };
    }
    saveProgress(this.progress);

    this.runSummary.bossesDefeatedThisRun += 1;

    this.sound.playHit(true, true);
    this.bossAnim.play('defeated', true, 2.25);
    this.playerAnim.play('victory_pose', true);
    this.effects.addFlash('#ffd966', 0.42);
    this.effects.addShake(12, 0.35);
    this.effects.spawnBurst(this.bossBody.pos.x, this.bossBody.pos.y, 40, '#ffd966', 28, 320, 7);
    this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 96, 'VANQUISHED!', '#ffd740', 1.6, 1.9);

    this.bossDefeatTimer = 2.35;
    this.bossDefeatBurstStage = 0;
    // Also dissolve any remaining summoned minions!
    for (const m of this.arenaMinions) {
      if (m.state !== 'dead') {
        m.hp = 0;
        m.state = 'dead';
        m.stateDuration = 1.1;
        m.animFrame = 0;
        m.animElapsed = 0;
      }
    }
    this.notifyUI();
  }

  public spawnBossMinions(count: number): void {
    const inst = this.boss.instance;
    const spawned = spawnRoadGuardians(
      inst.template.biome,
      Math.round(inst.stats.maxHp * 0.42),
      Math.round(inst.stats.attackDamage * 0.72),
      inst.stats.goldReward,
      inst.stats.xpReward,
      400,
      inst.template.tier,
      this.stats.baseAttack
    ).filter((g) => !g.isMiniBoss);

    for (let i = 0; i < count && i < spawned.length; i++) {
      const m = spawned[i];
      const side = this.arenaMinions.length % 2 === 0 ? -1 : 1;
      const sx = Math.max(-280, Math.min(280, this.bossBody.pos.x + side * (120 + Math.random() * 60)));
      const sy = Math.max(-160, Math.min(40, this.bossBody.pos.y + 35));
      this.arenaMinions.push({
        ...m,
        x: sx,
        y: sy,
        scaleMul: Math.min(1.05, m.scaleMul * 0.92),
      });
      this.vfx.spawn('phase_nova', sx, sy, 20, m.variantColor, 0.85);
    }
    this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 108, count > 1 ? 'SUMMONS PACK!' : 'SUMMONS MINION!', inst.template.palette.accent, 1.15, 1.0);
  }

  private updatePetCompanion(dt: number): void {
    if (this.stats.petLevel <= 0 || this.boss.state === 'defeated') return;
    if (this.petAttackFlash > 0) this.petAttackFlash = Math.max(0, this.petAttackFlash - dt);

    this.petAttackTimer -= dt;
    if (this.petAttackTimer <= 0) {
      this.petAttackTimer = Math.max(1.5, 2.7 - this.stats.petLevel * 0.08);
      this.petAttackFlash = 0.35;
      const petDmg = Math.min(this.stats.petDamage, Math.max(12, Math.floor(this.boss.maxHp * 0.06)));

      // Bite nearest live arena minion first, otherwise bite the boss!
      const liveMinion = this.arenaMinions.find((m) => m.state !== 'dead');
      if (liveMinion) {
        liveMinion.hp = Math.max(0, liveMinion.hp - petDmg);
        this.vfx.spawn('impact_hit', liveMinion.x, liveMinion.y, 24, '#ffd54f', 0.9);
        this.effects.spawnText(liveMinion.x, liveMinion.y, 50, `PET ${petDmg}!`, '#ffd54f', 0.95, 0.7);
        if (liveMinion.hp <= 0) {
          liveMinion.state = 'dead';
          liveMinion.stateDuration = 1.15;
          liveMinion.animFrame = 0;
          liveMinion.animElapsed = 0;
          this.triggerAdrenalineHeal('kill');
        }
      } else if (this.boss.hp > 0) {
        this.boss.hp = Math.max(1, this.boss.hp - petDmg);
        this.boss.poise = Math.max(0, this.boss.poise - Math.round(10 + this.stats.petLevel * 2));
        this.vfx.spawn('impact_hit', this.bossBody.pos.x, this.bossBody.pos.y, 30, '#ffd54f', 1.0);
        this.effects.spawnText(this.bossBody.pos.x, this.bossBody.pos.y, 64, `PET ${petDmg}!`, '#ffd54f', 1.0, 0.75);
      }
    }
  }

  private damageArenaMinionsInRange(cx: number, cy: number, radius: number, dmg: number, isHeavy: boolean): void {
    for (const m of this.arenaMinions) {
      if (m.state === 'dead') continue;
      if (Math.hypot(m.x - cx, m.y - cy) > radius + 36) continue;
      let dealt = dmg;
      if (m.isShielded) {
        if (isHeavy) {
          m.isShielded = false;
          this.sound.playGuardClang();
        } else {
          dealt = Math.max(5, Math.round(dmg * 0.4));
          this.sound.playGuardClang();
        }
      }
      m.hp = Math.max(0, m.hp - dealt);
      m.state = m.hp <= 0 ? 'dead' : 'hurt';
      m.stateTimer = 0;
      m.stateDuration = m.hp <= 0 ? 1.15 : 0.24;
      m.animFrame = 0;
      m.animElapsed = 0;
      this.effects.spawnText(m.x, m.y, 44, `${dealt}`, m.hp <= 0 ? '#ffd54f' : '#ffffff', 0.95, 0.65);
      if (m.hp <= 0) {
        const bountyMul = this.getBountyBonusMultiplier();
        const gold = Math.max(1, Math.round(m.goldReward * bountyMul));
        const xp = Math.round(m.xpReward * bountyMul);
        this.runSummary.guardiansSlainThisRun += 1;
        this.awardGold(gold, 640 + m.x * 0.7, 360);
        this.awardXp(xp, 640 + m.x * 0.7, 392);
        this.triggerAdrenalineHeal('kill');
        // 25% random chance for a boss-summoned minion to drop an Arena Health Pack!
        if (Math.random() < 0.25) {
          this.arenaHealthPacks.push({
            id: `hp_arena_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            x: m.x,
            y: m.y,
            healPct: 0.18,
            life: 14,
          });
        }
        saveProgress(this.progress);
      }
    }
  }

  private updateArenaMinions(dt: number): void {
    // Update & collect dropped Arena Health Packs!
    for (let i = this.arenaHealthPacks.length - 1; i >= 0; i--) {
      const pk = this.arenaHealthPacks[i];
      pk.life -= dt;
      if (pk.life <= 0) {
        this.arenaHealthPacks.splice(i, 1);
        continue;
      }
      if (Math.hypot(this.playerBody.pos.x - pk.x, this.playerBody.pos.y - pk.y) < 54) {
        const healAmt = Math.max(18, Math.round(this.player.maxHp * pk.healPct));
        this.healPlayer(healAmt, 'pack');
        this.vfx.spawn('shrine_heal', this.playerBody.pos.x, this.playerBody.pos.y, 24, '#69f0ae', 1.1);
        this.effects.addFlash('#69f0ae', 0.2);
        this.sound.playVictory();
        this.arenaHealthPacks.splice(i, 1);
      }
    }

    for (let i = this.arenaMinions.length - 1; i >= 0; i--) {
      const m = this.arenaMinions[i];
      m.animElapsed += dt;
      const frames = m.state === 'dead' ? 18 : m.state === 'windup' ? 14 : 12;
      if (m.state === 'dead') {
        m.animFrame = Math.min(frames - 1, Math.floor((m.animElapsed / Math.max(0.5, m.stateDuration)) * frames));
        if (m.animElapsed >= m.stateDuration) {
          this.arenaMinions.splice(i, 1);
        }
        continue;
      }
      m.animFrame =
        m.state === 'idle'
          ? Math.floor(m.animElapsed * 12) % frames
          : Math.min(frames - 1, Math.floor(m.animElapsed * 24));

      if (m.state === 'hurt') {
        m.stateTimer += dt;
        if (m.stateTimer >= m.stateDuration) {
          m.state = 'idle';
          m.stunned = false;
          m.stateTimer = 0;
        }
        continue;
      }

      const dx = this.playerBody.pos.x - m.x;
      const dy = this.playerBody.pos.y - m.y;
      const d = Math.hypot(dx, dy);

      if (m.state === 'idle') {
        if (d > 68) {
          const spd = m.moveSpeed * 0.72;
          m.x += (dx / d) * spd * dt;
          m.y += (dy / d) * spd * dt;
        }
        m.attackCooldown -= dt;
        if (m.attackCooldown <= 0 && d < 96) {
          m.state = 'windup';
          m.stateTimer = 0;
          m.stateDuration = m.windupDuration + 0.1;
          m.hitDealt = false;
          m.animElapsed = 0;
        }
      } else if (m.state === 'windup') {
        m.stateTimer += dt;
        if (m.stateTimer >= m.stateDuration) {
          m.state = 'attack';
          m.stateTimer = 0;
          m.stateDuration = 0.2;
          m.animElapsed = 0;
        }
      } else if (m.state === 'attack') {
        m.stateTimer += dt;
        if (!m.hitDealt && m.stateTimer >= 0.06) {
          m.hitDealt = true;
          if (d < 86) {
            const pDef = this.playerBody.defense;
            const activeDef = pDef.mode !== 'none' && pDef.timer >= pDef.iFrameStart && pDef.timer <= pDef.iFrameEnd;
            if (pDef.mode === 'parry' && activeDef) {
              this.sound.playParry();
              this.playerAnim.play('parry_success', true, 0.4);
              this.vfx.spawn('parry_spark', m.x, m.y, 26, '#ffd54f', 1.15);
              m.isShielded = false;
              m.hp = Math.max(0, m.hp - Math.round(this.stats.baseAttack * 1.4));
              m.state = m.hp <= 0 ? 'dead' : 'hurt';
              m.stateDuration = m.hp <= 0 ? 1.15 : 0.6;
              m.animFrame = 0;
              m.animElapsed = 0;
            } else if (pDef.mode === 'dodge' && activeDef) {
              this.sound.playDodge();
            } else {
              const taken = this.applyPlayerIncomingDamage(m.damage);
              this.playerAnim.play('hurt', true, 0.26);
              this.sound.playPlayerHurt();
              this.effects.addShake(6, 0.16);
              this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 56, taken === 0 ? 'BLOCKED!' : `-${taken}`, taken === 0 ? '#80deea' : '#ff5252', 1.0, 0.7);
              if (this.player.hp <= 0) {
                this.handlePlayerDeath();
                return;
              }
            }
          }
        }
        if (m.stateTimer >= m.stateDuration) {
          m.state = 'idle';
          m.stateTimer = 0;
          m.attackCooldown = 1.2 + Math.random() * 0.5;
        }
      }
    }
  }

  private handlePlayerDeath(): void {
    this.player.state = 'dead';
    this.isRaidFight = false;
    this.physics.clearHitboxesForOwner('player');
    this.physics.clearHitboxesForOwner('boss');

    // Award modest partial bounty for damage dealt to the current boss
    const dmgRatio = this.screen === 'combat' ? 1 - this.boss.hp / Math.max(1, this.boss.maxHp) : 0;
    const partialGold = Math.round(this.boss.instance.stats.goldReward * dmgRatio * 0.25);
    const partialXp = Math.round(this.boss.instance.stats.xpReward * dmgRatio * 0.45);

    this.awardGold(partialGold, 640, 330);
    this.awardXp(partialXp, 640, 365);
    this.progress.runCount += 1;
    this.runSummary.outcome = 'defeat';
    saveProgress(this.progress);

    this.sound.playDeath();
    this.playerAnim.play('death', true, 1.25);
    if (this.screen === 'combat') {
      this.effects.spawnText(this.playerBody.pos.x, this.playerBody.pos.y, 76, 'FALLEN...', '#ff5252', 1.45, 1.2);
      this.playerDeathTimer = 1.35;
    } else {
      this.screen = 'run_summary';
    }
    this.notifyUI();
  }
}
