import * as THREE from "three";
import { BARRICADE } from "@/config/mapConfig";
import { ZOMBIE_VISUAL } from "@/config/visualConfig";
import { ZOMBIE_CONFIG } from "@/config/zombieConfig";
import { createRandom } from "@/logic/random";
import type { Random } from "@/logic/random";
import type { ZombieState } from "@/logic/zombies/zombieHorde";

export type ZombieVariant = 0 | 1 | 2;
export type ZombieGait = "walk" | "run";
export type ZombieReaction = { recoil: number; headSnap: number };

export type VariantMaterials = {
  readonly skin: THREE.MeshStandardMaterial;
  readonly shirt: THREE.MeshStandardMaterial;
  readonly trousers: THREE.MeshStandardMaterial;
};

export type ZombieParts = {
  readonly torsoGeometry: THREE.BufferGeometry;
  readonly headGeometry: THREE.BufferGeometry;
  readonly jawGeometry: THREE.BufferGeometry;
  readonly armGeometry: THREE.BufferGeometry;
  readonly legGeometry: THREE.BufferGeometry;
  readonly eyeGeometry: THREE.BufferGeometry;
  readonly shellGeometries: readonly THREE.BufferGeometry[];
  readonly variants: readonly [VariantMaterials, VariantMaterials, VariantMaterials];
  readonly eyeMaterial: THREE.MeshBasicMaterial;
  readonly skinTexture: THREE.CanvasTexture;
  readonly materials: readonly THREE.Material[];
  readonly dispose: () => void;
};

type Joints = {
  rig: THREE.Object3D;
  head: THREE.Object3D;
  jaw: THREE.Object3D;
  armLeft: THREE.Object3D;
  armRight: THREE.Object3D;
  legLeft: THREE.Object3D;
  legRight: THREE.Object3D;
};

const VIS = ZOMBIE_VISUAL;
const FULL_TURN = Math.PI * 2;
const HALF_TURN = Math.PI / 2;
const HALF = 0.5;
const joints = new WeakMap<THREE.Object3D, Joints>();
const NO_REACTION: Readonly<ZombieReaction> = { recoil: 0, headSnap: 0 };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const mix = (from: number, to: number, ratio: number): number => from + (to - from) * ratio;

const paintBlotches = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  for (let index = 0; index < VIS.SKIN_BLOTCH_COUNT; index++) {
    const radius = random.range(VIS.SKIN_BLOTCH_MIN_RADIUS_PX, VIS.SKIN_BLOTCH_MAX_RADIUS_PX);
    context.fillStyle = VIS.SKIN_SHADE_COLOR;
    context.globalAlpha = random.range(0, VIS.SKIN_BLOTCH_ALPHA);
    context.beginPath();
    context.arc(random.range(0, sizePx), random.range(0, sizePx), radius, 0, FULL_TURN);
    context.fill();
  }
  context.globalAlpha = 1;
};

const paintVeins = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  context.strokeStyle = VIS.SKIN_VEIN_COLOR;
  context.lineWidth = VIS.SKIN_VEIN_WIDTH_PX;
  for (let index = 0; index < VIS.SKIN_VEIN_COUNT; index++) {
    const x = random.range(0, sizePx);
    const y = random.range(0, sizePx);
    const angle = random.range(0, FULL_TURN);
    const length = random.range(VIS.SKIN_VEIN_MIN_LENGTH_PX, VIS.SKIN_VEIN_MAX_LENGTH_PX);
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + Math.cos(angle + 1) * length, y + Math.sin(angle + 1) * length, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
};

const paintBlood = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  context.fillStyle = VIS.SKIN_BLOOD_COLOR;
  for (let index = 0; index < VIS.SKIN_BLOOD_COUNT; index++) {
    context.beginPath();
    context.arc(random.range(0, sizePx), random.range(0, sizePx), random.range(VIS.SKIN_BLOOD_MIN_RADIUS_PX, VIS.SKIN_BLOOD_MAX_RADIUS_PX), 0, FULL_TURN);
    context.fill();
  }
};

const paintSpeckles = (context: CanvasRenderingContext2D, sizePx: number, random: Random): void => {
  for (let index = 0; index < VIS.SKIN_SPECKLE_COUNT; index++) {
    const light = random.next() > 0.5;
    context.fillStyle = light ? `rgba(255,255,255,${random.range(0, VIS.SKIN_SPECKLE_ALPHA)})` : `rgba(0,0,0,${random.range(0, VIS.SKIN_SPECKLE_ALPHA)})`;
    context.fillRect(random.range(0, sizePx), random.range(0, sizePx), 1 + random.int(0, 2), 1 + random.int(0, 2));
  }
};

