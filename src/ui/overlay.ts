import type { GameEngine } from '../game/gameEngine';
import {
  MAX_COMBO_LEVEL,
  UPGRADE_SPECS,
  getComboLevelMultiplier,
  getComboUpgradeCosts,
  getMaxedUpgradeSummary,
  getUpgradeCost,
  getUpgradeXpCost,
  isEverythingMaxed,
  resetProgress,
  saveProgress,
  type UpgradeCategory,
  type UpgradeId,
} from '../game/progression';
import {
  buildCustomCombo,
  type ComboInput,
  type ComboVisualStyle,
} from '../combos';
import { DEFAULT_PHYSICS_CONFIG } from '../physics';
import type { SoundEngine } from '../audio/soundEngine';
import { renderBossPortraitDataUrl } from '../render/bossPixelSprites';
import { FIGHTING_STYLES, getStyleUpgradeCost, type FightingStyleId } from '../game/fightingStyles';

type SanctuaryTab = 'upgrades' | 'gear' | 'pets' | 'styles' | 'combos' | 'forge';

export class UIOverlay {
  private container: HTMLElement;
  private engine: GameEngine;
  private sound: SoundEngine;
  private activeTab: SanctuaryTab = 'upgrades';

  // Custom Combo Forge draft state
  private draftName = 'Steel Tempest';
  private draftSeq: ComboInput[] = ['K', 'J', 'K'];
  private draftStyle: ComboVisualStyle = 'sunder';

  constructor(container: HTMLElement, engine: GameEngine, sound: SoundEngine) {
    this.container = container;
    this.engine = engine;
    this.sound = sound;
    this.engine.uiDirtyCallback = () => this.render();
    this.render();
  }

  public render(resetScroll = false): void {
    const prevScrollEl = this.container.querySelector<HTMLElement>('.shop-scroll');
    const savedScrollTop = resetScroll ? 0 : prevScrollEl ? prevScrollEl.scrollTop : 0;

    const e = this.engine;
    let html = this.renderTopTools();

    if (e.showPhysicsDebug) {
      html += this.renderPhysicsDrawer();
    }

    if (e.screen === 'title') {
      html += this.renderTitleScreen();
    } else if (e.screen === 'tale_of_tape') {
      html += this.renderTaleOfTape();
    } else if (e.screen === 'victory_boss') {
      html += this.renderBossVictory();
    } else if (e.screen === 'victory_run') {
      html += this.renderRunVictory();
    } else if (e.screen === 'sanctuary') {
      html += this.renderSanctuary();
    }

    this.container.innerHTML = html;
    this.bindEvents();

    const nextScrollEl = this.container.querySelector<HTMLElement>('.shop-scroll');
    if (nextScrollEl && savedScrollTop > 0) {
      nextScrollEl.scrollTop = savedScrollTop;
    }
  }

