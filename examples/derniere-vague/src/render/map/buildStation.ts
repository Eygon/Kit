import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { STATION_LAYOUT, ZONES, ZONE_IDS } from "@/config/mapConfig";
import type { ZoneId } from "@/config/mapConfig";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import { createRandom } from "@/logic/random";
import { nightSkyTexture } from "@/render/textures/nightSkyTexture";
import { surfaceTexture } from "@/render/textures/surfaceTexture";
import type { StationLayout, WallSegment } from "@/logic/map/stationLayout";

export type StationHandle = {
  update: (frameS: number) => void;
};

type BoxPlacement = {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly rotationY: number;
};

export const tiledBoxGeometry = (width: number, height: number, depth: number): THREE.BoxGeometry => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, (uv.getX(index) * width) / VISUAL_CONFIG.TEXTURE_TILE_M, (uv.getY(index) * height) / VISUAL_CONFIG.TEXTURE_TILE_M);
  }
  return geometry;
};

const boxGeometry = (placement: BoxPlacement, tiled = true): THREE.BufferGeometry => {
  const geometry = tiled ? tiledBoxGeometry(placement.width, placement.height, placement.depth) : new THREE.BoxGeometry(placement.width, placement.height, placement.depth);
  const matrix = new THREE.Matrix4().makeRotationY(placement.rotationY).setPosition(placement.x, placement.y, placement.z);
  geometry.applyMatrix4(matrix);
  return geometry;
};

const mergeNamed = (name: string, geometries: THREE.BufferGeometry[], material: THREE.Material): THREE.Mesh => {
  const merged = mergeGeometries(geometries);
  if (!merged) throw new Error(`cannot merge ${name}`);
  geometries.forEach((geometry) => geometry.dispose());
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  return mesh;
};

export type SegmentFrame = {
  readonly lengthM: number;
  readonly midX: number;
  readonly midZ: number;
  readonly rotationY: number;
};

export const segmentFrame = (segment: WallSegment): SegmentFrame => {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  return { lengthM: Math.hypot(dx, dz), midX: (segment.ax + segment.bx) / 2, midZ: (segment.az + segment.bz) / 2, rotationY: Math.atan2(-dz, dx) };
};

const buildWalls = (segments: readonly WallSegment[], material: THREE.Material): THREE.Mesh => {
  const thickness = STATION_LAYOUT.WALL_THICKNESS_M;
  const geometries = segments.map((segment) => {
    const frame = segmentFrame(segment);
    return boxGeometry({
      width: frame.lengthM + thickness,
      height: STATION_LAYOUT.WALL_HEIGHT_M,
      depth: thickness,
      x: frame.midX,
      y: STATION_LAYOUT.WALL_HEIGHT_M / 2,
      z: frame.midZ,
      rotationY: frame.rotationY,
    });
  });
  return mergeNamed("walls", geometries, material);
};

type WindowParts = {
  readonly frames: THREE.Mesh;
  readonly panes: THREE.Mesh;
};

const buildWindows = (layout: StationLayout, frameMaterial: THREE.Material, paneMaterial: THREE.Material): WindowParts => {
  const frameGeometries: THREE.BufferGeometry[] = [];
  const paneGeometries: THREE.BufferGeometry[] = [];
  const width = VISUAL_CONFIG.WINDOW_WIDTH_M;
  const height = VISUAL_CONFIG.WINDOW_HEIGHT_M;
  const bar = VISUAL_CONFIG.WINDOW_FRAME_BAR_M;
  const centerY = VISUAL_CONFIG.WINDOW_SILL_M + height / 2;
  for (const spawn of layout.windows) {
    const inwardX = Math.sin(spawn.facing);
    const inwardZ = Math.cos(spawn.facing);
    const wallX = spawn.x + inwardX * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
    const wallZ = spawn.z + inwardZ * STATION_LAYOUT.WINDOW_SPAWN_OUTSET_M;
    const faceOffset = STATION_LAYOUT.WALL_THICKNESS_M / 2;
    const tangentX = inwardZ;
    const tangentZ = -inwardX;
    const place = (localX: number, localY: number, barWidth: number, barHeight: number, depth: number, push: number): BoxPlacement => ({
      width: barWidth,
      height: barHeight,
      depth,
      x: wallX + inwardX * push + tangentX * localX,
      y: centerY + localY,
      z: wallZ + inwardZ * push + tangentZ * localX,
      rotationY: spawn.facing,
    });
    const framePush = faceOffset;
    const depth = VISUAL_CONFIG.WINDOW_FRAME_DEPTH_M;
    frameGeometries.push(boxGeometry(place(0, height / 2, width + bar * 2, bar, depth, framePush)));
    frameGeometries.push(boxGeometry(place(0, -height / 2, width + bar * 2, bar, depth, framePush)));
    frameGeometries.push(boxGeometry(place(-width / 2 - bar / 2, 0, bar, height, depth, framePush)));
    frameGeometries.push(boxGeometry(place(width / 2 + bar / 2, 0, bar, height, depth, framePush)));
    frameGeometries.push(boxGeometry(place(0, 0, width, bar / 2, depth, framePush)));
    frameGeometries.push(boxGeometry(place(0, 0, bar / 2, height, depth, framePush)));
    paneGeometries.push(boxGeometry(place(0, 0, width, height, VISUAL_CONFIG.WINDOW_PANE_DEPTH_M, faceOffset + VISUAL_CONFIG.WINDOW_PANE_OFFSET_M), false));
  }
  return { frames: mergeNamed("windowFrames", frameGeometries, frameMaterial), panes: mergeNamed("windowPanes", paneGeometries, paneMaterial) };
};