const createSkinTexture = (): THREE.CanvasTexture => {
  const sizePx = VIS.SKIN_SIZE_PX;
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const context = canvas.getContext("2d");
  if (context) {
    const random = createRandom(VIS.SKIN_SEED);
    context.fillStyle = VIS.SKIN_BASE_COLOR;
    context.fillRect(0, 0, sizePx, sizePx);
    paintBlotches(context, sizePx, random);
    paintVeins(context, sizePx, random);
    paintBlood(context, sizePx, random);
    paintSpeckles(context, sizePx, random);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

type CapsuleSpec = { readonly radius: number; readonly length: number };
type ProfilePoint = { readonly r: number; readonly y: number };
type VariantSpec = (typeof VIS.VARIANTS)[number];

const hangingCapsule = (spec: CapsuleSpec): THREE.BufferGeometry =>
  new THREE.CapsuleGeometry(spec.radius, spec.length, VIS.CAPSULE_CAP_SEGMENTS, VIS.CAPSULE_RADIAL_SEGMENTS).translate(0, -(spec.length / 2 + spec.radius), 0);

const lathe = (profile: readonly ProfilePoint[]): THREE.BufferGeometry =>
  new THREE.LatheGeometry(
    profile.map((point) => new THREE.Vector2(point.r, point.y)),
    VIS.LATHE_SEGMENTS,
  );

const createShellGeometry = (shell: (typeof VIS.SHELLS)[number]): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(shell.radiusTop, shell.radiusBottom, shell.height, VIS.LATHE_SEGMENTS, 1, true, shell.thetaStart, shell.thetaLength).scale(1, 1, VIS.TORSO.depthRatio);

const createVariantMaterials = (spec: VariantSpec, skinTexture: THREE.Texture): VariantMaterials => ({
  skin: new THREE.MeshStandardMaterial({ map: skinTexture, color: spec.skinColor, roughness: VIS.SKIN_ROUGHNESS }),
  shirt: new THREE.MeshStandardMaterial({ color: spec.shirtColor, roughness: VIS.CLOTH_ROUGHNESS, side: THREE.DoubleSide }),
  trousers: new THREE.MeshStandardMaterial({ color: spec.trousersColor, roughness: VIS.CLOTH_ROUGHNESS }),
});

export const createZombieParts = (): ZombieParts => {
  const skinTexture = createSkinTexture();
  const torsoGeometry = new THREE.CapsuleGeometry(VIS.TORSO.radius, VIS.TORSO.length, VIS.CAPSULE_CAP_SEGMENTS, VIS.CAPSULE_RADIAL_SEGMENTS).scale(1, 1, VIS.TORSO.depthRatio);
  const headGeometry = lathe(VIS.HEAD.profile).translate(0, VIS.HEAD.offsetY, 0);
  const jawGeometry = lathe(VIS.JAW.profile);
  const armGeometry = hangingCapsule(VIS.ARM);
  const legGeometry = hangingCapsule(VIS.LEG);
  const eyeGeometry = new THREE.BoxGeometry(VIS.EYE_SIZE_M, VIS.EYE_SIZE_M, VIS.EYE_SIZE_M);
  const shellGeometries = VIS.SHELLS.map(createShellGeometry);
  const variants = [
    createVariantMaterials(VIS.VARIANTS[0], skinTexture),
    createVariantMaterials(VIS.VARIANTS[1], skinTexture),
    createVariantMaterials(VIS.VARIANTS[2], skinTexture),
  ] as const;
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: VIS.EYE_COLOR });
  const geometries = [torsoGeometry, headGeometry, jawGeometry, armGeometry, legGeometry, eyeGeometry, ...shellGeometries];
  const materials = [...variants.flatMap((variant) => [variant.skin, variant.shirt, variant.trousers]), eyeMaterial];
  const dispose = (): void => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    skinTexture.dispose();
  };
  return { torsoGeometry, headGeometry, jawGeometry, armGeometry, legGeometry, eyeGeometry, shellGeometries, variants, eyeMaterial, skinTexture, materials, dispose };
};

const namedMesh = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
};

const namedPivot = (name: string, x: number, y: number, z: number): THREE.Group => {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(x, y, z);
  return pivot;
};

