# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (c1ac31d). La prep garde ce qui sert la spec et ajoute ses faits.

## Modules existants

- src/audio/ : audioDirector.ts, soundVoices.ts — source: git ls-tree origin/dev
- src/config/ : audioConfig.ts, mapConfig.ts, pointsConfig.ts, visualConfig.ts, weaponConfig.ts — source: git ls-tree origin/dev
- src/engine/ : input/keyboardMouse.ts, input/touchButtons.ts — source: git ls-tree origin/dev
- src/logic/ : economy/pointsLedger.ts, game/gameSession.ts, map/stationLayout.ts, weapons/weaponState.ts, zombies/zombieHorde.ts — source: git ls-tree origin/dev
- src/render/ : map/buildStation.ts, textures/surfaceTexture.ts, weapon/viewModel.ts — source: git ls-tree origin/dev
- src/ui/ : hud.ts, styles.css, texts.ts — source: git ls-tree origin/dev
- No interaction, loadout, door, barricade or box module exists yet: each is new under src/logic — source: git ls-tree origin/dev

## Helpers et hooks de la feature

- `createWeapon(id)` / `updateWeapon(weapon, input, stepS, events)` — reuse one WeaponState per loadout slot — source: src/logic/weapons/weaponState.ts:16
- `resolveShot(player, yaw, pitch, targets, rangeM, assistRad, out)` — call once per pellet with yaw/pitch offsets — source: src/logic/game/gameSession.ts:63
- `damageZombie(horde, id, amount, head, knife, events)` — the only way to hurt a zombie — source: src/logic/zombies/zombieHorde.ts:188
- `createRandom(seed)` -> `{ next, range, int, pick }`; box draws use `session.random` — source: src/logic/random.ts:8
- `input.interact` / `input.swap` are held flags (KeyE, Digit1/2, wheel pulse): detect the rising edge in logic — source: src/engine/input/keyboardMouse.ts:16
- `touchButtons.setInteractVisible(visible)` exists, unused; main.ts must keep the return of `createTouchButtons` — source: src/engine/input/touchButtons.ts:116
- `surfaceTexture(key, spec, repeatX, repeatY)` cached canvas texture; wood spec `VISUAL_CONFIG.WOOD_TEXTURE` for planks/debris — source: src/render/textures/surfaceTexture.ts:76
- `roundStarted` event is emitted on each new round: reset per-round repair cap on it — source: src/logic/rounds/roundDirector.ts:50
- `session.events` is cleared at the end of render; presentation reads events in the same frame — source: src/main.ts:67

## Pieges verifies

- PARTAGE : `src/config/visualConfig.ts`, `src/config/mapConfig.ts`, `src/config/weaponConfig.ts`, `src/config/audioConfig.ts`, `src/logic/game/gameEvents.ts`, `src/ui/texts.ts` — ajout seulement
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:16
- `noUncheckedIndexedAccess` on: lookups are `T | undefined`, no `!` — source: tsconfig.json:12
- `WEAPONS` and `SOUNDS` are exhaustive Records: a new WeaponId / SoundName needs its entry in the same task — source: src/config/weaponConfig.ts:13
- Entrances are collision segments: removing one from `layout.segments` unblocks movement AND hitscan — source: src/logic/combat/hitscan.ts:20
- All 8 current windows sit on start-room walls; zone rooms and their windows do not exist yet — source: src/config/mapConfig.ts:39
- Window frames are built from `layout.spawnPoints`: once it becomes the active list, render must read the full window list — source: src/render/map/buildStation.ts:114
- Entrance blockers are one merged mesh: per-door animation needs separate meshes — source: src/render/map/buildStation.ts:72
- Dynamic light budget already full (3 lamps + flashlight): box signal must be an emissive mesh — source: src/config/mapConfig.ts:50
- `poseZombie` has no branch for a new state: unposed, no crash — source: src/render/models/zombieModel.ts:225
- `src/main.ts` is excluded from coverage but tested by `src/__tests__/main.test.ts` with mocked renderer/loop — source: vitest.config.ts:10

## Recettes de test

- Run one file: `node node_modules/vitest/vitest.mjs run --coverage=false <file>` — source: CLAUDE.md:7
- Logic tests: `createGameSession(SEED)` or `createRandom(SEED)`, loop the step with `1 / 60`, assert points/state — source: src/__tests__/ui/hud.test.ts:3
- HUD test loads the module by a const path and a host div, reads `styles.css` from disk for CSS assertions — source: src/__tests__/ui/hud.test.ts:12
- main.ts test: `vi.hoisted` mocks + `vi.mock("@/render/createRenderer")` and `@/engine/gameLoop` — source: src/__tests__/main.test.ts:20
- Audio director test mocks every `play*` of soundVoices with `vi.fn()` — source: src/__tests__/audio/audioDirector.test.ts:20

## Interdits grep-ables

- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
- `\.(png|jpe?g|webp|glb|gltf|mp3|wav|ogg)["'`]`
