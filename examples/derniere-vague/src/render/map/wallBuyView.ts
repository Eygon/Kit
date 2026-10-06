import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WALL_BUYS } from "@/config/mapConfig";
import type { WallBuySpec } from "@/config/mapConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { WEAPONS } from "@/config/weaponConfig";
import { createWeaponSilhouette } from "@/render/models/weaponSilhouette";
import { surfaceTexture } from "@/render/textures/surfaceTexture";
import { priceLabelTexture } from "@/render/textures/priceLabel";

export type WallBuyView = {
  dispose: () => void;
};

const WALL_BUY = VISUAL_CONFIG.WALL_BUY;

const placement = (buy: WallBuySpec, y: number, depthM: number): THREE.Matrix4 =>
  new THREE.Matrix4().makeRotationY(buy.facing).setPosition(buy.x + Math.sin(buy.facing) * depthM, y, buy.z + Math.cos(buy.facing) * depthM);

const mergeNamed = (name: string, geometries: THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh => {
  const merged = mergeGeometries(geometries);
  if (!merged) throw new Error(`cannot merge ${name}`);
  geometries.forEach((geometry) => geometry.dispose());
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  return mesh;
};

const buildPlates = (material: THREE.Material): THREE.Mesh => {
  const { WIDTH_M, HEIGHT_M, DEPTH_M, CENTER_Y_M } = WALL_BUY.PLATE;
  const geometries = WALL_BUYS.map((buy) => new THREE.BoxGeometry(WIDTH_M, HEIGHT_M, DEPTH_M).applyMatrix4(placement(buy, CENTER_Y_M, -WALL_BUY.WALL_OFFSET_M)));
  return mergeNamed("wallBuyPlates", geometries, material);
};

const buildSilhouettes = (material: THREE.Material): THREE.Mesh => {
  const depthM = -WALL_BUY.WALL_OFFSET_M + WALL_BUY.PLATE.DEPTH_M / 2 + WALL_BUY.SILHOUETTE_LIFT_M;
  const geometries = WALL_BUYS.map((buy) => createWeaponSilhouette(buy.weaponId).applyMatrix4(placement(buy, WALL_BUY.PLATE.CENTER_Y_M, depthM)));
  return mergeNamed("wallBuySilhouettes", geometries, material);
};

const buildLabels = (geometry: THREE.BufferGeometry, materials: THREE.Material[]): THREE.Group => {
  const group = new THREE.Group();
  group.name = "wallBuyLabels";
  const depthM = -WALL_BUY.WALL_OFFSET_M + WALL_BUY.PLATE.DEPTH_M / 2;
  for (const buy of WALL_BUYS) {
    const material = new THREE.MeshBasicMaterial({ map: priceLabelTexture(WEAPONS[buy.weaponId].WALL_PRICE_POINTS) });
    materials.push(material);
    const label = new THREE.Mesh(geometry, material);
    label.position.set(buy.x + Math.sin(buy.facing) * depthM, WALL_BUY.LABEL.CENTER_Y_M, buy.z + Math.cos(buy.facing) * depthM);
    label.rotation.y = buy.facing;
    group.add(label);
  }
  return group;
};

export const createWallBuyView = (scene: THREE.Scene): WallBuyView => {
  const plateMaterial = new THREE.MeshStandardMaterial({ color: WALL_BUY.PLATE.COLOR, roughness: VISUAL_CONFIG.WOOD_ROUGHNESS, map: surfaceTexture("wood", VISUAL_CONFIG.WOOD_TEXTURE, 1, 1) });
  const silhouetteMaterial = new THREE.MeshStandardMaterial({
    color: WALL_BUY.SILHOUETTE_COLOR,
    emissive: WALL_BUY.SILHOUETTE_EMISSIVE,
    emissiveIntensity: WALL_BUY.SILHOUETTE_EMISSIVE_INTENSITY,
    roughness: WALL_BUY.SILHOUETTE_ROUGHNESS,
    metalness: WALL_BUY.SILHOUETTE_METALNESS,
  });
  const labelGeometry = new THREE.PlaneGeometry(WALL_BUY.LABEL.WIDTH_M, WALL_BUY.LABEL.HEIGHT_M);
  const plates = buildPlates(plateMaterial);
  const silhouettes = buildSilhouettes(silhouetteMaterial);
  const labelMaterials: THREE.Material[] = [];
  const labels = buildLabels(labelGeometry, labelMaterials);
  scene.add(plates, silhouettes, labels);

  const dispose = (): void => {
    scene.remove(plates, silhouettes, labels);
    plates.geometry.dispose();
    silhouettes.geometry.dispose();
    labelGeometry.dispose();
    labelMaterials.forEach((material) => material.dispose());
    plateMaterial.dispose();
    silhouetteMaterial.dispose();
  };

  return { dispose };
};
