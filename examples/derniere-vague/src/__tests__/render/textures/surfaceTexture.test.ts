import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { SurfaceTextureSpec } from "@/config/visualConfig";

const TEXTURE_MODULE = "@/render/textures/surfaceTexture";
const MAX_TEXTURE_PX = 512;
const REPEAT_X = 3;
const REPEAT_Y = 2;

type SurfaceTextureFactory = (key: string, spec: SurfaceTextureSpec, repeatX: number, repeatY: number) => THREE.CanvasTexture;

const loadFactory = async (): Promise<SurfaceTextureFactory> => {
  const textureModule = await import(/* @vite-ignore */ TEXTURE_MODULE);
  return textureModule.surfaceTexture;
};

describe("surfaceTexture", () => {
  it("reuses the same texture for the same key", async () => {
    const surfaceTexture = await loadFactory();
    const first = surfaceTexture("cache-key", VISUAL_CONFIG.WALL_TEXTURE, 1, 1);
    const second = surfaceTexture("cache-key", VISUAL_CONFIG.FLOOR_TEXTURE, REPEAT_X, REPEAT_Y);
    expect(second).toBe(first);
  });

  it("builds distinct textures for distinct keys", async () => {
    const surfaceTexture = await loadFactory();
    expect(surfaceTexture("key-a", VISUAL_CONFIG.WALL_TEXTURE, 1, 1)).not.toBe(surfaceTexture("key-b", VISUAL_CONFIG.WALL_TEXTURE, 1, 1));
  });

  it("draws on a canvas of 512px or less with mipmaps and the requested repeat", async () => {
    const surfaceTexture = await loadFactory();
    const texture = surfaceTexture("size-key", VISUAL_CONFIG.FLOOR_TEXTURE, REPEAT_X, REPEAT_Y);
    const image = texture.image as HTMLCanvasElement;
    expect(image.width).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(image.height).toBeLessThanOrEqual(MAX_TEXTURE_PX);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.repeat.x).toBe(REPEAT_X);
    expect(texture.repeat.y).toBe(REPEAT_Y);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
  });
});
