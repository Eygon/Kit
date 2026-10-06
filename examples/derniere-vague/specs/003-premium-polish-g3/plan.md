# Implementation Plan: Power-ups and premium polish (slice 1)

**Branch**: `003-premium-polish-g3` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Adds seeded power-up drops as a new logic module stepped by `gameSession`, with their view, HUD icons, announce and sounds. Then fixes the browser QA findings: DOM crosshair with hit markers, detailed first-person weapons with gloved hands and casings, latched short presses and mouse-proof touch controls, damage direction arcs and HUD slot/price-label readability. Last, night ambiance: painted night windows, dust, lamp cut-outs, denser fog, pooled blood decals.

## Technical Context

**Stack**: TypeScript strict, three.js 0.186, Vite single-file build, Vitest + jsdom (package.json, CLAUDE.md)
**Gates**: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`
**Constraints**: one self-contained HTML, no asset file; at most 4 dynamic lights (already 3 lamps + flashlight); logic in `src/logic` free of three/DOM/audio; every tuning number in `src/config`.

## Standards

- @agent-os/standards/testing/logic-tests — powerUps, ledger, input latch tests
- @agent-os/standards/game/seeded-random — drop draws, lamp cut-outs seeded
- @agent-os/standards/typing/strict-types — power-up state unions, lookups
- @agent-os/standards/game/frame-independence — power-up timers in stepS
- @agent-os/standards/game/no-alloc-hot-path — pools: drops, casings, arcs, decals, dust
- @agent-os/standards/game/dom-hud — icons, announce, crosshair, arcs
- @agent-os/standards/game/procedural-assets — power-up, hand, night sky models
- @agent-os/standards/game/procedural-audio — announce, nuke, hit marker voices
- @agent-os/standards/game/mobile-performance — no new light, merged geometry
- @agent-os/standards/game/touch-input — mouse isolation, latched presses
- (always injected: no-comments, naming-language, game/logic-render-split, game/tuning-config)

## Verified facts

- `src/logic/game/gameSession.ts:36-55` — `GameSession` — mutable session holding horde, ledger, loadout, events, random; no power-up field yet (source: recon inline)
- `src/logic/game/gameSession.ts:83-90` — `resolvePellet` — damage from `shotDamage` then `damageZombie`; insta-kill hooks here (source: recon inline)
- `src/logic/game/gameSession.ts:98-102` — `resolveAttack` — knife damage `KNIFE.DAMAGE` through `damageZombie` (source: recon inline)
- `src/logic/game/gameSession.ts:142-152` — `applyLedger` — kills then hits applied through `applyEvent`, per step (source: recon inline)
- `src/logic/game/gameSession.ts:154-169` — `stepGameSession` — step order; returns early when phase is over (source: recon inline)
- `src/logic/zombies/zombieHorde.ts:212-222` — `damageZombie` — only way to hurt; pushes `zombieHit` and `zombieKilled { id, headshot }`, zombie position read from `horde.zombies[id]` (source: recon inline)
- `src/logic/zombies/zombieHorde.ts:185` — `updateAttacking` — pushes `playerHit { damage }` without attacker position (source: recon inline)
- `src/logic/game/gameEvents.ts:5-25` — `GameEvent` — union consumed by `audioDirector.playEvent` if-chain, unknown kinds ignored (source: recon inline)
- `src/audio/audioDirector.ts:41-55` — `playEvent` — maps events to voices; `playerHit` -> `playHurt` (source: recon inline)
- `src/logic/economy/pointsLedger.ts:4-23` — `PointsLedger`, `applyEvent` — hit +10, kill 60/100, knife kill 130 (source: recon inline)
- `src/logic/map/barricades.ts:42-45` — `payRepair` — adds repair points directly to `ledger.points`, outside `applyEvent` (source: recon inline)
- `src/logic/weapons/loadout.ts:46` — `refillAmmo(loadout, weaponId)` — refills one weapon; no all-slots refill (source: recon inline)
- `src/logic/weapons/weaponState.ts:67-73` — `updateWeapon` — reads held `input.fire` / `input.knife` once per step (source: recon inline)
- `src/logic/economy/interactions.ts:227-228` — `risingEdge` — interact acts on held flag rising edge (source: recon inline)
- `src/logic/input/inputState.ts:1-21` — `InputState` — plain held flags, no latch (source: recon inline)
- `src/engine/input/keyboardMouse.ts:58-70` — `onMouseDown` / `onMouseUp` — set and clear `input.fire` / `input.aim` (source: recon inline)
- `src/engine/input/touchControls.ts:73-86` — `onPointerDown` — no `pointerType` filter: mouse drives stick and look (source: recon inline)
- `src/engine/input/touchButtons.ts:82-89` — `pointerdown` handler — no `pointerType` filter (source: recon inline)
- `src/ui/hud.ts:150` — `slots.forEach(showSlot)` — one line per loadout slot including the weapon in hand (QA finding 6) (source: recon inline)
- `src/ui/hud.ts:90` — `vignetteNode` — hurt vignette toggled by `is-hurt` (source: recon inline)
- `src/render/textures/priceLabel.ts:5` — `LABEL` — price label sized by `VISUAL_CONFIG.WALL_BUY.LABEL` (source: recon inline)
- `src/render/map/wallBuyView.ts:65` — `labelGeometry` — plane `WALL_BUY.LABEL.WIDTH_M` x `HEIGHT_M` (source: recon inline)
- `src/render/weapon/viewModel.ts:105-117` — `consume` — reacts to shotFired / reloadStarted (dip only) / knifeSwung (source: recon inline)
- `src/config/visualConfig.ts:183` — `VIEW_MODEL` — per-weapon `PARTS`, magazine parts named `magazine`, `MUZZLE_Y_M` / `MUZZLE_Z_M` per weapon at 274-275 (source: recon inline)
- `src/render/weapon/viewModel.ts:60-90` — `createViewModel` — no hand mesh exists: only weapon parts, flash and knife are built (source: recon inline)
- `src/render/map/buildStation.ts:83-118` — `buildWindows` — panes merged with one flat `MeshBasicMaterial` `WINDOW_PANE_COLOR` (source: recon inline)
- `src/render/map/buildStation.ts:167-172` — `lampLevel` — flicker without full cut-out (source: recon inline)
- `src/render/map/buildStation.ts:189-191` — `buildStation` — `FogExp2(FOG_COLOR, FOG_DENSITY)` (source: recon inline)
- `src/render/zombies/zombieView.ts:13-48` — `createZombieView` — pooled zombie groups, pattern for pooled views (source: recon inline)
- `src/main.ts:45-77` — `startGameLoop` callbacks — views mounted at top level, updated in `render`, `session.events` cleared at end of render (source: recon inline)
- `src/config/audioConfig.ts:174` — `PRESENTATION_SEED` — seed for presentation-only randomness (source: recon inline)
- `src/config/zombieConfig.ts:4` — `ZOMBIE_MAX_ALIVE` 24 (source: recon inline)

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/logic/powerUps/powerUps.ts` | create | US1 |
| `src/logic/economy/pointsLedger.ts` | extend | US1 |
| `src/logic/weapons/loadout.ts` | extend | US1 |
| `src/logic/zombies/zombieHorde.ts` | extend | US1, US6 |
| `src/logic/game/gameSession.ts` | extend | US1, US5 |
| `src/render/powerUps/powerUpView.ts` | create | US2 |
| `src/ui/hud.ts` | extend | US2, US6 |
| `src/ui/styles.css` | extend | US2, US3, US6 |
| `src/audio/soundVoices.ts` | extend | US2, US3 |
| `src/audio/audioDirector.ts` | extend | US2, US3 |
| `src/main.ts` | mount | US2, US3, US6, US7 |
| `src/ui/crosshair.ts` | create | US3 |
| `src/render/models/handModel.ts` | create | US4 |
| `src/render/weapon/viewModel.ts` | extend | US4 |
| `src/render/weapon/casingPool.ts` | create | US4 |
| `src/logic/input/inputState.ts` | extend | US5 |
| `src/engine/input/keyboardMouse.ts` | extend | US5 |
| `src/engine/input/touchButtons.ts` | extend | US5 |
| `src/engine/input/touchControls.ts` | extend | US5 |
| `src/ui/damageIndicator.ts` | create | US6 |
| `src/config/visualConfig.ts` | extend (WALL_BUY.LABEL) | US6 |
| `src/render/map/buildStation.ts` | extend | US7 |
| `src/render/effects/dustParticles.ts` | create | US7 |
| `src/render/effects/bloodDecals.ts` | create | US7 |

