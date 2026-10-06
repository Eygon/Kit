import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { SurfaceTextureSpec } from "@/config/visualConfig";
import { createRandom } from "@/logic/random";
import type { Random } from "@/logic/random";

type TexturePainter = (context: CanvasRenderingContext2D, sizePx: number, random: Random) => void;

const textureCache = new Map<string, THREE.CanvasTexture>();

const speckle = (context: CanvasRenderingContext2D, sizePx: number, random: Random, spec: SurfaceTextureSpec): void => {
  for (let index = 0; index < spec.SPECKLE_COUNT; index++) {
    const light = random.next() > 0.5;
    context.fillStyle = light ? `rgba(255,255,255,${random.range(0, spec.SPECKLE_ALPHA)})` : `rgba(0,0,0,${random.range(0, spec.SPECKLE_ALPHA)})`;
    context.fillRect(random.range(0, sizePx), random.range(0, sizePx), 1 + random.int(0, 2), 1 + random.int(0, 2));
  }
};

const streaks = (context: CanvasRenderingContext2D, sizePx: number, random: Random, spec: SurfaceTextureSpec): void => {
  for (let index = 0; index < spec.STREAK_COUNT; index++) {
    const width = random.range(1, VISUAL_CONFIG.STREAK_MAX_WIDTH_PX);
    const top = random.range(0, sizePx / 2);
    context.fillStyle = `rgba(0,0,0,${random.range(0, spec.STREAK_ALPHA)})`;
    context.fillRect(random.range(0, sizePx), top, width, random.range(sizePx * VISUAL_CONFIG.STREAK_MIN_LENGTH_RATIO, sizePx - top));
  }
};

const grain = (context: CanvasRenderingContext2D, sizePx: number, random: Random, spec: SurfaceTextureSpec): void => {
  for (let index = 0; index < spec.GRAIN_COUNT; index++) {
    context.fillStyle = `rgba(0,0,0,${random.range(0, spec.SHADE_ALPHA)})`;
    context.fillRect(random.range(0, sizePx), random.range(0, sizePx), random.range(sizePx * VISUAL_CONFIG.GRAIN_MIN_LENGTH_RATIO, sizePx * VISUAL_CONFIG.GRAIN_MAX_LENGTH_RATIO), 1);
  }
};

const paintSurface = (spec: SurfaceTextureSpec): TexturePainter => (context, sizePx, random) => {
  context.fillStyle = spec.GAP_COLOR;
  context.fillRect(0, 0, sizePx, sizePx);
  const cellW = sizePx / spec.COLUMNS;
  const cellH = sizePx / spec.ROWS;
  for (let row = 0; row < spec.ROWS; row++) {
    const shift = spec.STAGGER && row % 2 === 1 ? cellW / 2 : 0;
    for (let column = -1; column < spec.COLUMNS; column++) {
      const x = column * cellW + shift + spec.GAP_PX / 2;
      const y = row * cellH + spec.GAP_PX / 2;
      context.fillStyle = spec.BASE_COLOR;
      context.fillRect(x, y, cellW - spec.GAP_PX, cellH - spec.GAP_PX);
      const dark = random.next() > 0.5;
      context.fillStyle = dark ? `rgba(0,0,0,${random.range(0, spec.SHADE_ALPHA)})` : `rgba(255,255,255,${random.range(0, spec.SHADE_ALPHA)})`;
      context.fillRect(x, y, cellW - spec.GAP_PX, cellH - spec.GAP_PX);
    }
  }
  speckle(context, sizePx, random, spec);
  streaks(context, sizePx, random, spec);
  grain(context, sizePx, random, spec);
};

const getTexture = (key: string, seed: number, painter: TexturePainter, repeatX: number, repeatY: number): THREE.CanvasTexture => {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = VISUAL_CONFIG.TEXTURE_SIZE_PX;
  canvas.height = VISUAL_CONFIG.TEXTURE_SIZE_PX;
  const context = canvas.getContext("2d");
  if (context) painter(context, VISUAL_CONFIG.TEXTURE_SIZE_PX, createRandom(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.generateMipmaps = true;
  texture.anisotropy = VISUAL_CONFIG.TEXTURE_ANISOTROPY;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
};

export const surfaceTexture = (key: string, spec: SurfaceTextureSpec, repeatX: number, repeatY: number): THREE.CanvasTexture =>
  getTexture(key, spec.SEED, paintSurface(spec), repeatX, repeatY);