export const buildZombie = (parts: ZombieParts, variant: ZombieVariant): THREE.Group => {
  const dress = parts.variants[variant];
  const root = new THREE.Group();
  root.name = "zombie";
  const rig = namedPivot("rig", 0, 0, 0);
  const torso = namedMesh("torso", parts.torsoGeometry, dress.shirt);
  torso.position.set(VIS.TORSO.position.x, VIS.TORSO.position.y, VIS.TORSO.position.z);
  const head = namedPivot("head", VIS.HEAD.pivot.x, VIS.HEAD.pivot.y, VIS.HEAD.pivot.z);
  head.add(namedMesh("skull", parts.headGeometry, dress.skin));
  const jaw = namedPivot("jaw", 0, VIS.JAW.pivotY, 0);
  jaw.add(namedMesh("jawbone", parts.jawGeometry, dress.skin));
  head.add(jaw);
  for (const side of [-1, 1]) {
    const eye = namedMesh("eye", parts.eyeGeometry, parts.eyeMaterial);
    eye.position.set(VIS.EYE_OFFSET.x * side, VIS.HEAD.offsetY + VIS.EYE_OFFSET.y, VIS.EYE_OFFSET.z);
    head.add(eye);
  }
  VIS.SHELLS.forEach((shell, index) => {
    const geometry = parts.shellGeometries[index];
    if (!geometry) return;
    const mesh = namedMesh("shell", geometry, dress.shirt);
    mesh.position.set(0, shell.y, 0);
    rig.add(mesh);
  });
  const armLeft = namedPivot("armLeft", -VIS.ARM.shoulderX, VIS.ARM.shoulderY, 0);
  const armRight = namedPivot("armRight", VIS.ARM.shoulderX, VIS.ARM.shoulderY, 0);
  const legLeft = namedPivot("legLeft", -VIS.LEG.hipX, VIS.LEG.hipY, 0);
  const legRight = namedPivot("legRight", VIS.LEG.hipX, VIS.LEG.hipY, 0);
  armLeft.add(namedMesh("arm", parts.armGeometry, dress.skin));
  armRight.add(namedMesh("arm", parts.armGeometry, dress.skin));
  legLeft.add(namedMesh("leg", parts.legGeometry, dress.trousers));
  legRight.add(namedMesh("leg", parts.legGeometry, dress.trousers));
  rig.add(torso, head, armLeft, armRight, legLeft, legRight);
  root.add(rig);
  joints.set(root, { rig, head, jaw, armLeft, armRight, legLeft, legRight });
  return root;
};

const setArms = (rigJoints: Joints, left: number, right: number): void => {
  rigJoints.armLeft.rotation.x = left;
  rigJoints.armRight.rotation.x = right;
};

const setLegs = (rigJoints: Joints, swingRad: number, rightRatio = 1): void => {
  rigJoints.legLeft.rotation.x = swingRad;
  rigJoints.legRight.rotation.x = -swingRad * rightRatio;
};

const poseWalk = (rigJoints: Joints, phaseS: number): void => {
  const phase = phaseS * VIS.WALK_RAD_PER_S;
  const swing = Math.sin(phase);
  setLegs(rigJoints, swing * VIS.LEG_SWING_RAD, VIS.LIMP_RATIO);
  setArms(rigJoints, VIS.ARM_RAISE_RAD + swing * VIS.ARM_SWAY_RAD, VIS.ARM_RAISE_RAD - swing * VIS.ARM_SWAY_RAD);
  rigJoints.rig.rotation.x = -VIS.WALK_LEAN_RAD;
  rigJoints.rig.rotation.z = Math.sin(phase / 2) * VIS.BODY_SWAY_RAD + VIS.LIMP_DIP_RAD;
  rigJoints.rig.position.y = Math.abs(swing) * VIS.WALK_BOB_M;
  rigJoints.head.rotation.z = Math.sin(phase / 2 + 1) * VIS.HEAD_LOLL_RAD;
};

const poseRun = (rigJoints: Joints, phaseS: number): void => {
  const phase = phaseS * VIS.WALK_RAD_PER_S;
  const swing = Math.sin(phase);
  setLegs(rigJoints, swing * VIS.RUN_LEG_SWING_RAD);
  setArms(rigJoints, VIS.RUN_ARM_FORWARD_RAD + swing * VIS.RUN_ARM_SWAY_RAD, VIS.RUN_ARM_FORWARD_RAD - swing * VIS.RUN_ARM_SWAY_RAD);
  rigJoints.rig.rotation.x = -VIS.RUN_LEAN_RAD;
  rigJoints.rig.rotation.z = Math.sin(phase * HALF) * VIS.BODY_SWAY_RAD;
  rigJoints.rig.position.y = Math.abs(swing) * VIS.RUN_BOB_M;
  rigJoints.head.rotation.x = VIS.RUN_LEAN_RAD;
  rigJoints.head.rotation.z = Math.sin(phase * HALF + 1) * VIS.HEAD_LOLL_RAD;
};