Companions (type/config/texture parts placed by standards): `src/config/powerUpConfig.ts`, `src/logic/game/gameEvents.ts`, `src/render/models/powerUpModel.ts`, `src/ui/texts.ts`, `src/config/audioConfig.ts`, `src/config/visualConfig.ts`, `src/render/textures/nightSkyTexture.ts`.

## Decisions

- Power-ups are one logic module (`powerUps.ts`) owning drops, active timers and the round cap; `gameSession` applies effects — keeps ledger/loadout/horde unaware of power-ups beyond one multiplier and two helpers.
- Double points is a `multiplier` field on the ledger applied in `applyEvent` only, so repairs (`payRepair`) stay single (clarify Q2).
- Nuke uses a new `killAllZombies` that sets `dying` without `zombieKilled`, so no kill points and no chained drop (clarify Q2).
- Attacker position is added to `playerHit` (`x`, `z`) instead of a new event — the two consumers read `kind` only.
- Latch lives in `InputState` (`pressed` flags set by devices) and is folded into the held flags at step start then cleared by `stepGameSession` — devices stay dumb, logic stays testable (alternative: latch in `main.ts`, untestable entry).
- Moonlight is painted in the window texture; no new light (light budget full).
- Crosshair gap and arcs are CSS custom properties / classes written only on change (dom-hud standard).

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md
