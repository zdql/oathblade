/**
 * Crisp pixel-art offscreen buffer helper for authentic GBA/DS Pokémon-style sprites.
 * Supports 1px dark-tinted outlines, dithered shading, ellipses, polygons, lines,
 * and automatic nearest-neighbor blitting onto the main canvas.
 */
export class PixelCanvas {
  public readonly width: number;
  public readonly height: number;
  public readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) throw new Error('2D context unavailable for PixelCanvas');
      ctx.imageSmoothingEnabled = false;
      this.ctx = ctx;
    } else {
      // Headless Node/Vitest fallback stub
      this.canvas = {} as HTMLCanvasElement;
      this.ctx = new Proxy({} as CanvasRenderingContext2D, {
        get: () => () => {},
      });
    }
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public px(x: number, y: number, color: string): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(ix, iy, 1, 1);
  }

  public rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  public outlinedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    outline: string,
    highlight?: string,
    shadow?: string
  ): void {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    this.rect(rx, ry, rw, rh, outline);
    if (rw > 2 && rh > 2) {
      this.rect(rx + 1, ry + 1, rw - 2, rh - 2, fill);
      if (highlight && rw > 3) {
        this.rect(rx + 1, ry + 1, rw - 2, 1, highlight);
        this.rect(rx + 1, ry + 1, 1, Math.max(1, rh - 3), highlight);
      }
      if (shadow && rw > 3) {
        this.rect(rx + 1, ry + rh - 2, rw - 2, 1, shadow);
        this.rect(rx + rw - 2, ry + 2, 1, Math.max(1, rh - 3), shadow);
      }
    }
  }

  /**
   * Draws a crisp pixel-rasterized shaded ellipse with 1px Pokémon-style outline,
   * top-left specular highlight band, and bottom-right shadow band.
   */
  public ellipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill: string,
    outline: string,
    highlight?: string,
    shadow?: string,
    dither = false
  ): void {
    const minX = Math.max(0, Math.floor(cx - rx - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + rx + 1));
    const minY = Math.max(0, Math.floor(cy - ry - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + ry + 1));
    const irx = Math.max(0.5, rx);
    const iry = Math.max(0.5, ry);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const nx = (x - cx) / irx;
        const ny = (y - cy) / iry;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1.0) continue;

        // Check if on 1px outer border
        const nxOut = (Math.abs(x - cx) + 1) / irx;
        const nyOut = (Math.abs(y - cy) + 1) / iry;
        const isEdge = nxOut * nxOut + ny * ny > 1.0 || nx * nx + nyOut * nyOut > 1.0;

        if (isEdge) {
          this.px(x, y, outline);
        } else {
          // Top-left directional lighting (classic Pokémon sprite light source)
          const light = -nx * 0.65 - ny * 0.75;
          if (highlight && light > 0.36) {
            if (!dither || (x + y) % 2 === 0 || light > 0.56) {
              this.px(x, y, highlight);
              continue;
            }
          }
          if (shadow && light < -0.25) {
            if (!dither || (x + y) % 2 === 0 || light < -0.48) {
              this.px(x, y, shadow);
              continue;
            }
          }
          this.px(x, y, fill);
        }
      }
    }
  }

  /**
   * Bresenham pixel line with optional thickness and outline.
   */
  public line(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: string,
    thickness = 1
  ): void {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);
    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    const half = Math.floor(thickness / 2);
    while (true) {
      this.rect(ix0 - half, iy0 - half, thickness, thickness, color);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  /**
   * Draws an outlined pixel blade/club/horn segment from (x0,y0) to (x1,y1).
   */
  public outlinedLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    fill: string,
    outline: string,
    thickness = 3,
    highlight?: string
  ): void {
    this.line(x0, y0, x1, y1, outline, thickness + 2);
    this.line(x0, y0, x1, y1, fill, thickness);
    if (highlight && thickness >= 2) {
      this.line(x0, y0 - 1, x1, y1 - 1, highlight, 1);
    }
  }

  /**
   * Rasterizes a filled pixel polygon with automatic 1px outline pass.
   */
  public poly(
    points: Array<[number, number]>,
    fill: string,
    outline: string,
    highlight?: string
  ): void {
    if (points.length < 3) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [px, py] of points) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const xStart = Math.max(0, Math.floor(minX));
    const xEnd = Math.min(this.width - 1, Math.ceil(maxX));
    const yStart = Math.max(0, Math.floor(minY));
    const yEnd = Math.min(this.height - 1, Math.ceil(maxY));

    const mask = new Set<number>();
    const inside = (x: number, y: number): boolean => {
      let c = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-6) + xi;
        if (intersect) c = !c;
      }
      return c;
    };

    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xStart; x <= xEnd; x++) {
        if (inside(x + 0.5, y + 0.5)) {
          mask.add(y * this.width + x);
        }
      }
    }

    for (const key of mask) {
      const y = Math.floor(key / this.width);
      const x = key % this.width;
      const isBorder =
        !mask.has(key - 1) ||
        !mask.has(key + 1) ||
        !mask.has(key - this.width) ||
        !mask.has(key + this.width);
      if (isBorder) {
        this.px(x, y, outline);
      } else if (highlight && y < (minY + maxY) * 0.45 && (x + y) % 2 === 0) {
        this.px(x, y, highlight);
      } else {
        this.px(x, y, fill);
      }
    }
  }

  /**
   * Draws a 4-point pixel sparkle star (classic Pokémon shiny/telegraph glint).
   */
  public sparkle(cx: number, cy: number, radius: number, coreColor: string, edgeColor: string): void {
    const r = Math.max(1, Math.round(radius));
    this.line(cx - r, cy, cx + r, cy, edgeColor, 1);
    this.line(cx, cy - r, cx, cy + r, edgeColor, 1);
    if (r >= 3) {
      const d = Math.floor(r * 0.45);
      this.line(cx - d, cy - d, cx + d, cy + d, edgeColor, 1);
      this.line(cx - d, cy + d, cx + d, cy - d, edgeColor, 1);
    }
    this.rect(cx - 1, cy - 1, 3, 3, coreColor);
  }

  /**
   * Blits this pixel buffer onto the destination canvas with crisp nearest-neighbor scaling.
   */
  public blitTo(
    dest: CanvasRenderingContext2D,
    centerX: number,
    bottomY: number,
    pixelScale: number,
    alpha = 1,
    flipX = false
  ): void {
    if (typeof document === 'undefined') return;
    dest.save();
    dest.imageSmoothingEnabled = false;
    dest.globalAlpha *= alpha;
    const dw = Math.round(this.width * pixelScale);
    const dh = Math.round(this.height * pixelScale);
    dest.translate(Math.round(centerX), Math.round(bottomY));
    if (flipX) dest.scale(-1, 1);
    dest.drawImage(this.canvas, Math.round(-dw / 2), Math.round(-dh), dw, dh);
    dest.restore();
  }
}
