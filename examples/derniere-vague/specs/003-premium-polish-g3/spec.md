# Feature Specification: Power-ups and premium polish (slice 1)

**Feature Branch**: `003-premium-polish-g3`
**Created**: 2026-10-06
**Input**: "Feature 3 de Derniere Vague : bonus lâches par les zombies puis finition premium — reticule et marqueurs d impact, vrais modeles d armes et de mains, indicateur de direction des degats, appuis brefs memorises, souris de bureau isolee du tactile, ambiance (nuit aux fenetres, poussiere, sang), zombies plus organiques et reactions aux impacts, retours (points flottants, secousses, stats de fin), sons enrichis, qualite adaptative et hook de QA."

This run covers US1-US7 (clarify Q1). No game rule changes except the power-ups carried over from feature 2.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Power-ups dropped by zombies (Priority: P1)

When a zombie dies it may drop a power-up where it fell. Walking over it applies its effect: max ammo, insta-kill for 30 s, double points for 30 s, or a nuke that kills every zombie and grants a flat bonus. Drops are reproducible from the session seed and capped per round; an untouched drop disappears after about 25 s.

**Why this priority**: carried over from feature 2 as priority 1 in the intent.

**Independent Test**: in a seeded session, kill zombies until a drop appears, walk onto it and check the effect (ammo full, one-hit kills, doubled points, or zombies all dying and +400) with no presentation code involved.

**Acceptance Scenarios**:

1. **Given** a seeded session and a zombie killed, **When** the seeded draw is under the drop chance (1/30) and fewer than 4 drops happened this round, **Then** one power-up of a seeded kind lies at the zombie position and a drop event is emitted.
2. **Given** 4 drops already this round, **When** another zombie dies, **Then** nothing drops until the next round starts.
3. **Given** a drop lying for 25 s untouched, **When** time passes, **Then** it is removed and an expiry event is emitted.
4. **Given** the player walks within 1 m of a max-ammo drop, **When** the step runs, **Then** both weapons have full magazine and reserve and the drop is gone.
5. **Given** insta-kill is active, **When** any bullet or knife hits a zombie, **Then** that zombie dies with the normal kill points; after 30 s hits deal normal damage again.
6. **Given** double points is active, **When** the player hits and kills zombies, **Then** hit and kill points are doubled; repair points are not.
7. **Given** 5 living zombies, **When** the player takes a nuke, **Then** all 5 enter their death, no kill points and no new drop are produced, and the ledger gains exactly 400.

### User Story 2 - Power-up visuals, HUD and announce (Priority: P1)

A dropped power-up floats and spins at its spot, blinks during its last seconds, and vanishes when taken or expired. Taking one shows a French announce on screen and plays an announce sound; timed power-ups show an icon with a seconds countdown in the HUD.

**Why this priority**: power-ups are unusable without being seen and understood.

**Independent Test**: feed a session with an active drop and an active timed power-up to the view and HUD: one floating object at the drop position, blinking in its last 5 s, and an icon showing the remaining seconds.

**Acceptance Scenarios**:

1. **Given** a drop at (x, z), **When** a frame renders, **Then** one power-up object is visible at (x, z) and floats/spins.
2. **Given** a drop with less than 5 s left, **When** frames render, **Then** the object alternates visible/hidden.
3. **Given** double points with 12.4 s left, **When** the HUD updates, **Then** the double-points icon shows "12" and disappears at expiry.
4. **Given** a power-up taken, **When** the HUD updates, **Then** its French name is announced for a few seconds and the announce sound plays once.

### User Story 3 - Dynamic crosshair and hit markers (Priority: P2)

A crosshair sits at screen centre: it opens when firing and moving, tightens when aiming. Each hit shows a white cross marker, a kill shows it red, both with a short sound.

**Why this priority**: QA finding 1 (no crosshair).

**Independent Test**: drive the crosshair with a session and input: gap widens after a shot or with movement, narrows while aiming; a hit event shows the white marker, a kill event the red one.

**Acceptance Scenarios**:

