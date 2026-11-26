import type { Vec2 } from '../physics';

export type ActionKey = 'strong' | 'quick' | 'defense' | 'confirm' | 'escape' | 'debug';

interface BufferedPress {
  time: number;
}

export class InputManager {
  private held = new Set<string>();
  private buffered = new Map<ActionKey, BufferedPress>();
  private clock = 0;
  private readonly bufferWindow = 0.14;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;

  constructor() {
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.onKeyUp(e);
    this.boundBlur = () => this.held.clear();
  }

  public attach(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }

  public tick(dt: number): void {
    this.clock += dt;
    for (const [k, v] of this.buffered.entries()) {
      if (this.clock - v.time > this.bufferWindow) {
        this.buffered.delete(k);
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Allow normal typing in text inputs (e.g. Custom Combo Name input)
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }

    const code = e.code;
    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'KeyJ' ||
      code === 'KeyK' ||
      code === 'KeyL' ||
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'F1'
    ) {
      e.preventDefault();
    }

    if (!e.repeat) {
      if (code === 'KeyJ') this.buffered.set('strong', { time: this.clock });
      if (code === 'KeyK') this.buffered.set('quick', { time: this.clock });
      if (code === 'KeyL') this.buffered.set('defense', { time: this.clock });
      if (code === 'Enter' || code === 'Space') this.buffered.set('confirm', { time: this.clock });
      if (code === 'Escape') this.buffered.set('escape', { time: this.clock });
      if (code === 'F1') this.buffered.set('debug', { time: this.clock });
    }

    this.held.add(code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.held.delete(e.code);
  }

  public getMoveVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) x -= 1;
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) x += 1;
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) y -= 1;
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) y += 1;
    return { x, y };
  }

  public consumeAction(action: ActionKey): boolean {
    if (this.buffered.has(action)) {
      this.buffered.delete(action);
      return true;
    }
    return false;
  }

  public clearBuffers(): void {
    this.buffered.clear();
  }
}
