# Implementation Plan: Wave survival core (feature 1 of Derniere Vague)

**Branch**: `001-wave-survival-core-g1` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Turn the empty socle (fixed-step loop, renderer, seeded random) into a playable wave-survival FPS on mobile: a Station Brume map to walk, a pistol and knife, zombies from windows, rounds/points/health in pure logic, a DOM HUD with menus, and synthesized sounds. Logic lives in `src/logic` (pure, tested with a seed); render, audio, ui and input devices mirror it; `src/main.ts` stays the composition root.

## Technical Context

**Stack**: TypeScript strict (`noUncheckedIndexedAccess`), three.js 0.186, Vite 8 + vite-plugin-singlefile, Vitest 5 (jsdom, globals), ESLint 10 — from package.json and CLAUDE.md.
**Gates**: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`, `npm run build` (single `dist/index.html`).
**Constraints**: mobile landscape, 60 fps target / 30 fps floor, <= ~150 draw calls, <= 4 dynamic lights, no external asset, original IP (no licensed names or sounds).

## Standards

Always injected (exempt from cap): no-comments, naming-language, game/logic-render-split, game/tuning-config.

- @agent-os/standards/game/touch-input — stick, look drag, buttons, desktop fallback
- @agent-os/standards/game/frame-independence — movement, timers, AI in stepS
- @agent-os/standards/game/mobile-performance — merged map, shared zombie meshes, lights
- @agent-os/standards/game/procedural-assets — primitive models, canvas textures, synth sounds
- @agent-os/standards/testing/logic-tests — every src/logic module mirrored, seeded
- @agent-os/standards/game/no-alloc-hot-path — pooled zombies, scratch vectors per frame
- @agent-os/standards/typing/strict-types — discriminated zombie/round/weapon states
- @agent-os/standards/game/seeded-random — window choice, spawns reproducible
- @agent-os/standards/game/dom-hud — HUD, menus, texts.ts, safe-area
- @agent-os/standards/game/procedural-audio — one AudioContext, voice cap, panners

## Verified facts

- `src/engine/gameLoop.ts:5-8` — `LoopCallbacks` — `update(stepS)` and `render(alpha, frameS)` are the only two hooks (source : recon inline)
- `src/engine/gameLoop.ts:14-25` — `createFixedStepper` — fixed step from `GAME_CONFIG.FIXED_STEP_S`, catch-up capped at `MAX_STEPS_PER_FRAME` (source : recon inline)
- `src/engine/gameLoop.ts:27-40` — `startGameLoop` — only place calling `requestAnimationFrame`, returns a stop function (source : recon inline)
- `src/render/createRenderer.ts:11-30` — `createRenderer` — returns `{ renderer, scene, camera, resize }`, pixel ratio already capped, camera at eye height, resize on window resize (source : recon inline)
- `src/config/gameConfig.ts:1-9` — `GAME_CONFIG` — `as const` object with unit-suffixed keys incl. `PLAYER_EYE_HEIGHT_M`; engine/camera tuning, read-only for this feature (new tuning goes to per-domain config files) (source : recon inline)
- `src/logic/random.ts:8-24` — `createRandom` — seeded `next/range/int/pick`; `pick` throws on empty list (source : recon inline)
- `src/main.ts:1-13` — composition root — builds renderer, placeholder floor and light, starts the loop with a no-op update (source : recon inline)
- `src/__tests__/logic/random.test.ts:1-19` — test style — vitest globals, `@/` imports, no explicit `import { describe }` (source : recon inline)
- `src/ui/styles.css:1-3` — global styles — `touch-action: none`, no scroll, `#app` fixed full screen (source : recon inline)
- `index.html:11-12` — `#app` host and module entry `/src/main.ts` (source : recon inline)
- `vitest.config.ts:7-10` — jsdom environment, tests only under `src/__tests__/**/*.test.ts`, `src/main.ts` excluded from coverage (source : recon inline)
- Branch freshness: working tree on `dev` = `origin/dev` = `e806a06`, clean; no `src/ui/texts.ts`, no `src/audio`, no `src/render/models` yet; no locales folder (French texts go to `src/ui/texts.ts` per naming-language).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/logic/map/stationLayout.ts` (+ `src/config/mapConfig.ts`) | create | US1 |
| `src/logic/player/playerMotion.ts` (+ `src/logic/input/inputState.ts`, `src/config/playerConfig.ts`) | create | US2 |
| `src/engine/input/touchControls.ts` | create | US2 |
| `src/render/map/buildStation.ts` (+ `src/config/visualConfig.ts`) | create | US1 |
| `src/main.ts` | mount | US1, US2, US3, US4, US5, US6, US7 |
| `src/logic/weapons/weaponState.ts` (+ `src/config/weaponConfig.ts`, `src/logic/game/gameEvents.ts`) | create | US3 |
| `src/logic/combat/hitscan.ts` | create | US3 |
| `src/render/weapon/viewModel.ts` | create | US3 |
| `src/engine/input/touchButtons.ts` | create | US3 |
| `src/engine/input/keyboardMouse.ts` | create | US3 |
| `src/logic/zombies/zombieHorde.ts` (+ `src/config/zombieConfig.ts`) | create | US4 |
| `src/render/models/zombieModel.ts` | create | US4 |
| `src/render/zombies/zombieView.ts` | create | US4 |
| `src/logic/rounds/roundDirector.ts` (+ `src/config/roundConfig.ts`) | create | US5 |
| `src/logic/economy/pointsLedger.ts` (+ `src/config/pointsConfig.ts`) | create | US5 |
| `src/logic/player/playerHealth.ts` (+ `src/config/playerConfig.ts`) | create / extend config | US5 |
| `src/logic/game/gameSession.ts` | create | US5 |
| `src/ui/texts.ts` | create | US6 |
| `src/ui/hud.ts` | create | US6 |
| `src/ui/menus.ts` | create | US6 |
| `src/ui/styles.css` | extend | US6 |
| `src/audio/audioEngine.ts` (+ `src/config/audioConfig.ts`) | create | US7 |
| `src/audio/soundVoices.ts` | create | US7 |
| `src/audio/audioDirector.ts` | create | US7 |

## Decisions

- Logic-side 2D map of wall segments (`stationLayout.ts`) for movement and zombie steering — three.js raycasts rejected (logic-render-split).
- Hitscan resolved in logic against zombie capsules (2D circle + height band for head) — mesh raycast rejected (logic must not import three).
- Light aim assist = widened acceptance cone on touch only, configured in `weaponConfig.ts` — magnetism on the camera rejected (fights the player's drag).
- Zombies preallocated with an `alive` flag, rendered by one pooled set of shared-geometry meshes — per-zombie materials rejected (mobile-performance).
- Until US5, `src/main.ts` pipes logic calls (hits -> `zombieHorde` damage); US5 moves that orchestration into `src/logic/game/gameSession.ts` and `main.ts` calls only `stepGameSession`.
- Presentation reacts to a typed `GameEvent` queue (`gameEvents.ts`) drained each frame (viewmodel recoil, HUD, audio).
- Starting points 500 (assumption accepted at clarify).

### Follow-up features (not in this trio)

- **Feature 2 — Economy**: wall weapons (SMG 1000, carbine 1200, shotgun 1500; ammo at half price), 2 weapons carried + swap, paid doors/debris to 3 zones (750, 1000, 1250), barricades at the 6-8 windows repairable (+10 per plank), mystery box (950, ~4 s roll, energy ray + machine gun in pool, teddy -> refund and move, 10 s pickup), seeded power-ups (max ammo, insta-kill 30 s, double points 30 s, nuke +400).
- **Feature 3 — Premium polish**: particles (blood, sparks, debris), richer weapon/zombie animations, flickering light choreography and fog tuning, full sound set (per-weapon shots, purchase/refuse, ambience drones), HUD feedback (hit markers, point pops), adaptive quality.

## Artifacts

spec.md, plan.md, recon.md, tasks.md, checklists/requirements.md, .standards-derniere-vague.md (standards pack, A.3).