  private renderTopTools(): string {
    const muteLabel = this.sound.muted ? 'Audio: Off' : 'Audio: On';
    const physLabel = this.engine.showPhysicsDebug ? 'Physics Lab: On' : 'Physics Lab (F1)';
    const showSanctuaryBtn = this.engine.screen === 'path' || this.engine.screen === 'combat';
    return `
      <div class="top-tools">
        ${showSanctuaryBtn ? `<button class="btn btn-secondary btn-sm" data-action="open-sanctuary">Sanctuary</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-action="toggle-physics">${physLabel}</button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-mute">${muteLabel}</button>
      </div>
    `;
  }

  private renderPhysicsDrawer(): string {
    const c = this.engine.physics.config;
    const sliders: Array<{ key: keyof typeof c; label: string; min: number; max: number; step: number }> = [
      { key: 'playerMaxSpeed', label: 'Player Move Speed', min: 180, max: 500, step: 10 },
      { key: 'playerFriction', label: 'Ground Friction', min: 4, max: 20, step: 0.5 },
      { key: 'dodgeSpeed', label: 'Dodge Burst Speed', min: 380, max: 920, step: 20 },
      { key: 'dodgeDuration', label: 'Dodge Duration (s)', min: 0.16, max: 0.45, step: 0.02 },
      { key: 'parryWindow', label: 'Parry Window (s)', min: 0.1, max: 0.4, step: 0.02 },
      { key: 'hitstopParry', label: 'Parry Hitstop (s)', min: 0.02, max: 0.22, step: 0.01 },
      { key: 'knockbackDecay', label: 'Knockback Decay', min: 4, max: 20, step: 0.5 },
    ];

    return `
      <div class="physics-drawer">
        <h3>
          <span>Isolated Physics Lab</span>
          <button class="btn btn-secondary btn-sm" data-action="reset-physics">Reset</button>
        </h3>
        ${sliders
          .map(
            (s) => `
          <div class="slider-row">
            <label><span>${s.label}</span><span>${Number(c[s.key]).toFixed(2)}</span></label>
            <input type="range" data-phys-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${c[s.key]}" />
          </div>
        `
          )
          .join('')}
        <div style="color:#94a3b8;font-size:11px;margin-top:4px;">
          Live hitboxes & hurtboxes active. Edits apply directly to <code>src/physics/</code>.
        </div>
      </div>
    `;
  }

  private renderTitleScreen(): string {
    const p = this.engine.progress;
    return `
      <div class="overlay-screen">
        <div class="card">
          <div class="title-logo">OATHBLADE</div>
          <div class="subtitle">Gauntlet of Ten — Fantasy Swordplay × Punch-Out!! Boss Duel Roguelite</div>
          <p style="text-align:center;color:#cbd5e1;font-size:14px;line-height:1.5;">
            Walk the perilous fantasy trail armed with nothing but forged steel, footwork, and instinct.
            Read each monster's telegraphs, parry or evade their strikes, unleash martial combos, and spend Gold &amp; XP at the Sanctuary after every fall.
          </p>
          <div class="controls-grid">
            <div class="control-chip"><kbd>W A S D</kbd>Walk trail &amp; strafe arena</div>
            <div class="control-chip"><kbd>K</kbd>Quick Strike (fast combo starter)</div>
            <div class="control-chip"><kbd>J</kbd>Strong Cleave (heavy &amp; poise break)</div>
            <div class="control-chip"><kbd>L</kbd>Parry (neutral) / Dodge (+WASD)</div>
          </div>
          <div style="text-align:center;font-size:13px;color:#94a3b8;">
            Run #${p.runCount} &nbsp;•&nbsp; Highest Tier Cleared: ${p.highestTierCleared}/${this.engine.gauntlet.length} &nbsp;•&nbsp;
            <span class="currency-gold">${p.gold} Gold</span> &nbsp;•&nbsp;
            <span class="currency-xp">${p.xp} XP</span>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" data-action="start-run">Embark on the Trail</button>
            <button class="btn btn-secondary" data-action="open-sanctuary">Sanctuary Forge &amp; Combos</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderTaleOfTape(): string {
    const b = this.engine.boss.instance;
    const v = b.stats.variancePct;
    const fmtDelta = (n: number) =>
      n >= 0 ? `<span class="delta-up">+${n}%</span>` : `<span class="delta-down">${n}%</span>`;

    const portraitUrl = renderBossPortraitDataUrl(b.template.visualId, b.template.palette.accent);

    return `
      <div class="overlay-screen">
        <div class="card">
          <div class="tape-header" style="align-items:center;gap:16px;">
            <div style="display:flex;align-items:center;gap:14px;">
              ${
                portraitUrl
                  ? `<img src="${portraitUrl}" alt="${b.template.name}" style="width:92px;height:92px;image-rendering:pixelated;background:rgba(0,0,0,0.45);border:2px solid ${b.template.palette.accent};border-radius:10px;padding:4px;" />`
                  : ''
              }
              <div>
                <div class="tape-tier">Tier ${b.template.tier} of ${this.engine.gauntlet.length} • Tale of the Tape</div>
                <div class="tape-name">${b.template.name}, ${b.template.title}</div>
              </div>
            </div>
            <div style="text-align:right;font-size:13px;">
              <div class="currency-gold">Bounty: ${b.stats.goldReward} Gold</div>
              <div class="currency-xp">Reward: ${b.stats.xpReward} XP</div>
            </div>
          </div>

          <p style="color:#e2e8f0;font-size:14px;margin-bottom:6px;">
            <strong>Fighting Style:</strong> ${b.template.fightingStyle}
          </p>
          <p style="color:#94a3b8;font-size:13px;font-style:italic;">
            "${b.template.lore}"
          </p>

          <div class="trait-row">
            ${b.traits
              .map(
                (t) =>
                  `<span class="trait-badge" style="background:${t.badgeColor}">${t.name}: ${t.description}</span>`
              )
              .join('')}
          </div>

          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-label">Vitality</div>
              <div class="stat-val">${b.stats.maxHp} ${fmtDelta(v.hp)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Attack Power</div>
              <div class="stat-val">${b.stats.attackDamage} ${fmtDelta(v.damage)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Strike Speed</div>
              <div class="stat-val">${b.stats.attackSpeedMul}x ${fmtDelta(v.speed)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Poise</div>
              <div class="stat-val">${b.stats.maxPoise} ${fmtDelta(v.poise)}</div>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" data-action="begin-fight">Draw Steel (Space / Enter)</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBossVictory(): string {
    const r = this.engine.runSummary.lastBossReward;
    const nextBoss = this.engine.gauntlet[this.engine.currentTierIndex + 1];
    const choices = this.engine.pendingBuffChoices;
    return `
      <div class="overlay-screen">
        <div class="card" style="text-align:center;max-width:760px;">
          <div class="tape-tier">Boss Vanquished!</div>
          <div class="title-logo" style="font-size:32px;margin:4px 0;">${r?.bossName ?? 'Monster'} Defeated</div>
          <p style="color:#cbd5e1;font-size:14px;margin:8px 0 14px;">
            Earned <span class="currency-gold">+${r?.gold ?? 0} Gold</span> and
            <span class="currency-xp">+${r?.xp ?? 0} XP</span>.
            The Trail Shrine restores 30% Vitality.
          </p>
          <div style="font-weight:700;color:var(--gold);font-size:13px;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">
            Choose 1 Run-Only Boss Buff (Lasts Until This Run Ends)
          </div>
          <div class="shop-grid" style="grid-template-columns:repeat(3,1fr);text-align:left;margin-bottom:14px;">
            ${choices
              .map(
                (b) => `
              <div class="shop-item" style="border-color:${b.color};">
                <div>
                  <h4 style="color:${b.color};font-size:14px;">${b.name}</h4>
                  <p style="margin-top:4px;color:#e2e8f0;">${b.description}</p>
                </div>
                <button class="btn btn-primary btn-sm" data-pick-buff="${b.id}">Claim Buff</button>
              </div>
            `
              )
              .join('')}
          </div>
          ${
            nextBoss
              ? `<p style="color:#94a3b8;font-size:12px;">Ahead on the trail: <strong>Tier ${nextBoss.template.tier} — ${nextBoss.template.name}, ${nextBoss.template.title}</strong></p>`
              : ''
          }
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" data-action="open-sanctuary">Retreat to Sanctuary Forge</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderRunVictory(): string {
    const s = this.engine.runSummary;
    return `
      <div class="overlay-screen">
        <div class="card" style="text-align:center;max-width:660px;">
          <div class="tape-tier">All ${this.engine.gauntlet.length} Tiers Conquered</div>
          <div class="title-logo" style="font-size:38px;margin:6px 0;">Eternal Champion</div>
          <p style="color:#e2e8f0;font-size:15px;margin:12px 0;">
            You have felled Aurelion, the Eternal Sovereign, through pure swordsmanship!
          </p>
          <p style="color:#cbd5e1;font-size:14px;">
            Run Bounty: <span class="currency-gold">+${s.goldEarnedThisRun} Gold</span> &nbsp;•&nbsp;
            <span class="currency-xp">+${s.xpEarnedThisRun} XP</span>
          </p>
          <div class="btn-row">
            <button class="btn btn-primary" data-action="open-sanctuary">Visit Sanctuary Forge</button>
            <button class="btn btn-secondary" data-action="start-run">Start Freshly Rolled Gauntlet</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderSanctuary(): string {
    const p = this.engine.progress;
    const s = this.engine.stats;
    let bodyHtml = '';

    if (this.activeTab === 'upgrades' || this.activeTab === 'gear' || this.activeTab === 'pets') {
      const cat: UpgradeCategory =
        this.activeTab === 'gear' ? 'gear' : this.activeTab === 'pets' ? 'pet' : 'hero';
      const filtered = UPGRADE_SPECS.filter((u) => u.category === cat);
      bodyHtml = `
        <div class="shop-grid">
          ${filtered
            .map((u) => {
              const lvl = p.upgrades[u.id] ?? 0;
              const maxed = lvl >= u.maxLevel;
              const goldCost = getUpgradeCost(u.id, lvl);
              const xpCost = getUpgradeXpCost(u.id, lvl);
              const canAfford = p.gold >= goldCost && p.xp >= xpCost && !maxed;
              return `
                <div class="shop-item">
                  <div>
                    <h4><span>${u.name}</span><span style="color:var(--gold);font-size:12px;">Lv ${lvl}/${u.maxLevel}</span></h4>
                    <p>${u.description}</p>
                    <p style="color:var(--emerald);margin-top:4px;font-weight:600;">${u.effectPerLevel}</p>
                  </div>
                  <button class="btn ${canAfford ? 'btn-primary' : 'btn-secondary'} btn-sm"
                    data-buy-upgrade="${u.id}" ${canAfford ? '' : 'disabled'}>
                    ${maxed ? 'MAXED' : `Upgrade (${goldCost}g + ${xpCost} XP)`}
                  </button>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    } else if (this.activeTab === 'styles') {
      bodyHtml = `
        <div class="shop-grid">
          ${FIGHTING_STYLES.map((st) => {
            const lv = p.styleLevels[st.id] ?? 0;
            const unlocked = lv > 0;
            const equipped = p.activeStyleId === st.id;
            const maxed = lv >= st.maxLevel;
            const upCost = getStyleUpgradeCost(st, lv);
            const canUnlock = !unlocked && p.xp >= st.unlockCostXp;
            const canUpgrade = unlocked && !maxed && p.gold >= upCost;
            return `
              <div class="shop-item" style="border-color:${equipped ? st.primaryColor : 'rgba(255,255,255,0.12)'};">
                <div>
                  <h4>
                    <span style="color:${st.primaryColor}">${st.name}</span>
                    <span style="font-size:11px;color:#cbd5e1;">${unlocked ? `Lv ${lv}/${st.maxLevel}` : `${st.unlockCostXp} XP`}</span>
                  </h4>
                  <p style="color:${st.secondaryColor};font-weight:600;margin-top:2px;">${st.tagline}</p>
                  <p style="margin-top:4px;">${st.description}</p>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${
                    !unlocked
                      ? `<button class="btn ${canUnlock ? 'btn-primary' : 'btn-secondary'} btn-sm" data-unlock-style="${st.id}" ${canUnlock ? '' : 'disabled'}>
                          Learn Style (${st.unlockCostXp} XP)
                        </button>`
                      : `
                        <button class="btn ${equipped ? 'btn-secondary' : 'btn-primary'} btn-sm" data-equip-style="${st.id}" ${equipped ? 'disabled' : ''}>
                          ${equipped ? 'Equipped' : 'Equip'}
                        </button>
                        <button class="btn ${canUpgrade ? 'btn-primary' : 'btn-secondary'} btn-sm" data-upgrade-style="${st.id}" ${canUpgrade ? '' : 'disabled'}>
                          ${maxed ? 'MAX' : `Upgrade (${upCost}g)`}
                        </button>
                      `
                  }
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (this.activeTab === 'combos') {
      const all = this.engine.combos.getAllCombos();
      bodyHtml = `
        <div class="shop-grid">
          ${all
            .map((c) => {
              const unlocked = this.engine.combos.isUnlocked(c.id);
              const lv = Math.max(1, p.comboLevels?.[c.id] ?? 1);
              const lvMul = getComboLevelMultiplier(lv);
              const maxed = lv >= MAX_COMBO_LEVEL;
              const upCosts = getComboUpgradeCosts(c.xpCost, lv);
              const canBuy = !unlocked && p.xp >= c.xpCost;
              const canUpgrade = unlocked && !maxed && p.gold >= upCosts.gold && p.xp >= upCosts.xp;
              return `
                <div class="shop-item">
                  <div>
                    <h4>
                      <span style="color:${c.accentColor}">${c.name}</span>
                      <span style="font-size:11px;color:#cbd5e1;">${unlocked ? `Lv ${lv}/${MAX_COMBO_LEVEL}` : `${c.xpCost} XP`}</span>
                    </h4>
                    <div class="seq-pills" style="margin:6px 0;">
                      ${c.sequence.map((k) => `<span class="seq-pill">${k}</span>`).join('')}
                      ${c.guardBreak ? `<span class="seq-pill" style="border-color:#ff9100;color:#ffcc80;">GUARD BREAK</span>` : ''}
                    </div>
                    <p>${c.description}</p>
                    <p style="color:#cbd5e1;margin-top:4px;">
                      DMG ${(c.damageMultiplier * lvMul * 100).toFixed(0)}% • Poise ${Math.round(c.poiseDamage * lvMul)} • Stamina ${c.staminaCost}
                    </p>
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${
                      unlocked
                        ? `
                          <button class="btn ${canUpgrade ? 'btn-primary' : 'btn-secondary'} btn-sm" data-upgrade-combo="${c.id}" ${canUpgrade ? '' : 'disabled'}>
                            ${maxed ? 'MAXED' : `Upgrade (${upCosts.gold}g + ${upCosts.xp} XP)`}
                          </button>
                          ${c.isCustom ? `<button class="btn btn-danger btn-sm" data-delete-combo="${c.id}">Delete</button>` : ''}
                        `
                        : `<button class="btn ${canBuy ? 'btn-primary' : 'btn-secondary'} btn-sm" data-buy-combo="${c.id}" ${canBuy ? '' : 'disabled'}>
                            Learn (${c.xpCost} XP)
                          </button>`
                    }
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    } else {
      const preview = buildCustomCombo({
        name: this.draftName,
        sequence: this.draftSeq.length >= 2 ? this.draftSeq : ['K', 'J'],
        style: this.draftStyle,
      });
      const customs = this.engine.combos.getCustomCombos();

      bodyHtml = `
        <div class="forge-box">
          <div style="font-weight:700;color:var(--gold);margin-bottom:4px;">Custom Combo Forge — Craft Your Own Swordplay Sequence</div>
          <div style="font-size:12px;color:#94a3b8;">Build a 2 to 5 input sequence using K (Quick), J (Strong), or L (Counter-Parry/Evade).</div>
          <div class="forge-row">
            <input class="forge-input" id="combo-name-input" value="${this.draftName.replace(/"/g, '&quot;')}" placeholder="Combo Name" maxlength="24" />
            <select class="forge-select" id="combo-style-select">
              ${(['slash', 'sunder', 'whirlwind', 'lunge', 'breaker', 'riposte'] as ComboVisualStyle[])
                .map((st) => `<option value="${st}" ${this.draftStyle === st ? 'selected' : ''}>Style: ${st.toUpperCase()}</option>`)
                .join('')}
            </select>
            <button class="btn btn-secondary btn-sm" data-add-seq="K">+ K (Quick)</button>
            <button class="btn btn-secondary btn-sm" data-add-seq="J">+ J (Strong)</button>
            <button class="btn btn-secondary btn-sm" data-add-seq="L">+ L (Counter)</button>
            <button class="btn btn-danger btn-sm" data-clear-seq>Clear</button>
          </div>
          <div class="forge-row" style="justify-content:space-between;">
            <div class="seq-pills">
              ${this.draftSeq.length ? this.draftSeq.map((k) => `<span class="seq-pill">${k}</span>`).join('') : '<span style="color:#94a3b8;font-size:12px;">Add 2–5 inputs...</span>'}
            </div>
            <div style="font-size:12px;color:#cbd5e1;">
              Preview: <strong>${(preview.damageMultiplier * 100).toFixed(0)}% DMG</strong> • Poise ${preview.poiseDamage} • Stamina ${preview.staminaCost} ${preview.guardBreak ? '• Guard Break' : ''}
            </div>
            <button class="btn btn-primary btn-sm" data-save-custom ${this.draftSeq.length < 2 ? 'disabled' : ''}>Forge Custom Combo</button>
          </div>
        </div>
        <div class="shop-grid">
          ${
            customs.length === 0
              ? `<div style="color:#94a3b8;font-size:13px;">No custom combos forged yet. Create one above and test it immediately in combat!</div>`
              : customs
                  .map(
                    (c) => `
                  <div class="shop-item">
                    <div>
                      <h4><span style="color:${c.accentColor}">${c.name}</span></h4>
                      <div class="seq-pills" style="margin:6px 0;">${c.sequence.map((k) => `<span class="seq-pill">${k}</span>`).join('')}</div>
                      <p>DMG ${(c.damageMultiplier * 100).toFixed(0)}% • Poise ${c.poiseDamage} • Stamina ${c.staminaCost}</p>
                    </div>
                    <button class="btn btn-danger btn-sm" data-delete-combo="${c.id}">Remove</button>
                  </div>
                `
                  )
                  .join('')
          }
        </div>
      `;
    }

    return `
      <div class="overlay-screen">
        <div class="card sanctuary-card">
          <div class="sanctuary-top">
            <div>
              <div class="tape-tier">Campfire Sanctuary • Run #${p.runCount}</div>
              <div style="font-family:Georgia,serif;font-size:24px;color:#fff;">Forge &amp; Martial Training</div>
            </div>
            <div class="currency-bar">
              <span class="currency-gold">Gold: ${p.gold}</span>
              <span class="currency-xp">XP: ${p.xp}</span>
            </div>
          </div>

          <div style="font-size:12px;color:#cbd5e1;margin-bottom:12px;">
            Current Hero: <strong>${s.maxHp} HP</strong> • <strong>${s.baseAttack} ATK</strong> • <strong>${Math.round(s.damageReduction * 100)}% Armor</strong> •
            <strong>${Math.round(s.critChance * 100)}% Crit</strong> • <strong>${s.maxStamina} Stamina</strong> •
            ${
              isEverythingMaxed(p)
                ? `<strong style="color:#ff6d00;">🔥 FLAMING OATHBLADE UNLOCKED!</strong>`
                : `<span>Mastery: <strong>${getMaxedUpgradeSummary(p).current}/${getMaxedUpgradeSummary(p).total}</strong> (Max all for Flaming Sword!)</span>`
            }
          </div>

          <div class="tabs" style="flex-wrap:wrap;">
            <button class="tab-btn ${this.activeTab === 'upgrades' ? 'active' : ''}" data-tab="upgrades">Hero Training</button>
            <button class="tab-btn ${this.activeTab === 'gear' ? 'active' : ''}" data-tab="gear">Gear Armory</button>
            <button class="tab-btn ${this.activeTab === 'pets' ? 'active' : ''}" data-tab="pets">Pet Kennel</button>
            <button class="tab-btn ${this.activeTab === 'styles' ? 'active' : ''}" data-tab="styles">Fighting Styles</button>
            <button class="tab-btn ${this.activeTab === 'combos' ? 'active' : ''}" data-tab="combos">Combos</button>
            <button class="tab-btn ${this.activeTab === 'forge' ? 'active' : ''}" data-tab="forge">Combo Forge</button>
          </div>

          <div class="shop-scroll">${bodyHtml}</div>

          <div class="btn-row" style="justify-content:space-between;margin-top:14px;">
            <button class="btn btn-danger btn-sm" data-action="reset-save">Reset Save</button>
            <button class="btn btn-primary" data-action="start-run">Head Back onto the Trail</button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const act = el.dataset.action;
        if (act === 'start-run') this.engine.startNewRun();
        else if (act === 'open-sanctuary') this.engine.openSanctuary();
        else if (act === 'begin-fight') this.engine.beginBossFight();
        else if (act === 'next-boss') this.engine.continuePathToNextBoss();
        else if (act === 'toggle-mute') {
          this.sound.muted = !this.sound.muted;
          this.render();
        } else if (act === 'toggle-physics') {
          this.engine.showPhysicsDebug = !this.engine.showPhysicsDebug;
          this.render();
        } else if (act === 'reset-physics') {
          this.engine.physics.updateConfig(DEFAULT_PHYSICS_CONFIG);
          this.render();
        } else if (act === 'reset-save') {
          this.engine.progress = resetProgress();
          this.engine.syncStatsFromProgress();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-pick-buff]').forEach((el) => {
      el.addEventListener('click', () => {
        this.engine.selectRunBuff(el.dataset.pickBuff!);
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        this.activeTab = el.dataset.tab as SanctuaryTab;
        this.render(true);
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-unlock-style]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.unlockStyle as FightingStyleId;
        const spec = FIGHTING_STYLES.find((s) => s.id === id);
        if (spec && (this.engine.progress.styleLevels[id] ?? 0) === 0 && this.engine.progress.xp >= spec.unlockCostXp) {
          this.engine.progress.xp -= spec.unlockCostXp;
          this.engine.progress.styleLevels[id] = 1;
          this.engine.progress.activeStyleId = id;
          this.engine.syncStatsFromProgress();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-equip-style]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.equipStyle as FightingStyleId;
        if ((this.engine.progress.styleLevels[id] ?? 0) > 0) {
          this.engine.progress.activeStyleId = id;
          this.engine.syncStatsFromProgress();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-upgrade-style]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.upgradeStyle as FightingStyleId;
        const spec = FIGHTING_STYLES.find((s) => s.id === id);
        const lv = this.engine.progress.styleLevels[id] ?? 0;
        if (!spec || lv <= 0 || lv >= spec.maxLevel) return;
        const cost = getStyleUpgradeCost(spec, lv);
        if (this.engine.progress.gold >= cost) {
          this.engine.progress.gold -= cost;
          this.engine.progress.styleLevels[id] = lv + 1;
          this.engine.syncStatsFromProgress();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-buy-upgrade]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.buyUpgrade as UpgradeId;
        const lvl = this.engine.progress.upgrades[id] ?? 0;
        const goldCost = getUpgradeCost(id, lvl);
        const xpCost = getUpgradeXpCost(id, lvl);
        if (this.engine.progress.gold >= goldCost && this.engine.progress.xp >= xpCost) {
          this.engine.progress.gold -= goldCost;
          this.engine.progress.xp -= xpCost;
          this.engine.progress.upgrades[id] = lvl + 1;
          this.engine.syncStatsFromProgress();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-buy-combo]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.buyCombo!;
        const combo = this.engine.combos.getAllCombos().find((c) => c.id === id);
        if (combo && !this.engine.combos.isUnlocked(id) && this.engine.progress.xp >= combo.xpCost) {
          this.engine.progress.xp -= combo.xpCost;
          this.engine.combos.unlockCombo(id);
          this.engine.progress.unlockedComboIds = this.engine.combos.getUnlockedIds();
          this.engine.progress.comboLevels[id] = 1;
          saveProgress(this.engine.progress);
          this.render();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-upgrade-combo]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.upgradeCombo!;
        const combo = this.engine.combos.getAllCombos().find((c) => c.id === id);
        if (!combo || !this.engine.combos.isUnlocked(id)) return;
        const lv = Math.max(1, this.engine.progress.comboLevels?.[id] ?? 1);
        if (lv >= MAX_COMBO_LEVEL) return;
        const costs = getComboUpgradeCosts(combo.xpCost, lv);
        if (this.engine.progress.gold >= costs.gold && this.engine.progress.xp >= costs.xp) {
          this.engine.progress.gold -= costs.gold;
          this.engine.progress.xp -= costs.xp;
          this.engine.progress.comboLevels[id] = lv + 1;
          saveProgress(this.engine.progress);
          this.render();
        }
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-delete-combo]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.deleteCombo!;
        this.engine.combos.deleteCustomCombo(id);
        this.engine.progress.customCombos = this.engine.combos.getCustomCombos();
        this.engine.progress.unlockedComboIds = this.engine.combos.getUnlockedIds();
        saveProgress(this.engine.progress);
        this.render();
      });
    });

    const nameInput = this.container.querySelector<HTMLInputElement>('#combo-name-input');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.draftName = nameInput.value;
      });
    }

    const styleSelect = this.container.querySelector<HTMLSelectElement>('#combo-style-select');
    if (styleSelect) {
      styleSelect.addEventListener('change', () => {
        this.draftStyle = styleSelect.value as ComboVisualStyle;
        this.render();
      });
    }

    this.container.querySelectorAll<HTMLElement>('[data-add-seq]').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.draftSeq.length < 5) {
          this.draftSeq.push(el.dataset.addSeq as ComboInput);
          this.render();
        }
      });
    });

    const clearBtn = this.container.querySelector('[data-clear-seq]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.draftSeq = [];
        this.render();
      });
    }

    const saveCustomBtn = this.container.querySelector('[data-save-custom]');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', () => {
        if (this.draftSeq.length < 2) return;
        this.engine.combos.registerCustomCombo({
          name: this.draftName,
          sequence: [...this.draftSeq],
          style: this.draftStyle,
        });
        this.engine.progress.customCombos = this.engine.combos.getCustomCombos();
        this.engine.progress.unlockedComboIds = this.engine.combos.getUnlockedIds();
        saveProgress(this.engine.progress);
        this.draftName = 'New Blade Art';
        this.draftSeq = ['K', 'K', 'J'];
        this.render();
      });
    }

    this.container.querySelectorAll<HTMLInputElement>('[data-phys-key]').forEach((slider) => {
      slider.addEventListener('input', () => {
        const key = slider.dataset.physKey as keyof typeof DEFAULT_PHYSICS_CONFIG;
        const val = Number(slider.value);
        this.engine.physics.updateConfig({ [key]: val });
        const labelVal = slider.previousElementSibling?.lastElementChild;
        if (labelVal) labelVal.textContent = val.toFixed(2);
      });
    });
  }
}
