# Feature Specification: Premium rendering, feedback and sound

**Feature Branch**: `004-premium-rendering-g4`
**Created**: 2026-10-06
**Input**: "Feature 4 de Derniere Vague : rendu premium — vrais modeles d armes a la premiere personne, zombies organiques et reactions aux impacts, particules de sang, retours (points flottants, secousses, stats de fin), sons enrichis par arme et ambiance, qualite adaptative et hook de QA navigateur."

## User Scenarios & Testing *(mandatory)*

No game rule changes in this feature: rendering, feedback, sound and performance only.

### User Story 1 - Real first-person weapon models (Priority: P1)

The player sees a believable weapon in hand: rounded shapes (turned barrels, cylinders, extruded bodies, chamfers), distinct materials per weapon (dark metal, polymer, wood for the shotgun) and a readable gloved hand on the grip. The weapon sits lower and further right than today so it never hides the screen centre. The energy weapon pulses with an emissive glow.

**Why this priority**: the weapon is on screen 100% of the time; the current box assembly is the most visible QA finding.

**Independent Test**: start a game, cycle through every weapon id: each one shows its own rounded model with its own materials, the hand holds the grip, and the screen centre stays clear at 844x390.

**Acceptance Scenarios**:

1. **Given** any weapon is equipped, **When** the view model is built, **Then** its meshes use rounded geometries (lathe, cylinder or extrude) and no part is a plain unchamfered box larger than the hand.
2. **Given** the shotgun is equipped, **When** it is shown, **Then** its stock and pump use a wood material distinct from the metal of the barrel.
3. **Given** the energy weapon is equipped, **When** time passes, **Then** its emissive intensity oscillates between the configured minimum and maximum.
4. **Given** a 844x390 viewport, **When** any weapon is idle, **Then** the weapon's projected bounds stay out of the central aiming area.

### User Story 2 - Organic zombies with variants and gait (Priority: P1)

Zombies have organic silhouettes: capsule/lathe torso and limbs, a rounded head with a jaw, layered torn clothes. Three colour/clothing variants appear in the horde. They walk with a limp, and from the run speed onward they visibly run.

**Why this priority**: zombies are the second most visible element after the weapon.

**Independent Test**: spawn a horde and look at it: three variants are present, walkers limp, runners run, and no part is a cube.

**Acceptance Scenarios**:

1. **Given** the zombie pool is built, **When** it is inspected, **Then** torso, limbs and head use capsule or lathe geometries and there are exactly 3 variants distributed across the pool.
2. **Given** a chasing zombie at walk speed, **When** it moves, **Then** its left and right legs swing with asymmetric amplitude (limp).
3. **Given** a chasing zombie at run speed or faster, **When** it moves, **Then** the run pose (forward lean, larger stride, arms forward) is applied instead of the walk.

### User Story 3 - Impact reactions, blood particles and camera shake (Priority: P2)

When a zombie is hit it recoils; a headshot snaps its head back. A dying zombie falls to the ground before disappearing. Blood particles burst at the impact point, drawn from a fixed pool. The camera shakes when the player is hit and when a nuke detonates.

**Why this priority**: hit feedback makes shooting readable; it depends on the zombie models only for pose bones present in both old and new models.

**Independent Test**: shoot a zombie in the body, then in the head, then kill it, then take a hit: recoil, head snap, fall, particles and camera shake are visible each time.

**Acceptance Scenarios**:

1. **Given** a zombie is hit in the body, **When** the hit event is rendered, **Then** the zombie recoils for the configured duration then returns to its pose.
2. **Given** a zombie is hit in the head, **When** the hit event is rendered, **Then** its head rotates backward beyond the body recoil.
3. **Given** a zombie is in the dying state, **When** frames pass, **Then** it rotates to the ground over the dying duration and stays visible until the state ends.
4. **Given** any zombie hit, **When** it is rendered, **Then** blood particles are emitted at the zombie's hit height from a pool whose size never grows.
5. **Given** a playerHit or nukeDetonated event, **When** the frame is rendered, **Then** the camera is offset by a decaying shake, stronger for the nuke, and returns exactly to the player view.

### User Story 4 - Floating points (Priority: P2)

Every points gain appears as a floating number (+10, +60, +100...) near the HUD points counter.

**Why this priority**: immediate reward feedback.

**Independent Test**: hit and kill zombies: floating numbers match the gained points.

**Acceptance Scenarios**:

1. **Given** the points counter increases by N in a frame, **When** the HUD updates, **Then** a floating "+N" appears near the counter and fades out after the configured duration.
2. **Given** points decrease (purchase), **When** the HUD updates, **Then** no floating number appears.
### User Story 5 - End-of-run statistics (Priority: P2)

The game over screen shows the round reached, kills, headshots and points earned during the run.

**Why this priority**: closes the run with a reason to replay.

**Independent Test**: play a run, die: the game over screen shows the four statistics matching what happened.

**Acceptance Scenarios**:

1. **Given** a run with K kills of which H headshots, **When** the game ends, **Then** the end screen shows K kills and H headshots.
2. **Given** points earned E during the run (spending excluded), **When** the game ends, **Then** the end screen shows E.
3. **Given** a new game is started, **When** the session is created, **Then** all statistics are back to zero.

### User Story 6 - Per-weapon sounds, empty click, ambience and round-end jingle (Priority: P3)

Each weapon has its own synthesized shot. Firing with an empty weapon gives a dry click. A low ambience plays during the game (wind, creaks, a low drone whose level rises with the round). A jingle plays when a round ends.

**Why this priority**: enriches the experience; independent of the visuals.

