import type { GameEngine } from '../game/gameEngine';

/**
 * Multi-touch on-screen gamepad for iPad, iPhone, and Android browsers.
 * Uses pure Pointer Events (zero iOS-specific APIs) so players can hold
 * directional movement with their left thumb while tapping K / J / L with their right.
 */
export class TouchControls {
  private root: HTMLElement;
  private engine: GameEngine;
  public enabled: boolean;
  private activeDpadPointer: number | null = null;
  private dpadEl: HTMLElement | null = null;
  private knobEl: HTMLElement | null = null;

  constructor(root: HTMLElement, engine: GameEngine) {
    this.root = root;
    this.engine = engine;
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
    this.enabled = isTouchDevice;
    this.mount();
    this.syncVisibility();
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.engine.input.setVirtualMove({ x: 0, y: 0 });
    }
    this.syncVisibility();
  }

  public syncVisibility(): void {
    const playable =
      this.engine.screen === 'path' ||
      this.engine.screen === 'combat' ||
      (this.engine.screen === 'minigame_arcade' && !this.engine.arcadeResult);
    this.root.style.display = this.enabled && playable ? 'flex' : 'none';
    if (!playable) {
      this.activeDpadPointer = null;
      this.engine.input.setVirtualMove({ x: 0, y: 0 });
      if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
    }
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="touch-left">
        <div class="touch-stick" id="touch-dpad" aria-label="Movement Pad">
          <div class="touch-stick-ring"></div>
          <span class="touch-dir touch-dir-n">W</span>
          <span class="touch-dir touch-dir-s">S</span>
          <span class="touch-dir touch-dir-w">A</span>
          <span class="touch-dir touch-dir-e">D</span>
          <div class="touch-stick-knob" id="touch-knob"></div>
        </div>
      </div>
      <div class="touch-right">
        <div class="touch-btn-row">
          <button class="touch-btn touch-btn-dash" data-touch-act="dash">
            <span class="touch-key">H</span>
            <span class="touch-lbl">DASH</span>
          </button>
          <button class="touch-btn touch-btn-parry" data-touch-act="defense">
            <span class="touch-key">L</span>
            <span class="touch-lbl">PARRY / DODGE</span>
          </button>
        </div>
        <div class="touch-btn-row">
          <button class="touch-btn touch-btn-quick" data-touch-act="quick">
            <span class="touch-key">K</span>
            <span class="touch-lbl">QUICK</span>
          </button>
          <button class="touch-btn touch-btn-strong" data-touch-act="strong">
            <span class="touch-key">J</span>
            <span class="touch-lbl">STRONG</span>
          </button>
        </div>
      </div>
    `;

    this.dpadEl = this.root.querySelector('#touch-dpad');
    this.knobEl = this.root.querySelector('#touch-knob');

    // Bulletproof iOS/iPadOS Safari fix: prevent default on touchstart/touchend
    // inside the touch gamepad so rapid tapping K/J/L NEVER triggers double-tap zoom!
    this.root.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.root.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

    if (this.dpadEl) {
      const updateStick = (clientX: number, clientY: number) => {
        if (!this.dpadEl || !this.knobEl) return;
        const rect = this.dpadEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.36;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        const deadzone = maxR * 0.18;
        if (dist < deadzone) {
          this.engine.input.setVirtualMove({ x: 0, y: 0 });
        } else {
          this.engine.input.setVirtualMove({
            x: dx / maxR,
            y: dy / maxR,
          });
        }
      };

      this.dpadEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.activeDpadPointer = e.pointerId;
        this.dpadEl?.setPointerCapture(e.pointerId);
        updateStick(e.clientX, e.clientY);
      });

      this.dpadEl.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.activeDpadPointer) return;
        e.preventDefault();
        updateStick(e.clientX, e.clientY);
      });

      const releaseStick = (e: PointerEvent) => {
        if (e.pointerId !== this.activeDpadPointer) return;
        e.preventDefault();
        this.activeDpadPointer = null;
        this.engine.input.setVirtualMove({ x: 0, y: 0 });
        if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
      };

      this.dpadEl.addEventListener('pointerup', releaseStick);
      this.dpadEl.addEventListener('pointercancel', releaseStick);
    }

    this.root.querySelectorAll<HTMLButtonElement>('[data-touch-act]').forEach((btn) => {
      const act = btn.dataset.touchAct as 'quick' | 'strong' | 'defense' | 'dash';
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this.engine.input.pressAction(act);
      });
      const unpress = () => btn.classList.remove('pressed');
      btn.addEventListener('pointerup', unpress);
      btn.addEventListener('pointercancel', unpress);
      btn.addEventListener('pointerleave', unpress);
    });
  }
}
