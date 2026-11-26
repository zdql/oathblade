import type { SoundHooks } from '../game/gameEngine';

export class SoundEngine implements SoundHooks {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        this.ctx = new Ctx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, filterFreq: number, volume: number, q = 1.5): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  public playSwing(heavy: boolean): void {
    this.playNoise(heavy ? 0.16 : 0.09, heavy ? 520 : 1200, heavy ? 0.16 : 0.11, 2.2);
    this.playTone(heavy ? 240 : 420, heavy ? 95 : 180, heavy ? 0.15 : 0.09, 'triangle', 0.08);
  }

  public playHit(heavy: boolean, isCombo: boolean): void {
    this.playNoise(heavy ? 0.14 : 0.08, heavy ? 320 : 750, heavy ? 0.24 : 0.16, 1.0);
    this.playTone(heavy ? 140 : 210, 48, heavy ? 0.16 : 0.1, 'sawtooth', heavy ? 0.18 : 0.12);
    if (isCombo) {
      this.playTone(520, 780, 0.18, 'triangle', 0.12, 0.02);
    }
  }

  public playParry(): void {
    // Crisp metallic ring!
    this.playTone(1320, 1760, 0.28, 'sine', 0.18);
    this.playTone(2140, 1620, 0.34, 'triangle', 0.14, 0.01);
    this.playNoise(0.08, 2800, 0.18, 3.0);
  }

  public playDodge(): void {
    this.playNoise(0.14, 900, 0.13, 1.4);
    this.playTone(320, 520, 0.1, 'sine', 0.06);
  }

  public playPlayerHurt(): void {
    this.playTone(170, 55, 0.24, 'sawtooth', 0.22);
    this.playNoise(0.18, 280, 0.2, 0.9);
  }

  public playGuardClang(): void {
    this.playTone(620, 410, 0.2, 'square', 0.12);
    this.playTone(940, 680, 0.18, 'triangle', 0.1);
  }

  public playBossTelegraph(): void {
    this.playTone(290, 440, 0.18, 'triangle', 0.1);
    this.playTone(580, 660, 0.12, 'sine', 0.07, 0.04);
  }

  public playBossStagger(): void {
    this.playTone(420, 220, 0.22, 'sawtooth', 0.14);
    this.playTone(640, 480, 0.25, 'triangle', 0.12, 0.08);
    this.playTone(880, 660, 0.28, 'sine', 0.1, 0.16);
  }

  public playVictory(): void {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.32, 'triangle', 0.14, idx * 0.11);
    });
  }

  public playDeath(): void {
    const notes = [293.66, 261.63, 220, 174.61];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.96, 0.35, 'sawtooth', 0.11, idx * 0.14);
    });
  }

  public playStep(): void {
    this.playNoise(0.045, 420, 0.06, 1.2);
  }
}
