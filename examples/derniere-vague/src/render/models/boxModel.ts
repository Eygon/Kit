import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { tiledBoxGeometry } from "@/render/map/buildStation";
import { surfaceTexture } from "@/render/textures/surfaceTexture";

export type BoxModel = {
  readonly root: THREE.Group;
  readonly chest: THREE.Group;
  readonly lid: THREE.Group;
  readonly glow: THREE.Mesh;
  readonly beam: THREE.Mesh;
  readonly beamMaterial: THREE.MeshBasicMaterial;
  readonly dispose: () => void;
};

const BOX = VISUAL_CONFIG.BOX;
const HALF = 0.5;
const SIDES: readonly number[] = [-1, 1];

const addMesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

const buildLid = (woodMaterial: THREE.Material, bandMaterial: THREE.Material, disposables: THREE.BufferGeometry[]): THREE.Group => {
  const { WIDTH_M, HEIGHT_M, DEPTH_M } = BOX.BODY;
  const lid = new THREE.Group();
  lid.name = "boxLid";
  lid.position.set(0, HEIGHT_M, -DEPTH_M / 2);
  const slab = tiledBoxGeometry(WIDTH_M + BOX.LID.OVERHANG_M * 2, BOX.LID.HEIGHT_M, DEPTH_M + BOX.LID.OVERHANG_M * 2);
  const band = new THREE.BoxGeometry(BOX.BAND.WIDTH_M, BOX.LID.HEIGHT_M + BOX.BAND.OVERHANG_M, DEPTH_M + BOX.LID.OVERHANG_M * 2 + BOX.BAND.OVERHANG_M);
  disposables.push(slab, band);
  addMesh(lid, "boxLidSlab", slab, woodMaterial, 0, BOX.LID.HEIGHT_M * HALF, DEPTH_M * HALF);
  for (const side of SIDES) addMesh(lid, "boxLidBand", band, bandMaterial, side * BOX.BAND.OFFSET_X_M, BOX.LID.HEIGHT_M * HALF, DEPTH_M * HALF);
  return lid;
};

const buildBody = (chest: THREE.Group, woodMaterial: THREE.Material, bandMaterial: THREE.Material, latchMaterial: THREE.Material, disposables: THREE.BufferGeometry[]): void => {
  const { WIDTH_M, HEIGHT_M, DEPTH_M } = BOX.BODY;
  const body = tiledBoxGeometry(WIDTH_M, HEIGHT_M, DEPTH_M);
  const band = new THREE.BoxGeometry(BOX.BAND.WIDTH_M, HEIGHT_M, DEPTH_M + BOX.BAND.OVERHANG_M * 2);
  const latch = new THREE.BoxGeometry(BOX.LATCH.WIDTH_M, BOX.LATCH.HEIGHT_M, BOX.LATCH.DEPTH_M);
  disposables.push(body, band, latch);
  addMesh(chest, "boxBody", body, woodMaterial, 0, HEIGHT_M * HALF, 0);
  for (const side of SIDES) addMesh(chest, "boxBodyBand", band, bandMaterial, side * BOX.BAND.OFFSET_X_M, HEIGHT_M * HALF, 0);
  addMesh(chest, "boxLatch", latch, latchMaterial, 0, HEIGHT_M - BOX.LATCH.HEIGHT_M * HALF, DEPTH_M * HALF + BOX.LATCH.DEPTH_M * HALF);
};

export const createBoxModel = (): BoxModel => {
  const disposables: THREE.BufferGeometry[] = [];
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: BOX.BODY.TINT,
    roughness: VISUAL_CONFIG.WOOD_ROUGHNESS,
    map: surfaceTexture("wood", VISUAL_CONFIG.WOOD_TEXTURE, 1, 1),
  });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: BOX.BAND.COLOR, metalness: BOX.BAND.METALNESS, roughness: BOX.BAND.ROUGHNESS });
  const latchMaterial = new THREE.MeshStandardMaterial({ color: BOX.LATCH.COLOR, metalness: BOX.LATCH.METALNESS, roughness: BOX.LATCH.ROUGHNESS });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: BOX.GLOW.COLOR, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: BOX.BEAM.COLOR,
    transparent: true,
    opacity: BOX.BEAM.OPACITY,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const root = new THREE.Group();
  root.name = "mysteryBox";
  const chest = new THREE.Group();
  chest.name = "boxChest";
  buildBody(chest, woodMaterial, bandMaterial, latchMaterial, disposables);
  const lid = buildLid(woodMaterial, bandMaterial, disposables);
  chest.add(lid);

  const glowGeometry = new THREE.PlaneGeometry(BOX.BODY.WIDTH_M - BOX.GLOW.INSET_M * 2, BOX.BODY.DEPTH_M - BOX.GLOW.INSET_M * 2).rotateX(-Math.PI / 2);
  const glow = addMesh(chest, "boxGlow", glowGeometry, glowMaterial, 0, BOX.BODY.HEIGHT_M, 0);
  glow.visible = false;

  const beamGeometry = new THREE.CylinderGeometry(BOX.BEAM.RADIUS_TOP_M, BOX.BEAM.RADIUS_BOTTOM_M, BOX.BEAM.HEIGHT_M, BOX.BEAM.SEGMENTS, 1, true);
  const beam = addMesh(root, "boxBeam", beamGeometry, beamMaterial, 0, BOX.BEAM.HEIGHT_M * HALF, 0);
  root.add(chest);
  disposables.push(glowGeometry, beamGeometry);

  const dispose = (): void => {
    disposables.forEach((geometry) => geometry.dispose());
    [woodMaterial, bandMaterial, latchMaterial, glowMaterial, beamMaterial].forEach((material) => material.dispose());
  };

  return { root, chest, lid, glow, beam, beamMaterial, dispose };
};

export const poseBoxLid = (model: BoxModel, openness: number): void => {
  model.lid.rotation.x = -openness * BOX.LID.OPEN_RAD;
  model.glow.visible = openness * BOX.LID.OPEN_RAD > BOX.GLOW.VISIBLE_RAD;
};
