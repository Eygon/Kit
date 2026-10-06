import * as THREE from "three";
import { GAME_CONFIG } from "@/config/gameConfig";

export type RenderContext = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize: () => void;
};

export const createRenderer = (host: HTMLElement): RenderContext => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(GAME_CONFIG.CAMERA_FOV_DEG, 1, GAME_CONFIG.CAMERA_NEAR_M, GAME_CONFIG.CAMERA_FAR_M);
  camera.position.set(0, GAME_CONFIG.PLAYER_EYE_HEIGHT_M, 0);
  const resize = (): void => {
    const width = host.clientWidth || window.innerWidth;
    const height = host.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
  return { renderer, scene, camera, resize };
};
