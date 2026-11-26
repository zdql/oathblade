import { SoundEngine } from './audio/soundEngine';
import { GameEngine } from './game/gameEngine';
import { GameRenderer } from './render/renderer';
import { UIOverlay } from './ui/overlay';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const overlayEl = document.getElementById('ui-overlay');
  if (!canvas || !overlayEl) {
    throw new Error('Missing #game-canvas or #ui-overlay in index.html');
  }

  const sound = new SoundEngine();
  const engine = new GameEngine(sound);
  const renderer = new GameRenderer(canvas);
  new UIOverlay(overlayEl, engine, sound);

  engine.input.attach();

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
