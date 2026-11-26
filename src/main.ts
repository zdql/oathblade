import { SoundEngine } from './audio/soundEngine';
import { GameEngine } from './game/gameEngine';
import { GameRenderer } from './render/renderer';
import { UIOverlay } from './ui/overlay';
import { TouchControls } from './ui/touchControls';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const overlayEl = document.getElementById('ui-overlay');
  const touchEl = document.getElementById('touch-controls');
  if (!canvas || !overlayEl || !touchEl) {
    throw new Error('Missing #game-canvas, #ui-overlay, or #touch-controls in index.html');
  }

  const sound = new SoundEngine();
  const engine = new GameEngine(sound);
  const renderer = new GameRenderer(canvas);
  const touchControls = new TouchControls(touchEl, engine);
  new UIOverlay(overlayEl, engine, sound, touchControls);

  engine.input.attach();

  // Prevent iOS Safari double-tap-to-zoom and pinch-zoom during fast taps
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const now = Date.now();
      if (now - lastTouchEnd <= 320) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  let lastTime = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    engine.update(dt);
    renderer.render(engine, dt);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

bootstrap();