**Independent Test**: fire each weapon, empty one completely and fire again, survive a round: distinct shots, a click, a rising drone and an end-of-round jingle are heard.

**Acceptance Scenarios**:

1. **Given** two different weapons, **When** each fires, **Then** two different sound specs are played.
2. **Given** a weapon with empty magazine and empty reserve, **When** the player fires, **Then** a dryFired event is emitted and the dry click is played, and no shot is fired.
3. **Given** the game is playing, **When** the round number increases, **Then** the drone gain increases up to a configured cap; wind and creaks play at random configured intervals.
4. **Given** the round phase switches to intermission, **When** the audio director updates, **Then** the round-end jingle is played once.

### User Story 7 - Adaptive quality and QA hook (Priority: P3)

When the frame time exceeds the budget, the game lowers its pixel ratio, then its particle density. `window.__qa()` returns { fps, drawCalls, triangles, phase, round, alive } for browser tests.

**Why this priority**: keeps mobile playable and makes the build testable by browser QA.

**Independent Test**: call window.__qa() in the console; throttle the CPU: the pixel ratio drops.

**Acceptance Scenarios**:

1. **Given** the average frame time exceeds the budget for the configured window, **When** quality updates, **Then** the pixel ratio steps down to the configured floor, then particle density steps down.
2. **Given** the frame time is back under budget for the recovery window, **When** quality updates, **Then** quality steps back up one level.
3. **Given** the game runs, **When** window.__qa() is called, **Then** it returns fps, drawCalls, triangles, phase, round and alive count read from the current frame.

### User Story 8 - Hidden debug counter (Priority: P3)

With ?debug=1 in the URL, a small counter shows fps and draw calls over the game.

**Why this priority**: developer aid for performance checks on device.

**Independent Test**: open the game with and without ?debug=1: the counter appears only with it.

**Acceptance Scenarios**:

1. **Given** the URL has ?debug=1, **When** the game runs, **Then** a counter shows fps and draw calls, updated only when the shown values change.
2. **Given** the URL has no debug parameter, **When** the game runs, **Then** no counter exists in the DOM.

### Edge Cases

- Several points gains in the same frame -> one floating number with their sum.
- Shake while a previous shake is decaying -> the stronger amplitude wins, no accumulation beyond the configured max.
- Blood pool exhausted -> the oldest particle is reused.
- Zombie killed by a nuke (no hit event) -> death fall still plays, no blood burst.
- Dry fire while a reload can start -> reload starts as today, no click.
- Quality already at the floor -> no further change.
- Audio not unlocked -> ambience starts only after unlock.
- Out of scope: any change to damage, points, rounds, AI or economy rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST build a distinct rounded first-person model per weapon id with distinct materials and a gloved hand on the grip.
- **FR-002**: The system MUST place the first-person weapon outside the central aiming area.
- **FR-003**: The system MUST render zombies with organic shapes in 3 variants, with a limping walk and a run gait at run speed.
- **FR-004**: The system MUST play a recoil on body hits, a head snap on headshots and a fall during the dying state.
- **FR-005**: The system MUST emit pooled blood particles at the hit height on each zombie hit.
- **FR-006**: The system MUST show a floating number for each positive points change near the points counter.
- **FR-007**: The system MUST shake the camera on player hit and on nuke detonation.
- **FR-008**: The system MUST show round reached, kills, headshots and points earned on the game over screen.
- **FR-009**: The system MUST play a distinct shot per weapon, a dry click on empty fire, an ambience whose drone rises with the round, and a round-end jingle.
- **FR-010**: The system MUST lower the pixel ratio then the particle density when the frame time exceeds the budget, and raise them back on recovery.
- **FR-011**: The system MUST show an fps and draw call counter only with ?debug=1.
- **FR-012**: The system MUST expose window.__qa() returning fps, drawCalls, triangles, phase, round and alive.

### Key Entities

- **Run statistics**: kills, headshots and points earned during one run; reset with each new session.
- **Quality level**: current pixel ratio and particle density factor.

## Success Criteria *(mandatory)*

- **SC-001**: At 844x390, the weapon never overlaps the central aiming area on any weapon.
- **SC-002**: The scene stays under the mobile draw call budget with the maximum horde alive.
- **SC-003**: 100% of points gains are shown as floating numbers with the exact value.
- **SC-004**: End-of-run statistics match the events of the run in a scripted test.
- **SC-005**: Under sustained over-budget frames, quality drops within the configured window.

## Clarifications

### Session 2026-10-06

- Q: Where are end-of-run statistics counted? → A: In a pure logic tracker fed by the session step, unit tested; counting only, no rule change.
- Q: How are the empty-weapon click and the round-end jingle triggered? → A: A new dryFired event emitted when firing with empty magazine and reserve; the round-end jingle is triggered by the audio director on the transition to intermission.
- Q: Keep the proposed 7-story decomposition in this run? → A: Yes, all 7 stories; parallel lanes flagged. (Sanity: camera shake moved to US3 and the debug counter split out as US8 to respect the per-story file cap; see plan.md Decisions.)
- Q: Validate the hypotheses (bomb = nuke, impact at hit height, floating points from points delta, fall during dying state, run gait from speed, ?debug=1, __qa always exposed, quality steps pixel ratio then particles)? → A: Validated.

## Assumptions

- "Bomb" means the nuke power-up.
- Hit events carry no impact point: blood bursts at the zombie position at head or torso height.
- Floating points are derived from the points counter delta per frame.
- The death fall uses the existing dying state duration.
- window.__qa is always exposed (not only in debug).