1. **Given** no movement and no shot, **When** the player aims, **Then** the crosshair gap is smaller than at rest.
2. **Given** a shot fired or the move stick pushed, **When** frames render, **Then** the gap grows, then returns to rest.
3. **Given** a bullet hits a zombie, **When** the frame renders, **Then** a white marker shows briefly and a short hit sound plays.
4. **Given** the hit kills the zombie, **When** the frame renders, **Then** the marker is red and the kill sound plays.

### User Story 4 - First-person weapon and hand models (Priority: P2)

Each weapon is held by a gloved hand and shows slide, barrel and details. Reloading visibly pulls the magazine out and pushes it back; firing shows a muzzle flash at that weapon's muzzle and ejects a casing.

**Why this priority**: QA finding 2 (white block hand, box weapons).

**Independent Test**: build the view model, switch weapons and step a reload and a shot: gloved hand parts exist, the magazine moves out then back in over the reload time, a casing is spawned per shot.

**Acceptance Scenarios**:

1. **Given** any weapon in hand, **When** the view model renders, **Then** a gloved hand (palm, fingers, forearm) and the weapon detail parts are visible.
2. **Given** a reload starts, **When** the reload time elapses, **Then** the magazine moves down and out during the first half and back in during the second half.
3. **Given** a shot is fired, **When** the frame renders, **Then** the flash shows at that weapon's muzzle and a casing is ejected and falls, reusing a fixed pool.

### User Story 5 - Reliable presses and desktop mouse isolation (Priority: P2)

A fire, knife or interact press shorter than one simulation step still acts on the next step. On desktop, the mouse no longer drives the touch stick, the look drag or the on-screen buttons.

**Why this priority**: QA findings 4 and 5 (lost short presses, mouse triggers touch controls).

**Independent Test**: press and release fire between two steps: one shot is fired on the next step. Dispatch mouse pointer events on the touch zones: the move and look values stay 0.

**Acceptance Scenarios**:

1. **Given** fire pressed and released between two steps, **When** the next step runs, **Then** exactly one shot is fired.
2. **Given** interact tapped between two steps near a wall buy, **When** the next step runs, **Then** the purchase happens once.
3. **Given** a pointer event with pointerType "mouse" on the left or right half, **When** it moves, **Then** move and look stay 0 and no stick appears.
4. **Given** a mouse pointerdown on an on-screen button, **When** handled, **Then** the input flag does not change; a touch pointerdown still sets it.

### User Story 6 - Damage direction and HUD readability (Priority: P2)

When a zombie hits the player, a red arc on the screen edge points toward the attacker, on top of the existing vignette. The HUD no longer repeats the weapon in hand under the ammo: only the other weapon's slot line shows. Wall price labels are larger.

**Why this priority**: QA findings 3 and 6.

**Independent Test**: emit a hit from a zombie behind-left of the player: an arc shows on the bottom-left edge and fades. With two weapons, only the weapon not in hand has a slot line.

**Acceptance Scenarios**:

1. **Given** a zombie at the player's left hits, **When** the frame renders, **Then** a red arc shows on the left edge and fades out in about 1 s.
2. **Given** one weapon only, **When** the HUD updates, **Then** no slot line shows.
3. **Given** two weapons, **When** the HUD updates, **Then** exactly one slot line shows: the weapon not in hand.
4. **Given** a wall buy, **When** rendered, **Then** its price label is larger than before.

### User Story 7 - Night ambiance (Priority: P3)

Windows open on a misty night: gradient sky, tree silhouettes, moon glow. Dust floats in the air, lamps flicker with brief cut-outs, fog thickens with distance, and blood stains appear on the floor and nearby walls where zombies are hit, from a limited pool.

**Why this priority**: next item of the intent once power-ups and QA findings are covered.

**Independent Test**: build the station and the ambiance views: window panes carry the night texture, dust particles exist in a fixed count, a zombie hit adds one decal and the pool never grows beyond its cap.

**Acceptance Scenarios**:

1. **Given** the station is built, **When** rendered, **Then** every window pane shows the night sky texture and no new dynamic light is added.
2. **Given** time passes, **When** lamps update, **Then** a brief full cut-out happens at seeded intervals.
3. **Given** dust is mounted, **When** frames render, **Then** the particle count stays fixed and particles drift around the camera.
4. **Given** a zombie is hit, **When** the frame renders, **Then** a blood decal appears under it, and on the nearest wall when one is within 1.2 m; the oldest decal is reused beyond 24.