const buildPlane = (name: string, material: THREE.Material, y: number, rotationX: number): THREE.Mesh => {
  const geometry = new THREE.PlaneGeometry(STATION_LAYOUT.HALF_WIDTH_M * 2 + VISUAL_CONFIG.FLOOR_MARGIN_M, STATION_LAYOUT.HALF_DEPTH_M * 2 + VISUAL_CONFIG.FLOOR_MARGIN_M);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.rotation.x = rotationX;
  mesh.position.y = y;
  return mesh;
};

type ZoneBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
};

const zoneBounds = (zoneId: ZoneId): ZoneBounds => {
  const walls = ZONES[zoneId].WALLS;
  const xs = walls.flatMap((wall) => [wall.ax, wall.bx]);
  const zs = walls.flatMap((wall) => [wall.az, wall.bz]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
};

const zonePlane = (zoneId: ZoneId, rotationX: number): THREE.BufferGeometry => {
  const bounds = zoneBounds(zoneId);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const geometry = new THREE.PlaneGeometry(width, depth);
  const uv = geometry.getAttribute("uv");
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, (uv.getX(index) * width) / (STATION_LAYOUT.HALF_WIDTH_M * 2), (uv.getY(index) * depth) / (STATION_LAYOUT.HALF_DEPTH_M * 2));
  }
  geometry.rotateX(rotationX);
  geometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  return geometry;
};

const buildZonePlanes = (name: string, material: THREE.Material, y: number, rotationX: number): THREE.Mesh => {
  const mesh = mergeNamed(
    name,
    ZONE_IDS.map((zoneId) => zonePlane(zoneId, rotationX)),
    material,
  );
  mesh.position.y = y;
  return mesh;
};

const lampLevel = (elapsedS: number, phase: number): number => {
  const fast = Math.max(0, Math.sin(elapsedS * VISUAL_CONFIG.FLICKER_FAST_RAD_S + phase) * Math.sin(elapsedS * VISUAL_CONFIG.FLICKER_SLOW_RAD_S + phase * VISUAL_CONFIG.FLICKER_PHASE_SKEW));
  const dropout = fast ** VISUAL_CONFIG.FLICKER_SHARPNESS;
  const hum = 0.5 + 0.5 * Math.sin(elapsedS * VISUAL_CONFIG.HUM_RAD_S + phase);
  return 1 - VISUAL_CONFIG.FLICKER_DEPTH * dropout - VISUAL_CONFIG.HUM_DEPTH * hum;
};

const buildLampBulbs = (material: THREE.Material): THREE.Mesh => {
  const size = VISUAL_CONFIG.LAMP_BULB_SIZE_M;
  const geometries = STATION_LAYOUT.LAMPS.map((lamp) => boxGeometry({ width: size * 2, height: size / 2, depth: size, x: lamp.x, y: lamp.y + size / 2, z: lamp.z, rotationY: 0 }));
  return mergeNamed("lamps", geometries, material);
};

const createFlashlight = (camera: THREE.Camera): void => {
  const spot = new THREE.SpotLight(VISUAL_CONFIG.FLASHLIGHT_COLOR, VISUAL_CONFIG.FLASHLIGHT_INTENSITY, VISUAL_CONFIG.FLASHLIGHT_DISTANCE_M, VISUAL_CONFIG.FLASHLIGHT_ANGLE_RAD, VISUAL_CONFIG.FLASHLIGHT_PENUMBRA, VISUAL_CONFIG.FLASHLIGHT_DECAY);
  spot.name = "flashlight";
  spot.position.set(VISUAL_CONFIG.FLASHLIGHT_OFFSET.x, VISUAL_CONFIG.FLASHLIGHT_OFFSET.y, VISUAL_CONFIG.FLASHLIGHT_OFFSET.z);
  spot.target.position.set(0, 0, -VISUAL_CONFIG.FLASHLIGHT_TARGET_DISTANCE_M);
  camera.add(spot);
  camera.add(spot.target);
};

