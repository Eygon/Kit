import * as THREE from "three";
import { VISUAL_CONFIG } from "@/config/visualConfig";
import type { WeaponMaterialKind, WeaponPartSpec } from "@/config/visualConfig";
import type { WeaponId } from "@/config/weaponConfig";

export type WeaponMaterials = Readonly<Record<WeaponMaterialKind, THREE.MeshStandardMaterial>>;
export type WeaponModelParts = { readonly group: THREE.Group; readonly materials: WeaponMaterials; readonly muzzle: THREE.Object3D };

const VIEW = VISUAL_CONFIG.VIEW_MODEL;
const BUILD = VIEW.WEAPON_BUILD;
const QUARTER_TURN_RAD = Math.PI / 2;

const createMaterial = (kind: WeaponMaterialKind): THREE.MeshStandardMaterial => {
  const spec = BUILD.MATERIALS[kind];
  return new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: spec.metalness,
    roughness: spec.roughness,
    emissive: spec.emissive,
    emissiveIntensity: spec.emissiveIntensity,
  });
};

const createMaterials = (): WeaponMaterials => ({
  metal: createMaterial("metal"),
  polymer: createMaterial("polymer"),
  wood: createMaterial("wood"),
  emissive: createMaterial("emissive"),
});

const buildLathe = (spec: WeaponPartSpec): THREE.BufferGeometry => {
  const radius = spec.size.x;
  const half = spec.size.z / 2;
  const profile = [
    [0, -half],
    [radius - spec.chamfer, -half],
    [radius, -half + spec.chamfer],
    [radius, half - spec.chamfer],
    [radius - spec.chamfer, half],
    [0, half],
  ].map(([x = 0, y = 0]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, BUILD.LATHE_SEGMENTS).rotateX(QUARTER_TURN_RAD);
};

const buildCylinder = (spec: WeaponPartSpec): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(spec.size.x, spec.size.x, spec.size.z, BUILD.LATHE_SEGMENTS).rotateX(QUARTER_TURN_RAD);

const buildExtrude = (spec: WeaponPartSpec): THREE.BufferGeometry => {
  const halfWidth = (spec.size.x - spec.chamfer * 2) / 2;
  const halfHeight = (spec.size.y - spec.chamfer * 2) / 2;
  const depth = spec.size.z - spec.chamfer * 2;
  const outline = new THREE.Shape()
    .moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth, halfHeight)
    .lineTo(-halfWidth, halfHeight)
    .closePath();
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: spec.chamfer,
    bevelSize: spec.chamfer,
    bevelOffset: 0,
    bevelSegments: BUILD.BEVEL_SEGMENTS,
  });
  return geometry.translate(0, 0, -depth / 2);
};

const buildGeometry = (spec: WeaponPartSpec): THREE.BufferGeometry => {
  if (spec.shape === "lathe") return buildLathe(spec);
  if (spec.shape === "cylinder") return buildCylinder(spec);
  return buildExtrude(spec);
};

export const buildWeaponModel = (weaponId: WeaponId): WeaponModelParts => {
  const group = new THREE.Group();
  group.name = weaponId;
  const materials = createMaterials();
  for (const spec of VIEW.WEAPON_MODELS[weaponId]) {
    const mesh = new THREE.Mesh(buildGeometry(spec), materials[spec.material]);
    mesh.name = spec.name;
    mesh.position.set(spec.position.x, spec.position.y, spec.position.z);
    mesh.rotation.x = spec.tiltX;
    group.add(mesh);
  }
  const muzzle = new THREE.Object3D();
  muzzle.name = BUILD.MUZZLE_NAME;
  muzzle.position.set(0, VIEW.MUZZLE_Y_M[weaponId], VIEW.MUZZLE_Z_M[weaponId]);
  group.add(muzzle);
  return { group, materials, muzzle };
};
