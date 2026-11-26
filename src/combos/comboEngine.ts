import type { ComboDefinition, ComboInput, ComboMatchResult, CustomComboDraft } from './types';
import { buildCustomCombo, DEFAULT_COMBOS } from './defaultCombos';

export class ComboEngine {
  private combos: ComboDefinition[] = [];
  private unlockedIds = new Set<string>();
  private buffer: ComboInput[] = [];
  private bufferTimer = 0;
  public readonly comboWindowSeconds: number;

  constructor(comboWindowSeconds = 2.35) {
    this.comboWindowSeconds = comboWindowSeconds;
    for (const c of DEFAULT_COMBOS) {
      this.combos.push({ ...c, sequence: [...c.sequence] });
      if (c.xpCost === 0) {
        this.unlockedIds.add(c.id);
      }
    }
  }

  public getAllCombos(): ComboDefinition[] {
    return this.combos;
  }

  public getUnlockedCombos(): ComboDefinition[] {
    return this.combos.filter((c) => this.unlockedIds.has(c.id));
  }

  public isUnlocked(id: string): boolean {
    return this.unlockedIds.has(id);
  }

  public unlockCombo(id: string): void {
    this.unlockedIds.add(id);
  }

  public setUnlockedIds(ids: string[]): void {
    this.unlockedIds = new Set(ids);
    for (const c of this.combos) {
      if (c.xpCost === 0 || c.isCustom) {
        this.unlockedIds.add(c.id);
      }
    }
  }

  public getUnlockedIds(): string[] {
    return Array.from(this.unlockedIds);
  }

  public registerCustomCombo(draft: CustomComboDraft, existingId?: string): ComboDefinition {
    const combo = buildCustomCombo(draft, existingId);
    const idx = this.combos.findIndex((c) => c.id === combo.id);
    if (idx >= 0) {
      this.combos[idx] = combo;
    } else {
      this.combos.push(combo);
    }
    this.unlockedIds.add(combo.id);
    return combo;
  }

  public loadCustomCombos(customs: ComboDefinition[]): void {
    this.combos = this.combos.filter((c) => !c.isCustom);
    for (const c of customs) {
      this.combos.push({ ...c, isCustom: true, sequence: [...c.sequence] });
      this.unlockedIds.add(c.id);
    }
  }

  public deleteCustomCombo(id: string): boolean {
    const before = this.combos.length;
    this.combos = this.combos.filter((c) => !(c.isCustom && c.id === id));
    this.unlockedIds.delete(id);
    return this.combos.length < before;
  }

  public getCustomCombos(): ComboDefinition[] {
    return this.combos.filter((c) => c.isCustom);
  }

  public resetBuffer(): void {
    this.buffer = [];
    this.bufferTimer = 0;
  }

  public tick(dt: number): void {
    if (this.buffer.length === 0) return;
    this.bufferTimer += dt;
    if (this.bufferTimer >= this.comboWindowSeconds) {
      this.resetBuffer();
    }
  }

  public getBuffer(): ComboInput[] {
    return [...this.buffer];
  }

  /**
   * Push a combat input (K, J, or L when parry/dodge succeeds) and evaluate
   * whether an unlocked combo finisher has been completed.
   */
  public pushInput(input: ComboInput, hasCounterWindow: boolean): ComboMatchResult {
    this.buffer.push(input);
    if (this.buffer.length > 5) {
      this.buffer.shift();
    }
    this.bufferTimer = 0;

    const unlocked = this.getUnlockedCombos().filter(
      (c) => !c.requiresCounterWindow || hasCounterWindow
    );

    // Check exact suffix match (prefer longest combo sequence)
    let bestMatch: ComboDefinition | null = null;
    for (const combo of unlocked) {
      const seq = combo.sequence;
      if (this.buffer.length < seq.length) continue;
      let ok = true;
      for (let i = 0; i < seq.length; i++) {
        if (this.buffer[this.buffer.length - seq.length + i] !== seq[i]) {
          ok = false;
          break;
        }
      }
      if (ok && (!bestMatch || seq.length > bestMatch.sequence.length)) {
        bestMatch = combo;
      }
    }

    if (bestMatch) {
      const snapshot = [...this.buffer];
      this.resetBuffer();
      return {
        matched: bestMatch,
        candidates: [],
        buffer: snapshot,
      };
    }

    // Find partial prefix candidates for live HUD hints
    const candidates = unlocked.filter((combo) => {
      if (combo.sequence.length <= this.buffer.length) return false;
      for (let i = 0; i < this.buffer.length; i++) {
        if (combo.sequence[i] !== this.buffer[i]) return false;
      }
      return true;
    });

    return {
      matched: null,
      candidates,
      buffer: [...this.buffer],
    };
  }
}