export const buildStation = (scene: THREE.Scene, camera: THREE.PerspectiveCamera, layout: StationLayout): StationHandle => {
  scene.background = new THREE.Color(VISUAL_CONFIG.FOG_COLOR);
  scene.fog = new THREE.FogExp2(VISUAL_CONFIG.FOG_COLOR, VISUAL_CONFIG.FOG_DENSITY);
  scene.add(new THREE.HemisphereLight(VISUAL_CONFIG.AMBIENT_SKY_COLOR, VISUAL_CONFIG.AMBIENT_GROUND_COLOR, VISUAL_CONFIG.AMBIENT_INTENSITY));

  const roomTilesX = (STATION_LAYOUT.HALF_WIDTH_M * 2) / VISUAL_CONFIG.TEXTURE_TILE_M;
  const roomTilesZ = (STATION_LAYOUT.HALF_DEPTH_M * 2) / VISUAL_CONFIG.TEXTURE_TILE_M;
  const wallMaterial = new THREE.MeshStandardMaterial({ color: VISUAL_CONFIG.WALL_COLOR, roughness: VISUAL_CONFIG.WALL_ROUGHNESS, map: surfaceTexture("wall", VISUAL_CONFIG.WALL_TEXTURE, 1, 1) });
  const floorMaterial = new THREE.MeshStandardMaterial({ roughness: VISUAL_CONFIG.FLOOR_ROUGHNESS, map: surfaceTexture("floor", VISUAL_CONFIG.FLOOR_TEXTURE, roomTilesX, roomTilesZ) });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ roughness: VISUAL_CONFIG.CEILING_ROUGHNESS, map: surfaceTexture("ceiling", VISUAL_CONFIG.CEILING_TEXTURE, roomTilesX, roomTilesZ) });
  const woodTexture = surfaceTexture("wood", VISUAL_CONFIG.WOOD_TEXTURE, 1, 1);
  const frameMaterial = new THREE.MeshStandardMaterial({ roughness: VISUAL_CONFIG.WOOD_ROUGHNESS, map: woodTexture });
  const paneMaterial = new THREE.MeshBasicMaterial({ color: VISUAL_CONFIG.NIGHT_SKY.TINT, map: nightSkyTexture(), fog: false });
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: VISUAL_CONFIG.LAMP_COLOR, fog: false });

  const solidWalls = layout.segments.filter((segment) => segment.zoneId === null);
  const windows = buildWindows(layout, frameMaterial, paneMaterial);
  scene.add(buildWalls(solidWalls, wallMaterial), windows.frames, windows.panes, buildLampBulbs(bulbMaterial));
  scene.add(buildPlane("floor", floorMaterial, 0, -Math.PI / 2), buildPlane("ceiling", ceilingMaterial, STATION_LAYOUT.WALL_HEIGHT_M, Math.PI / 2));
  const zoneFloorMaterial = new THREE.MeshStandardMaterial({ color: VISUAL_CONFIG.ZONE_FLOOR_TINT, roughness: VISUAL_CONFIG.FLOOR_ROUGHNESS, map: floorMaterial.map });
  const zoneCeilingMaterial = new THREE.MeshStandardMaterial({ color: VISUAL_CONFIG.ZONE_CEILING_TINT, roughness: VISUAL_CONFIG.CEILING_ROUGHNESS, map: ceilingMaterial.map });
  scene.add(buildZonePlanes("zoneFloors", zoneFloorMaterial, 0, -Math.PI / 2), buildZonePlanes("zoneCeilings", zoneCeilingMaterial, STATION_LAYOUT.WALL_HEIGHT_M, Math.PI / 2));

  const lamps = STATION_LAYOUT.LAMPS.map((position, index) => {
    const light = new THREE.PointLight(VISUAL_CONFIG.LAMP_COLOR, VISUAL_CONFIG.LAMP_BASE_INTENSITY, VISUAL_CONFIG.LAMP_DISTANCE_M, VISUAL_CONFIG.LAMP_DECAY);
    light.name = `lamp${index}`;
    light.position.set(position.x, position.y, position.z);
    scene.add(light);
    return { light, phase: index * VISUAL_CONFIG.LAMP_PHASE_STEP_RAD };
  });

  if (camera.parent !== scene) scene.add(camera);
  createFlashlight(camera);

  const bulbBase = new THREE.Color(VISUAL_CONFIG.LAMP_COLOR);
  const cutoutRandom = createRandom(VISUAL_CONFIG.LAMP_CUTOUT_SEED);
  const nextCutoutStartS = (fromS: number): number => fromS + cutoutRandom.range(VISUAL_CONFIG.LAMP_CUTOUT_MIN_S, VISUAL_CONFIG.LAMP_CUTOUT_MAX_S);
  let cutoutStartS = nextCutoutStartS(0);
  let elapsedS = 0;
  const update = (frameS: number): void => {
    elapsedS += Math.max(0, frameS);
    if (elapsedS >= cutoutStartS + VISUAL_CONFIG.LAMP_CUTOUT_S) cutoutStartS = nextCutoutStartS(cutoutStartS + VISUAL_CONFIG.LAMP_CUTOUT_S);
    const cutOut = elapsedS >= cutoutStartS;
    let levelSum = 0;
    for (const lamp of lamps) {
      const level = cutOut ? 0 : lampLevel(elapsedS, lamp.phase);
      lamp.light.intensity = VISUAL_CONFIG.LAMP_BASE_INTENSITY * level;
      levelSum += level;
    }
    bulbMaterial.color.copy(bulbBase).multiplyScalar(levelSum / lamps.length);
  };
  update(0);
  return { update };
};
