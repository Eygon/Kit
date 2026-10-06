import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { TEXTS } from "@/ui/texts";

const LABEL = VISUAL_CONFIG.WALL_BUY.LABEL;
const HALF = 2;

const labelCache = new Map<number, THREE.CanvasTexture>();

const paintLabel = (context: CanvasRenderingContext2D, price: number): void => {
  context.fillStyle = LABEL.BORDER_COLOR;
  context.fillRect(0, 0, LABEL.CANVAS_WIDTH_PX, LABEL.CANVAS_HEIGHT_PX);
  context.fillStyle = LABEL.BACKGROUND_COLOR;
  context.fillRect(LABEL.BORDER_PX, LABEL.BORDER_PX, LABEL.CANVAS_WIDTH_PX - LABEL.BORDER_PX * HALF, LABEL.CANVAS_HEIGHT_PX - LABEL.BORDER_PX * HALF);
  context.fillStyle = LABEL.TEXT_COLOR;
  context.font = LABEL.FONT;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(TEXTS.points(price), LABEL.CANVAS_WIDTH_PX / HALF, LABEL.CANVAS_HEIGHT_PX / HALF, LABEL.CANVAS_WIDTH_PX - LABEL.TEXT_PADDING_PX * HALF);
};

export const priceLabelTexture = (price: number): THREE.CanvasTexture => {
  const cached = labelCache.get(price);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = LABEL.CANVAS_WIDTH_PX;
  canvas.height = LABEL.CANVAS_HEIGHT_PX;
  const context = canvas.getContext("2d");
  if (context) paintLabel(context, price);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.anisotropy = VISUAL_CONFIG.TEXTURE_ANISOTROPY;
  texture.colorSpace = THREE.SRGBColorSpace;
  labelCache.set(price, texture);
  return texture;
};
