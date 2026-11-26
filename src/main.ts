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

  // Bulletproof iOS/iPadOS Safari zoom lock:
  // 1) Prevent touchstart/touchend default on the canvas so rapid tapping never zooms.
  // 2) Prevent pinch-zoom gestures across the document.
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
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
