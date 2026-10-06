# Implementation Plan: Survival economy (wall buys, doors, barricades, mystery box)

**Branch**: `002-survival-economy-g2` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Adds the spending side of the points ledger: a two-slot loadout fed by wall buys and a seeded mystery box, three paid passages that open zones and their spawn windows, and six-plank barricades torn by zombies and repaired for points. Rules live in new pure modules under `src/logic` (loadout, interactions, zoneDoors, barricades, mysteryBox) stepped by `gameSession`; render, HUD and audio read their state and events, mounted from `src/main.ts`.

## Technical Context

**Stack**: TypeScript strict, three.js, Vite single-file build, Vitest + jsdom (package.json, CLAUDE.md)
**Gates**: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`
**Constraints**: no external asset; at most 4 dynamic lights (3 lamps + flashlight already used, so the box signal is an emissive mesh); no allocation in per-step code; French player texts only in `src/ui/texts.ts`; every tuning number in `src/config/*.ts`.

## Standards

Always injected (not anchored): no-comments, naming-language, game/logic-render-split, game/tuning-config.

- @agent-os/standards/testing/logic-tests — every new logic module mirrored, seeded (US1, US3, US4, US6)
- @agent-os/standards/typing/strict-types — new state unions, Record lookups (US1, US3, US4, US6)
- @agent-os/standards/game/frame-independence — door, plank, box timers in stepS (US3, US4, US6)
- @agent-os/standards/game/seeded-random — box draw and teddy from session random (US6)
- @agent-os/standards/game/no-alloc-hot-path — per-step interaction scan, pellets, plank meshes (US1, US4, US5, US7)
- @agent-os/standards/game/touch-input — swap button active, interact visibility (US1, US2)
- @agent-os/standards/game/dom-hud — prompt, red feedback, two-weapon ammo (US2)
- @agent-os/standards/game/procedural-assets — silhouettes, debris, door, box built from primitives in src/render/models (US2, US5, US7)
- @agent-os/standards/game/mobile-performance — 4 dynamic lights already used, merged static zone geometry (US2, US5, US7)
- @agent-os/standards/game/procedural-audio — new synthesized voices and box roll music (US7)

## Verified facts

- `src/logic/game/gameSession.ts:26-39` — `GameSession` — holds `weapon: WeaponState` (readonly), `ledger`, `layout`, `events`, `random`; no loadout, no interaction state (source: recon inline)
- `src/logic/game/gameSession.ts:77-85` — `stepWeapon` — updates the single weapon then resolves each new `shotFired`/`knifeSwung` through `resolveAttack` (source: recon inline)
- `src/logic/game/gameSession.ts:60-69` — `resolveAttack` — one `resolveShot` per `shotFired`; pellets need a loop with yaw/pitch offsets here (source: recon inline)
- `src/logic/game/gameSession.ts:107-117` — `stepGameSession` — order: motion, targets, weapon, horde, rounds, health, ledger; `updateHorde(horde, player, stepS, layout, events)` has no barricade input (source: recon inline)
- `src/logic/economy/pointsLedger.ts:4-27` — `PointsLedger`, `applyEvent`, `endLedgerStep` — earns only; no spend function (source: recon inline)
- `src/config/pointsConfig.ts:1-7` — `POINTS_CONFIG` — START_POINTS 500, hit 10, kill 60/100/130 (source: recon inline)
- `src/config/weaponConfig.ts:1-23` — `WeaponId = "pistol"`, `WEAPONS: Record<WeaponId, WeaponSpec>` — exhaustive Record: each new id needs an entry; no price, pellet or spread field (source: recon inline)
- `src/logic/weapons/weaponState.ts:16-73` — `createWeapon`, `updateWeapon`, `shotDamage` — per-weapon state reusable as a loadout slot (source: recon inline)
- `src/logic/input/inputState.ts:1-21` — `InputState` — `interact` and `swap` flags exist, unused by logic (source: recon inline)
- `src/engine/input/keyboardMouse.ts:16-22` — `HOLD_KEYS` — KeyE -> interact, Digit1/Digit2 -> swap, wheel pulses swap for `SWAP_PULSE_MS` (source: recon inline)
- `src/engine/input/touchButtons.ts:17-24` — `BUTTONS` — swap button has `flag: null` (inactive, aria-disabled); interact hidden by default (source: recon inline)
- `src/engine/input/touchButtons.ts:116-121` — `setInteractVisible` — exists, not called anywhere (`src/main.ts:33` discards the return) (source: recon inline)
- `src/config/mapConfig.ts:1-48` — `ZoneId = "north" | "east" | "west"`, `ENTRANCES` (3 segments with zoneId), `WINDOWS` (8 windows, all on the start-room walls) — no zone room geometry, no prices (source: recon inline)
- `src/logic/map/stationLayout.ts:21-40` — `StationLayout` — `segments` = walls + entrances (entrances block movement), `spawnPoints` = all windows, readonly arrays built once (source: recon inline)
- `src/logic/combat/hitscan.ts:20` — `resolveShot` — iterates `layout.segments`: removing an entrance segment also unblocks shots (source: recon inline)
- `src/logic/zombies/zombieHorde.ts:9` — `ZombieState = "spawning" | "chasing" | "attacking" | "dying"` (source: recon inline)
- `src/logic/zombies/zombieHorde.ts:92-108` — `requestSpawn` — `random.pick(layout.spawnPoints)`; zombie placed at the window, `spawning` climbs in over `ZOMBIE_SPAWN_S` (source: recon inline)
- `src/logic/rounds/roundDirector.ts:45-51` — `updateIntermission` — emits `roundStarted` on each new round (repair cap reset hook) (source: recon inline)
- `src/logic/game/gameEvents.ts:1-17` — `GameEvent` union — no economy events (source: recon inline)
- `src/ui/hud.ts:21-59` — `createHud` — round, points, single `mag / reserve`, vignette; updates only on change (source: recon inline)
- `src/ui/texts.ts:1-19` — `TEXTS` — French texts, no prompt or weapon names (source: recon inline)
- `src/render/weapon/viewModel.ts:51-57` — `createViewModel` — builds only `VIEW.PISTOL_PARTS` (source: recon inline)
- `src/render/map/buildStation.ts:72-99` — `buildBlockers` — entrance blockers merged into one static mesh (cannot animate per door) (source: recon inline)
- `src/render/map/buildStation.ts:105-140` — `buildWindows` — frames built from `layout.spawnPoints` (source: recon inline)
- `src/render/map/buildStation.ts:175-193` — `buildStation` — walls = segments with `zoneId === null` (source: recon inline)
- `src/audio/audioDirector.ts:27-33` — `playEvent` — maps event kinds to voices (source: recon inline)
- `src/audio/soundVoices.ts:123-130` — `playShot`..`playZombieAttack` — one exported function per `SoundName` (source: recon inline)
- `src/config/audioConfig.ts:25` — `SoundName` union and `SOUNDS satisfies Record<SoundName, SoundSpec>` (source: recon inline)
- `src/main.ts:51-69` — `startGameLoop` render callback — every view updated here; `session.events.length = 0` at end of render (source: recon inline)
- `src/render/models/zombieModel.ts:225-231` — `poseZombie` — no pose for `spawning`; a new zombie state falls through unposed (source: recon inline)

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/logic/economy/pointsLedger.ts` | extend (`trySpend`) | US1 |
| `src/logic/weapons/loadout.ts` (+ `src/config/weaponConfig.ts`) | create | US1 |
| `src/logic/economy/interactions.ts` (+ `src/config/mapConfig.ts`, `src/logic/game/gameEvents.ts`) | create | US1 |
| `src/logic/game/gameSession.ts` | extend | US1, US3, US4, US6 |
| `src/engine/input/touchButtons.ts` | extend (swap active) | US1 |
| `src/ui/hud.ts` (+ `src/ui/texts.ts`) | extend | US2 |
| `src/ui/styles.css` | extend | US2 |
| `src/render/map/wallBuyView.ts` (+ `src/render/models/weaponSilhouette.ts`, `src/render/textures/priceLabel.ts`, `src/config/visualConfig.ts`) | create | US2 |
| `src/main.ts` | mount | US2, US5, US7 |
| `src/logic/map/stationLayout.ts` | extend | US3 |
| `src/logic/map/zoneDoors.ts` | create | US3 |
| `src/logic/economy/interactions.ts` | extend | US3, US4, US6 |
| `src/logic/map/barricades.ts` (+ `src/config/pointsConfig.ts`) | create | US4 |
| `src/logic/zombies/zombieHorde.ts` | extend | US4 |
| `src/render/map/buildStation.ts` | extend | US5 |
| `src/render/map/doorView.ts` (+ `src/render/models/doorModel.ts`) | create | US5 |
| `src/render/map/barricadeView.ts` | create | US5 |
| `src/logic/economy/mysteryBox.ts` (+ `src/config/boxConfig.ts`, weapon entries in `src/config/weaponConfig.ts`, `src/ui/texts.ts`) | create | US6 |
| `src/render/map/boxView.ts` (+ `src/render/models/boxModel.ts`) | create | US7 |
| `src/render/weapon/viewModel.ts` | extend | US7 |
| `src/audio/soundVoices.ts` (+ `src/config/audioConfig.ts`) | extend | US7 |
| `src/audio/audioDirector.ts` | extend | US7 |

## Decisions

- `session.weapon` stays as the transitional alias of the weapon in hand (made writable, re-pointed on swap/buy): `hud.ts` and `viewModel` keep reading it; `session.loadout` holds both slots — alternative (replace `weapon` by `loadout`) forces every consumer into US1.
- One `interactions` module computes the nearest point of every kind (wall buy, door, repair, box) and the prompt; purchases fire on the Interact rising edge, repair on hold — alternative (one prompt per module) would let two prompts compete in the HUD.
- Opening a zone removes its entrance segment from `layout.segments` and pushes its windows into `layout.spawnPoints` (both become mutable arrays); `layout.windows` keeps every window for render — collision, hitscan and spawn draw then need no change.
- Zombie window breach is a new `breaching` state before `spawning`; `zombieModel.poseZombie` and `zombieView` are not forced to change (unposed is acceptable while outside the window).
- Box signal is an emissive beam mesh, not a light: the 4-dynamic-light budget is already used.
- Power-ups are deferred whole to the next run (clarify Q1).
- Weapon view models move to US7 (with the box silhouettes) to keep US2 within 8 files with its companions.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md