const poseAttack = (rigJoints: Joints, phaseS: number): void => {
  const windup = ZOMBIE_CONFIG.ZOMBIE_ATTACK_WINDUP_S;
  const rise = clamp01(phaseS / windup);
  const slam = clamp01((phaseS - windup) / (ZOMBIE_CONFIG.ZOMBIE_ATTACK_DURATION_S - windup));
  const arm = slam > 0 ? mix(VIS.ATTACK_RAISE_RAD, VIS.ATTACK_SLAM_RAD, slam * slam) : mix(VIS.ARM_RAISE_RAD, VIS.ATTACK_RAISE_RAD, 1 - (1 - rise) * (1 - rise));
  const lean = slam > 0 ? mix(VIS.ATTACK_LEAN_BACK_RAD, -VIS.ATTACK_LEAN_FORWARD_RAD, slam * slam) : VIS.ATTACK_LEAN_BACK_RAD * rise;
  setArms(rigJoints, arm, arm);
  rigJoints.rig.rotation.x = lean;
  rigJoints.head.rotation.x = -lean / 2;
  rigJoints.jaw.rotation.x = -mix(VIS.JAW_OPEN_RAD, VIS.JAW_ATTACK_OPEN_RAD, slam > 0 ? 1 : rise);
};

const poseDeath = (rigJoints: Joints, phaseS: number): void => {
  const fall = clamp01(phaseS / VIS.DEATH_FALL_S);
  const eased = fall * fall;
  rigJoints.rig.rotation.x = eased * HALF_TURN;
  rigJoints.rig.position.y = eased * VIS.DEATH_LIFT_M;
  const arm = mix(VIS.ARM_RAISE_RAD, VIS.DEATH_ARM_RAD, eased);
  setArms(rigJoints, arm, arm);
  rigJoints.head.rotation.x = eased * VIS.HEAD_LOLL_RAD;
};

const poseSpawn = (rigJoints: Joints, phaseS: number): void => {
  const progress = clamp01(phaseS / ZOMBIE_CONFIG.ZOMBIE_SPAWN_S);
  const arc = Math.sin(progress * Math.PI);
  setLegs(rigJoints, Math.sin(phaseS * VIS.CLIMB_RAD_PER_S) * VIS.CLIMB_LEG_RAD);
  setArms(rigJoints, VIS.ARM_RAISE_RAD, VIS.ARM_RAISE_RAD);
  rigJoints.rig.rotation.x = -VIS.CLIMB_LEAN_RAD * arc;
  rigJoints.rig.position.y = VIS.CLIMB_LIFT_M * arc;
};

const poseBreach = (rigJoints: Joints, phaseS: number): void => {
  const cycle = clamp01(phaseS / BARRICADE.TEAR_INTERVAL_S);
  const leftPull = cycle ** VIS.BREACH_EASE_POWER;
  const rightPull = clamp01(cycle + VIS.BREACH_ARM_STAGGER) ** VIS.BREACH_EASE_POWER;
  setArms(rigJoints, mix(VIS.BREACH_REACH_RAD, VIS.BREACH_PULL_RAD, leftPull), mix(VIS.BREACH_REACH_RAD, VIS.BREACH_PULL_RAD, rightPull));
  rigJoints.rig.rotation.x = -VIS.BREACH_LEAN_RAD + VIS.BREACH_PULL_LEAN_BACK_RAD * leftPull;
  rigJoints.rig.rotation.z = Math.sin(phaseS * VIS.BREACH_SHAKE_RAD_PER_S) * VIS.BREACH_SHAKE_RAD * leftPull;
  rigJoints.head.rotation.x = -VIS.BREACH_HEAD_NOD_RAD * leftPull;
};

const resetPose = (rigJoints: Joints): void => {
  rigJoints.rig.rotation.set(0, 0, 0);
  rigJoints.rig.position.y = 0;
  rigJoints.head.rotation.set(0, 0, 0);
  rigJoints.jaw.rotation.set(-VIS.JAW_OPEN_RAD, 0, 0);
  setLegs(rigJoints, 0);
  setArms(rigJoints, 0, 0);
};

const applyReaction = (rigJoints: Joints, reaction: Readonly<ZombieReaction>): void => {
  rigJoints.rig.rotation.x += reaction.recoil * VIS.HIT_RECOIL_RAD;
  rigJoints.head.rotation.x += reaction.headSnap * VIS.HEAD_SNAP_RAD;
};

export const poseZombie = (group: THREE.Object3D, state: ZombieState, phaseS: number, gait: ZombieGait = "walk", reaction: Readonly<ZombieReaction> = NO_REACTION): void => {
  const rigJoints = joints.get(group);
  if (!rigJoints) return;
  resetPose(rigJoints);
  if (state === "chasing") (gait === "run" ? poseRun : poseWalk)(rigJoints, phaseS);
  else if (state === "attacking") poseAttack(rigJoints, phaseS);
  else if (state === "dying") poseDeath(rigJoints, phaseS);
  else if (state === "breaching") poseBreach(rigJoints, phaseS);
  else poseSpawn(rigJoints, phaseS);
  applyReaction(rigJoints, reaction);
};
