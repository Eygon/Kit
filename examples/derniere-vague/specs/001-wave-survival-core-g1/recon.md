# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (e806a06). La prep garde ce qui sert la spec et ajoute ses faits.

## Modules existants

- src/config/ : gameConfig.ts — source: git ls-tree origin/dev
- src/engine/ : gameLoop.ts — source: git ls-tree origin/dev
- src/logic/ : random.ts — source: git ls-tree origin/dev
- src/render/ : createRenderer.ts — source: git ls-tree origin/dev
- No components folder, no texts module, no audio folder, no locales folder yet: every HUD/menu/sound module is new — source: git ls-tree origin/dev

## Helpers et hooks de la feature

- `startGameLoop({ update, render })` returns a stop fn; put all simulation in `update(stepS)` — source: src/engine/gameLoop.ts:27
- `createFixedStepper(update, stepS, maxSteps)` is the testable core of the loop — source: src/engine/gameLoop.ts:14
- `createRenderer(host)` -> `{ renderer, scene, camera, resize }`; camera already at `PLAYER_EYE_HEIGHT_M` — source: src/render/createRenderer.ts:11
- `createRandom(seed)` -> `{ next, range, int, pick }`; inject it, never Math.random in logic — source: src/logic/random.ts:8
- `GAME_CONFIG` is `as const` (engine/camera); new tuning goes to per-domain config files (playerConfig, weaponConfig...) — source: src/config/gameConfig.ts:1
- French player text has no home yet: create `src/ui/texts.ts` (US5), never inline literals — source: agent-os/standards/index.yml:17

## Pieges verifies

- PARTAGE : `src/config/visualConfig.ts`, `src/logic/game/gameEvents.ts`, `src/ui/texts.ts` — ajout seulement (constantes visuelles de toute US, standard game/tuning-config)
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:16
- `noUncheckedIndexedAccess` on: `array[i]` is `T | undefined`, handle it, no `!` — source: tsconfig.json:13
- Tests are only collected under `src/__tests__/**/*.test.ts`; a test elsewhere is ignored — source: vitest.config.ts:9
- jsdom has no WebGL: tests importing main.ts must `vi.mock("@/render/createRenderer")` — source: vitest.config.ts:8
- `src/main.ts` is excluded from coverage; keep logic out of it — source: vitest.config.ts:10
- src/logic must not import three, DOM, AudioContext or Math.random; requestAnimationFrame only in src/engine — source: agent-os/standards/game/logic-render-split.md:1
- `pick([])` throws: guard empty window/spawn lists — source: src/logic/random.ts:20

## Recettes de test

- Run one file: `node node_modules/vitest/vitest.mjs run --coverage=false <file>` — source: CLAUDE.md:7
- Globals on (describe/it/expect without import), import subject via `@/` — source: src/__tests__/logic/random.test.ts:1
- Fixed-step tests: build a stepper with explicit step and assert counts/alpha — source: src/__tests__/engine/gameLoop.test.ts:6
- Logic tests: `createRandom(<fixed seed>)`, loop `update(state, 1 / 60, ...)`, assert outcomes — source: agent-os/standards/testing/logic-tests.md:4

## Interdits grep-ables

- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
- `\.(png|jpe?g|webp|glb|gltf|mp3|wav|ogg)["'`]`
