# Implementation Plan: Premium rendering, feedback and sound

**Branch**: `004-premium-rendering-g4` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Presentation-only feature over the three.js FPS: rounded per-weapon view models, organic zombie rig with variants, hit reactions and pooled blood particles, floating points and camera shake, end-of-run statistics, per-weapon and ambient synthesized audio, adaptive quality with a debug counter and a `window.__qa()` hook. The only logic touches are counting (run statistics) and one new event (`dryFired`); no rule changes.

## Technical Context

**Stack**: TypeScript strict, three.js, Vite single-file build, Vitest (jsdom), WebAudio synthesized voices, DOM HUD over canvas (CLAUDE.md, package.json).
**Gates**: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`.
**Constraints**: mobile budget (< ~150 draw calls, pixel ratio capped), no external asset, no allocation per frame, all numbers in `src/config/*`.

## Standards

- @agent-os/standards/no-comments — always injected
- @agent-os/standards/naming-language — always injected; French texts in texts.ts
- @agent-os/standards/game/logic-render-split — always injected; stats and dryFired in logic
- @agent-os/standards/game/tuning-config — always injected; every size/timing in config
- @agent-os/standards/game/procedural-assets — models from Lathe/Capsule/Extrude primitives
- @agent-os/standards/game/no-alloc-hot-path — blood, floating numbers, shake pooled
- @agent-os/standards/game/mobile-performance — shared zombie geometries, adaptive pixel ratio
- @agent-os/standards/typing/strict-types — variants and quality levels as unions
- @agent-os/standards/game/procedural-audio — per-weapon shots, drone ambience, stingers
- @agent-os/standards/game/dom-hud — floating points, stats, debug counter as DOM/CSS
- @agent-os/standards/testing/logic-tests — runStats and dryFired mirror tests
- @agent-os/standards/game/frame-independence — reactions and shake on frameS only

## Verified facts

- `src/main.ts:28-102` — top-level orchestration — every view is created and updated in the `startGameLoop` render callback; `src/__tests__/main.test.ts` imports `@/main` with mocks, so main.ts is testable and is the mount point (source : recon inline).
- `src/main.ts:63-66` — `syncCamera` — camera position/rotation set from `session.player` each render; shake offset must be applied after it (source : recon inline).
- `src/render/weapon/viewModel.ts:29-42` — `buildPart`, `buildWeaponModel` — current weapon models are Box/Cylinder parts from `VISUAL_CONFIG.VIEW_MODEL` (source : recon inline).
- `src/render/weapon/viewModel.ts:66-77` — `createViewModel` — group at `VIEW.REST_POSITION`, hand at `VIEW.HAND_POSITION` (source : recon inline).
- `src/config/visualConfig.ts:195-207` — `VIEW_MODEL.REST_POSITION` `{ x: 0.2, y: -0.2, z: -0.42 }` — to move lower and further right (source : recon inline).
- `src/render/models/handModel.ts:14-30` — `buildGlovedHand` — box/capsule parts from `VISUAL_CONFIG.VIEW_MODEL.HAND.PARTS` (source : recon inline).
- `src/render/models/weaponSilhouette.ts:16-22` — `createWeaponSilhouette` — wall-buy merged silhouette, not the view model (source : recon inline).
- `src/config/weaponConfig.ts:1` — `WeaponId` — `"pistol" | "smg" | "carbine" | "shotgun" | "lmg" | "rayGun"`; rayGun is the energy weapon (source : recon inline).
- `src/render/models/zombieModel.ts:106-112` — `createZombieParts` — torso, head, arms, legs, eyes are BoxGeometry (source : recon inline).
- `src/render/models/zombieModel.ts:236-245` — `poseZombie(group, state, phaseS)` — single consumer `src/render/zombies/zombieView.ts:40` plus its test (source : recon inline).
- `src/render/models/zombieModel.ts:199-207` — `poseDeath` — the death fall already exists over `VIS.DEATH_FALL_S`; AC US3-3 is kept as a non-regression check, no task (source : recon inline).
- `src/logic/zombies/zombieHorde.ts:195` — `alive = false` only after `ZOMBIE_DEATH_S` in the dying state, so the view keeps dying zombies visible (source : recon inline).
- `src/config/zombieConfig.ts:1-8` — `ZombieSpeedMode`, `ZOMBIE_SPEEDS_MPS { walk: 1.1, run: 2.2, sprint: 3.4 }` — run gait threshold source (source : recon inline).
- `src/render/zombies/zombieView.ts:13-45` — `createZombieView(scene, parts)` — pooled groups, `update(horde, alpha, frameS)`, no events today (source : recon inline).
- `src/logic/game/gameEvents.ts:5-29` — `GameEvent` — `zombieHit { id, damage, head, knife }` carries no hit point; `playerHit`, `nukeDetonated`, `roundStarted` exist; no dry-fire event (source : recon inline).
- `src/logic/weapons/weaponState.ts:49-59` — `tryFire` — returns silently when `mag <= 0` and no reload is possible: insertion point of `dryFired` (source : recon inline).
- `src/logic/rounds/roundDirector.ts:42` — `rounds.phase = { kind: "intermission" }` — round end, no event (source : recon inline).
- `src/logic/economy/pointsLedger.ts:4-19` — `PointsLedger.points`, `applyEvent` — points gains for kill/headshot/hit (source : recon inline).
- `src/logic/game/gameSession.ts:41-62` — `GameSession` — no statistics field; `phase` set to `over` at line 148 (source : recon inline).
- `src/logic/game/gameSession.ts:160-168` — `applyEvent(session.ledger, event)` on zombieKilled / zombieHit — where stats are recorded (source : recon inline).
- `src/ui/hud.ts:190-200` — `update` — `shownPoints` compared to `session.ledger.points`: source of the floating points delta (source : recon inline).
- `src/ui/menus.ts:76-85` — `showEnd(roundReached)` — game over text from `TEXTS.gameOver` (source : recon inline).
- `src/audio/audioDirector.ts:47-63` — `playEvent` — `shotFired` -> `playShot(audio)` without weapon id; `roundStarted` -> `playRoundJingle` (source : recon inline).
- `src/audio/soundVoices.ts:123-141` — `playShot` … `playKillMarker` — one spec per sound in `AUDIO_CONFIG.SOUNDS` (source : recon inline).
- `src/config/audioConfig.ts:28-34` — `SOUNDS.SHOT` — single shot spec for all weapons; no ambience entry (source : recon inline).
- `src/render/createRenderer.ts:12-13` — `setPixelRatio(min(devicePixelRatio, MAX_PIXEL_RATIO))` — `src/config/gameConfig.ts:4` `MAX_PIXEL_RATIO: 2` (source : recon inline).
- `src/render/effects/bloodDecals.ts:60-151` — floor decals pool, `update(events, horde)`; no airborne particles exist (source : recon inline).
- Freshness: working tree equals `origin/dev` at `2442ded` (`git diff origin/dev` empty).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/render/models/weaponModel.ts` | create | US1 |
| `src/render/models/handModel.ts` | extend | US1 |
| `src/render/weapon/viewModel.ts` | extend | US1 |
| `src/config/visualConfig.ts` | extend (shared, append only) | US1, US2, US3, US4, US7 |
| `src/render/models/zombieModel.ts` | extend | US2, US3 |
| `src/render/zombies/zombieView.ts` | extend | US2, US3 |
| `src/render/effects/bloodParticles.ts` | create | US3 (extended US7) |
| `src/main.ts` | mount | US3, US7, US8 |
| `src/ui/floatingPoints.ts` | create | US4 |
| `src/ui/hud.ts` | extend | US4 |
| `src/render/cameraShake.ts` | create | US3 |
| `src/ui/styles.css` | extend (shared, append only) | US4, US5, US8 |
| `src/logic/game/runStats.ts` | create | US5 |
| `src/logic/game/gameSession.ts` | extend | US5 |
| `src/ui/menus.ts` | extend | US5 |
| `src/ui/texts.ts` | extend (shared, append only) | US4, US5, US8 |
| `src/logic/game/gameEvents.ts` | extend | US6 |
| `src/logic/weapons/weaponState.ts` | extend | US6 |
| `src/config/audioConfig.ts` | extend | US6 |
| `src/audio/soundVoices.ts` | extend | US6 |
| `src/audio/ambience.ts` | create | US6 |
| `src/audio/audioDirector.ts` | extend | US6 |
| `src/render/adaptiveQuality.ts` | create | US7 |
| `src/ui/debugOverlay.ts` | create | US8 |
| `src/engine/qaHook.ts` | create | US7 |

Order: US1 -> US2 -> US3 -> US4 -> US5 -> US7 -> US8 on the main lane; US6 shares no production file with any other US (parallel lane).

## Decisions

- Run statistics are a pure logic tracker (`runStats.ts`) recorded in `stepGameSession` — a UI counter would own game state (clarify Q1).
- `dryFired` is a new `GameEvent` variant pushed by `tryFire`; its only consumer is the audio director in the same US (clarify Q2).
- Round-end jingle is triggered by the audio director on the `rounds.phase` transition to `intermission` — no new logic event (clarify Q2).
- Blood particles are a new pooled `THREE.Points` effect separate from floor decals — decals stay unchanged.
- Hit reactions are view-side timers in `zombieView` keyed by pool index, driven by `zombieHit` events and `frameS` — no logic state.
- Adaptive quality lowers the renderer pixel ratio then the blood particle density only; dust density is left out to stay within the US7 file cap.
- `window.__qa` is always installed; the debug counter only with `?debug=1` (clarify Q4).
- Sanity re-split (audit-lint story-too-many-prod-files on US4 and US7, 7 files each): camera shake moved from US4 to US3 (impact received), debug counter split from US7 into US8. 8 stories instead of the ~7 proposed in clarify Q3; no feature dropped.

## Artifacts

spec.md, plan.md, recon.md, tasks.md, checklists/requirements.md
