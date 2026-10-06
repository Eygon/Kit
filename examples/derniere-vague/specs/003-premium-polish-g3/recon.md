# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (37562a2). La prep garde ce qui sert la spec et ajoute ses faits.

## Modules existants

- src/audio/ : audioDirector.ts, soundVoices.ts — source: git ls-tree origin/dev
- src/config/ : audioConfig.ts, pointsConfig.ts, visualConfig.ts, weaponConfig.ts, zombieConfig.ts — source: git ls-tree origin/dev
- src/engine/ : input/keyboardMouse.ts, input/touchButtons.ts, input/touchControls.ts — source: git ls-tree origin/dev
- src/logic/ : economy/pointsLedger.ts, game/gameEvents.ts, game/gameSession.ts, input/inputState.ts — source: git ls-tree origin/dev
- src/logic/ : weapons/loadout.ts, weapons/weaponState.ts, zombies/zombieHorde.ts, random.ts — source: git ls-tree origin/dev
- src/render/ : map/buildStation.ts, map/wallBuyView.ts, textures/priceLabel.ts, textures/surfaceTexture.ts, weapon/viewModel.ts, zombies/zombieView.ts — source: git ls-tree origin/dev
- src/ui/ : hud.ts, styles.css, texts.ts — source: git ls-tree origin/dev
- No power-up, crosshair, damage indicator, particle, decal or casing module exists: each is new — source: git ls-tree origin/dev

## Helpers et hooks de la feature

- `damageZombie(horde, id, amount, head, knife, events)` — only way to hurt a zombie; insta-kill passes the zombie hp as amount — source: src/logic/zombies/zombieHorde.ts:212
- `zombieKilled { id, headshot }` has no position: read `horde.zombies[id]` x/z in the same step — source: src/logic/game/gameEvents.ts:11
- `createRandom(seed)` -> `{ next, range, int, pick }`; drop draws use `session.random` — source: src/logic/random.ts:8
- `refillAmmo(loadout, weaponId)` refills one weapon; max ammo loops over `loadout.slots` — source: src/logic/weapons/loadout.ts:46
- `roundStarted` event marks each new round: reset the per-round drop counter on it — source: src/logic/game/gameSession.ts:136
- `session.events` is drained by every view in `render` then cleared: views read events the same frame — source: src/main.ts:76
- `audioDirector.playEvent` is an if-chain on `event.kind`; a new kind is silent until mapped — source: src/audio/audioDirector.ts:41
- `playSpec(audio, spec, position)` builds a voice from an `AUDIO_CONFIG.SOUNDS` entry; new voices follow `playPurchase` — source: src/audio/soundVoices.ts:89
- `surfaceTexture(key, spec, repeatX, repeatY)` caches canvas textures by key: night sky follows it — source: src/render/textures/surfaceTexture.ts:76
- `createZombieView` pools 24 groups created once: model for pooled views (drops, decals) — source: src/render/zombies/zombieView.ts:13
- `VIEW_MODEL.PARTS[weaponId]` parts named `magazine` exist per weapon; `MUZZLE_Y_M` / `MUZZLE_Z_M` per weapon — source: src/config/visualConfig.ts:183

## Pieges verifies

- PARTAGE : `src/config/visualConfig.ts`, `src/config/audioConfig.ts`, `src/logic/game/gameEvents.ts`, `src/ui/texts.ts`, `src/ui/styles.css` — ajout seulement
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:16
- `noUncheckedIndexedAccess` on: `horde.zombies[id]` is `Zombie | undefined`, no `!` — source: tsconfig.json:12
- `AUDIO_CONFIG.SOUNDS` is an exhaustive Record on `SoundName`: a new voice needs its entry in the same task — source: src/config/audioConfig.ts:25
- `payRepair` adds repair points directly, outside `applyEvent`: a ledger multiplier applied in `applyEvent` leaves repairs single — source: src/logic/map/barricades.ts:45
- `applyLedger` runs kills before hits so a kill's hit is not paid twice; keep that order when multiplying — source: src/logic/game/gameSession.ts:142
- `stepGameSession` returns early when phase is over: latches must still be cleared by the caller path — source: src/logic/game/gameSession.ts:155
- `interactions` acts on the rising edge of `input.interact`: a latch held one step gives exactly one edge — source: src/logic/economy/interactions.ts:227
- Touch buttons stop pointerdown propagation: touchControls never see button presses — source: src/engine/input/touchButtons.ts:84
- Dynamic light budget is full (3 lamps + flashlight): moonlight and power-up glow must be emissive/painted — source: src/render/map/buildStation.ts:180
- Window panes are one merged mesh with one material: the night texture goes on that material — source: src/render/map/buildStation.ts:117
- `src/main.ts` is excluded from coverage but tested by `src/__tests__/main.test.ts` with hoisted mocks — source: vitest.config.ts:10

## Recettes de test

- Run one file: `node node_modules/vitest/vitest.mjs run --coverage=false <file>` — source: CLAUDE.md:7
- Logic tests: `createGameSession(SEED)` or `createRandom(SEED)`, loop the step with `1 / 60`, assert points/state — source: src/__tests__/logic/game/gameSession.test.ts:1
- HUD test imports the module by a const path into a host div and reads `styles.css` from disk for CSS assertions — source: src/__tests__/ui/hud.test.ts:18
- main.ts test: `vi.hoisted` mocks for every mounted view, renderer and loop — source: src/__tests__/main.test.ts:28
- Audio director test mocks every `play*` of soundVoices with `vi.fn()` — source: src/__tests__/audio/audioDirector.test.ts:20
- Touch tests dispatch `new PointerEvent(type, { pointerId, clientX, clientY })`; add `pointerType` for the mouse case — source: src/__tests__/engine/input/touchControls.test.ts:37

## Interdits grep-ables

- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