### Edge Cases

- Nuke while zombies are breaching or spawning -> they die too; queued spawns are not affected.
- Insta-kill and double points both active -> both apply; taking the same one again restarts its 30 s.
- Game over with a timed power-up active -> no effect after death; new session starts clean.
- Drop on a spot the player cannot reach (behind a barricade) -> it expires normally.
- Several playerHit events in one step -> one arc per hit, from a fixed pool.
- Long press -> latch changes nothing (held flag already true).
- Device with both touch and mouse -> touch pointers work, mouse pointers ignored by touch controls only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST draw power-up drops from the session seed on zombie kills, 1/30 chance, max 4 per round.
- **FR-002**: The system MUST apply max ammo, insta-kill (30 s), double points (30 s, hits and kills) and nuke (kill all, +400 flat).
- **FR-003**: A drop MUST disappear after 25 s and blink during its last 5 s.
- **FR-004**: The HUD MUST show timed power-ups with a seconds countdown and announce each taken power-up in French.
- **FR-005**: The crosshair MUST widen on shots and movement and tighten when aiming; hits and kills MUST show white and red markers with a sound.
- **FR-006**: Each weapon MUST show a gloved hand, details, a readable magazine reload, a muzzle flash and casing ejection.
- **FR-007**: Fire, knife and interact presses shorter than a step MUST act on the next step.
- **FR-008**: Touch controls MUST ignore mouse pointers.
- **FR-009**: Each player hit MUST show an arc pointing toward the attacker.
- **FR-010**: The HUD MUST show a slot line only for the weapon not in hand; price labels MUST be larger.
- **FR-011**: Windows MUST show a night sky; dust, lamp cut-outs, denser far fog and pooled blood decals MUST be present.

### Key Entities

- **Power-up drop**: kind (max ammo, insta-kill, double points, nuke), position, remaining time.
- **Active power-up**: kind and remaining time (timed kinds only).
- **Latched press**: fire, knife or interact pressed since the last step.

## Success Criteria *(mandatory)*

- **SC-001**: Same seed and inputs give the same drops, kinds and positions every run.
- **SC-002**: A press as short as one frame is never lost.
- **SC-003**: On desktop, mouse use never moves the touch stick or look.
- **SC-004**: No new dynamic light; particle and decal counts stay fixed.

## Clarifications

### Session 2026-10-06

- Q: The need splits into ~11 US, above the ~7 US cap; which slice for this run? → A: US1-US7 (power-up logic, power-up presentation, crosshair and hit markers, weapon and hand models, input robustness, damage direction and HUD readability, night ambiance); the rest is deferred (see Assumptions).
- Q: Insta-kill, double points and nuke rules? → A: insta-kill = any bullet or knife hit kills with normal kill points; double points doubles hit and kill points only; nuke kills every living zombie with no per-kill points and no drop, flat +400.
- Q: Should on-screen buttons also ignore mouse pointers? → A: yes, stick, look drag and on-screen buttons all ignore pointerType "mouse".
- Q: Hypotheses (filet) → A: validated: seeded draw per kill at the zombie position, equiprobable kinds, round counter reset on round start, pickup radius 1 m, 25 s life with 5 s blink, retake restarts timer, max ammo fills both slots, slot line = weapon not in hand, arc ~1 s, latch on fire/knife/interact, 24 decals, moonlight painted (no light).

## Assumptions

- Deferred to a next run: organic zombie models, limp/run gaits, hit reactions, physical death fall, blood particles; floating points, camera shake, audio slowdown at death, end screen with statistics; per-weapon shots, empty click, ambient wind/creaks/rising drone, round start/end jingles, richer box music; adaptive quality, hidden debug counter (?debug=1), `window.__qa()`.
- Dynamic light budget is full (3 lamps + flashlight): moonlight is painted, not lit.
- Power-up timers only advance while the simulation steps (paused in menus).
