import * as THREE from "three";
import { ZONES } from "@/config/mapConfig";
import type { ZoneId } from "@/config/mapConfig";
import { doorProgress } from "@/logic/map/zoneDoors";
import type { ZoneDoors } from "@/logic/map/zoneDoors";
import type { StationLayout } from "@/logic/map/stationLayout";
import { segmentFrame } from "@/render/map/buildStation";
import { buildDebrisPile, buildSlidingDoor, createDoorParts, poseDebrisPile, poseSlidingDoor } from "@/render/models/doorModel";
import type { DoorParts } from "@/render/models/doorModel";

export type DoorView = {
  update: (doors: Readonly<ZoneDoors>) => void;
  dispose: () => void;
};

type DoorEntry = {
  readonly zoneId: ZoneId;
  readonly apply: (progress: number) => void;
  lastProgress: number;
};

const roomSide = (rotationY: number, midX: number, midZ: number): number => Math.sign(-(midX * Math.sin(rotationY) + midZ * Math.cos(rotationY))) || 1;

type BuiltDoor = {
  readonly group: THREE.Group;
  readonly apply: (progress: number) => void;
};

const buildDebris = (parts: DoorParts): BuiltDoor => {
  const pile = buildDebrisPile(parts);
  return { group: pile.group, apply: (progress) => poseDebrisPile(pile, progress) };
};

const buildSliding = (parts: DoorParts, passageM: number): BuiltDoor => {
  const door = buildSlidingDoor(parts, passageM);
  return { group: door.group, apply: (progress) => poseSlidingDoor(door, progress) };
};

const createEntry = (zoneId: ZoneId, entrance: StationLayout["entrances"][number], parts: DoorParts, root: THREE.Group): DoorEntry => {
  const frame = segmentFrame(entrance);
  const built = ZONES[zoneId].DOOR_KIND === "debris" ? buildDebris(parts) : buildSliding(parts, frame.lengthM);
  built.group.name = `door-${zoneId}`;
  built.group.position.set(frame.midX, 0, frame.midZ);
  built.group.rotation.y = frame.rotationY + (roomSide(frame.rotationY, frame.midX, frame.midZ) < 0 ? Math.PI : 0);
  root.add(built.group);
  return { zoneId, apply: built.apply, lastProgress: 0 };
};

export const createDoorView = (scene: THREE.Scene, layout: StationLayout): DoorView => {
  const root = new THREE.Group();
  root.name = "doors";
  const parts = createDoorParts();
  const entries: DoorEntry[] = [];
  for (const entrance of layout.entrances) {
    if (entrance.zoneId) entries.push(createEntry(entrance.zoneId, entrance, parts, root));
  }
  scene.add(root);

  const update: DoorView["update"] = (doors) => {
    for (const entry of entries) {
      const progress = doorProgress(doors, entry.zoneId);
      if (progress === entry.lastProgress) continue;
      entry.lastProgress = progress;
      entry.apply(progress);
    }
  };

  const dispose = (): void => {
    scene.remove(root);
    parts.dispose();
  };

  return { update, dispose };
};
