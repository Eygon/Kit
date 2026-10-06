import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { createRandom } from "@/logic/random";
import type { Random } from "@/logic/random";

const SKY = VISUAL_CONFIG.NIGHT_SKY;

let cached: THREE.CanvasTexture | null = null;

const paintGradient = (context: CanvasRenderingContext2D, sizePx: number): void => {
  const gradient = context.createLinearGradient(0, 0, 0, sizePx);
  gradient.addColorStop(0, SKY.SKY_TOP_COLOR);
  gradient.addColorStop(1, SKY.SKY_HORIZON_COLOR);
  context.fillStyle = gradient;
  context.fillRect(0, 0, sizePx, sizePx);
};

const paintStars = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  for (let index = 0; index < SKY.STARS.COUNT; index++) {
    context.fillStyle = `rgba(${SKY.STARS.COLOR},${random.range(0, SKY.STARS.MAX_ALPHA)})`;
    const size = 1 + random.int(0, SKY.STARS.MAX_SIZE_PX);
    context.fillRect(random.range(0, sizePx), random.range(0, sizePx * SKY.STARS.HORIZON_RATIO), size, size);
  }
};

const paintMoon = (context: CanvasRenderingContext2D, sizePx: number): void => {
  const x = sizePx * SKY.MOON.X_RATIO;
  const y = sizePx * SKY.MOON.Y_RATIO;
  const glow = context.createRadialGradient(x, y, 0, x, y, sizePx * SKY.MOON.GLOW_RADIUS_RATIO);
  glow.addColorStop(0, SKY.MOON.GLOW_INNER_COLOR);
  glow.addColorStop(1, SKY.MOON.GLOW_OUTER_COLOR);
  context.fillStyle = glow;
  context.fillRect(0, 0, sizePx, sizePx);
  context.fillStyle = SKY.MOON.CORE_COLOR;
  context.beginPath();
  context.arc(x, y, sizePx * SKY.MOON.RADIUS_RATIO, 0, Math.PI * 2);
  context.fill();
};

const paintTree = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  const trees = SKY.TREES;
  const height = random.range(trees.MIN_HEIGHT_RATIO, trees.MAX_HEIGHT_RATIO) * sizePx;
  const halfWidth = (random.range(trees.MIN_WIDTH_RATIO, trees.MAX_WIDTH_RATIO) * sizePx) / 2;
  const centerX = random.range(0, sizePx);
  const tipY = sizePx - height;
  const tierY = (tier: number): number => tipY + (height * tier) / trees.TIERS;
  const tierHalf = (tier: number): number => (halfWidth * tier) / trees.TIERS;
  context.beginPath();
  context.moveTo(centerX, tipY);
  for (let tier = 1; tier <= trees.TIERS; tier++) {
    context.lineTo(centerX + tierHalf(tier), tierY(tier));
    if (tier < trees.TIERS) context.lineTo(centerX + tierHalf(tier) * trees.TIER_INSET_RATIO, tierY(tier));
  }
  for (let tier = trees.TIERS; tier >= 1; tier--) {
    if (tier < trees.TIERS) context.lineTo(centerX - tierHalf(tier) * trees.TIER_INSET_RATIO, tierY(tier));
    context.lineTo(centerX - tierHalf(tier), tierY(tier));
  }
  context.closePath();
  context.fill();
};

const paintTrees = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  context.fillStyle = SKY.TREES.COLOR;
  for (let index = 0; index < SKY.TREES.COUNT; index++) paintTree(context, sizePx, random);
};

const paintMist = (context: CanvasRenderingContext2D, sizePx: number): void => {
  const top = sizePx * SKY.MIST.TOP_RATIO;
  const gradient = context.createLinearGradient(0, top, 0, sizePx);
  gradient.addColorStop(0, SKY.MIST.CLEAR_COLOR);
  gradient.addColorStop(1, SKY.MIST.DENSE_COLOR);
  context.fillStyle = gradient;
  context.fillRect(0, top, sizePx, sizePx - top);
};

const paintNightSky = (context: CanvasRenderingContext2D, sizePx: number): void => {
  const random = createRandom(SKY.SEED);
  paintGradient(context, sizePx);
  paintStars(context, sizePx, random);
  paintMoon(context, sizePx);
  paintTrees(context, sizePx, random);
  paintMist(context, sizePx);
};

export const nightSkyTexture = (): THREE.CanvasTexture => {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = SKY.SIZE_PX;
  canvas.height = SKY.SIZE_PX;
  const context = canvas.getContext("2d");
  if (context) paintNightSky(context, SKY.SIZE_PX);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
};
