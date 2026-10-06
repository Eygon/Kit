# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (2442ded). La prep garde ce qui sert la spec et ajoute ses faits.

## Modules existants

- src/audio/ : audioDirector.ts, audioEngine.ts, soundVoices.ts — source: git ls-tree origin/dev
- src/config/ : audioConfig.ts, gameConfig.ts, visualConfig.ts, weaponConfig.ts, zombieConfig.ts — source: git ls-tree origin/dev
- src/engine/ : gameLoop.ts — source: git ls-tree origin/dev
- src/logic/ : game/gameEvents.ts, game/gameSession.ts, economy/pointsLedger.ts, weapons/weaponState.ts, rounds/roundDirector.ts, zombies/zombieHorde.ts, random.ts — source: git ls-tree origin/dev
- src/render/ : createRenderer.ts, effects/bloodDecals.ts, models/handModel.ts, models/zombieModel.ts — source: git ls-tree origin/dev
- src/render/ : weapon/viewModel.ts, zombies/zombieView.ts — source: git ls-tree origin/dev
- src/ui/ : hud.ts, menus.ts, styles.css, texts.ts — source: git ls-tree origin/dev

## Helpers et hooks de la feature

- Seeded randomness for presentation: `createRandom(seed)` — source: src/logic/random.ts:8 ; the audio director already uses `AUDIO_CONFIG.PRESENTATION_SEED` — source: src/audio/audioDirector.ts:38
- Sound building: `playSpec(audio, spec, position)` with tones/noises specs from `AUDIO_CONFIG.SOUNDS` — source: src/audio/soundVoices.ts:123
- Points shown by the HUD: `shownPoints` vs `session.ledger.points` — source: src/ui/hud.ts:196
- Zombie rig joints are kept in a module `joints` map read by `poseZombie` — source: src/render/models/zombieModel.ts:236
- Death fall already exists: `poseDeath` over `VIS.DEATH_FALL_S` — source: src/render/models/zombieModel.ts:199
- Round end: phase set to `intermission` without event — source: src/logic/rounds/roundDirector.ts:42
- Empty fire returns silently in `tryFire` — source: src/logic/weapons/weaponState.ts:51

## Pieges verifies

- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:16
- PARTAGE : `src/config/visualConfig.ts`, `src/config/audioConfig.ts`, `src/ui/texts.ts`, `src/ui/styles.css`, `src/logic/game/gameEvents.ts` — ajout seulement
- main.test mocks `createRenderer` with `{ render, domElement }` only: no `info`, no `setPixelRatio` — extend the mock when main reads them — source: src/__tests__/main.test.ts:43
- main.test mocks `startGameLoop` and drives `render(alpha, frameS)` by hand — source: src/__tests__/main.test.ts:122
- `zombieHit` has no hit point: use zombie x/z and head or torso height — source: src/logic/game/gameEvents.ts:10
- Dying zombies stay `alive` until `ZOMBIE_DEATH_S` — source: src/logic/zombies/zombieHorde.ts:195
- `session.events` is cleared at the end of each render — read events before that line — source: src/main.ts:100
- `playShot(audio)` is asserted with one argument in audioDirector tests — update the expectation with the weapon id — source: src/__tests__/audio/audioDirector.test.ts:63
- Wall-buy silhouettes are a different module, not the view model — source: src/render/models/weaponSilhouette.ts:16

## Recettes de test

- Audio voices: tests build a fake AudioContext (FakeParam/FakeNode/FakeSource) — source: src/__tests__/audio/soundVoices.test.ts:21
- Audio director: `vi.mock("@/audio/soundVoices", () => voices)` and assert calls per event — source: src/__tests__/audio/audioDirector.test.ts:41
- main: `vi.resetModules()` then `await import("@/main")` with views mocked via `importOriginal` — source: src/__tests__/main.test.ts:139
- Render models are tested with real three.js objects (no WebGL) — source: src/__tests__/render/models/zombieModel.test.ts:16

## Interdits grep-ables

- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
- `Math\.random\(`
