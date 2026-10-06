# Feature Specification: Wave survival core (feature 1 of Derniere Vague)

**Feature Branch**: `001-wave-survival-core-g1`
**Created**: 2026-10-06
**Input**: "Je veux un FPS adapte au mobile, un remake des mecaniques du mode zombies de Call of Duty : map, zombies, systeme de manches, armes au mur, systeme de points, deblocage de portes, boite magique, etc., avec des animations et du son. Qualite premium."

This trio covers feature 1 only: the playable core, end to end. The game is an original title ("Derniere Vague"): it reuses the mechanics of the genre, never the names, logos, named weapons, sounds or characters of an existing license. Wall weapons, paid doors, barricades, the mystery box, power-ups and premium polish are follow-up features (see plan.md).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Station Brume map (Priority: P1)

The player opens the game on a phone in landscape and stands in the start room of the "Station Brume" map. The room is dark and foggy, lit by flickering lamps and a flashlight following the view; the three closed zone entrances and the 6-8 windows are visible.

**Why this priority**: every other story needs a space to stand in.

**Independent Test**: load the page; the view starts at the player start inside the start room, the three closed entrances and the windows are visible, lights flicker and the scene stays within the mobile light budget.

**Acceptance Scenarios**:

1. **Given** the page loads, **When** the first frame renders, **Then** the camera stands at the player start at eye height inside the start room.
2. **Given** the start room is shown, **When** the player looks at the walls, **Then** three closed zone entrances and 6-8 windows are visible.
3. **Given** the scene runs, **When** time passes, **Then** lamps flicker, fog limits the view and no more than 4 dynamic lights are active.

### User Story 2 - Move and look (Priority: P1)

A floating stick on the left half moves the player, dragging on the right half turns the view. Walls and closed zone entrances block movement.

**Why this priority**: moving is the precondition of every fight.

**Independent Test**: with the map of US1, move with the stick and look around; the player cannot cross walls or the three closed zone entrances.

**Acceptance Scenarios**:

1. **Given** the game is running on a touch device, **When** the player touches anywhere on the left half and drags, **Then** a stick appears under the finger and the player moves in the dragged direction at walking speed.
2. **Given** the player drags on the right half, **When** the finger moves horizontally or vertically, **Then** the view turns (yaw unbounded, pitch clamped so the player cannot look past straight up or down).
3. **Given** the player walks into a wall or a closed zone entrance, **When** they keep pushing, **Then** they slide along it and never pass through.
4. **Given** a second finger lands on the same half, **When** it moves, **Then** it is ignored.

### User Story 3 - Shoot and knife with the starting pistol (Priority: P1)

The player holds a pistol. The fire button (or left click) shoots, the aim button tightens the view, reload refills the magazine from the reserve, the knife button strikes at close range. The weapon sways while walking, kicks back on each shot and plays a reload motion. On touch, a light aim assist nudges shots toward a target close to the crosshair. On desktop, WASD, the locked mouse and keys drive the same actions.

**Why this priority**: shooting is the core verb; without it zombies cannot be fought.

**Independent Test**: with static target dummies placed in the start room, fire, reload and knife; hits are registered with body/head distinction, ammo counts down and refills, the viewmodel animates.

**Acceptance Scenarios**:

1. **Given** the pistol has rounds in the magazine, **When** the player fires, **Then** one round is consumed, the weapon recoils and the first target on the aim line takes the pistol's damage (more on a head hit).
2. **Given** the magazine is empty and the reserve is not, **When** the player reloads (or fires), **Then** after the reload time the magazine is refilled from the reserve and firing is blocked during the reload.
3. **Given** magazine and reserve are both empty, **When** the player fires, **Then** nothing is fired.
4. **Given** a target within knife range in front of the player, **When** the player knifes, **Then** the target takes knife damage and the hit is reported as a knife hit.
5. **Given** a touch device and a target slightly off the crosshair (inside the assist cone), **When** the player fires, **Then** the shot is counted as a hit on that target; on desktop no assist applies.
6. **Given** a desktop browser, **When** the player uses WASD, the locked mouse, click, right click, R and V, **Then** movement, look, fire, aim, reload and knife behave as on touch.

### User Story 4 - Zombies climb in and hunt the player (Priority: P1)

Zombies come out of the map windows, walk (or run on later rounds) toward the player, attack when in reach and die when their health reaches zero. They are animated: walk cycle, attack swing, death fall.

**Why this priority**: the threat is what makes it a survival game.

**Independent Test**: spawn a fixed number of zombies from a seeded run; they reach the player, attack at melee range, and die when shot enough; dead zombies are recycled.

**Acceptance Scenarios**:

1. **Given** a spawn is requested, **When** the next spawn slot is free, **Then** a zombie appears at one of the windows (chosen by the seeded random) and starts moving toward the player.
2. **Given** a zombie within attack range of the player, **When** its attack cooldown is ready, **Then** it plays its attack animation and deals one hit to the player.
3. **Given** a zombie's health reaches zero, **When** the damage is applied, **Then** it plays its death animation, stops colliding and returns to the pool afterward.
4. **Given** more zombies are alive than the concurrent cap, **When** a spawn is requested, **Then** it waits until a slot frees up.

### User Story 5 - Rounds, points and player health (Priority: P1)

The game runs in rounds. Each round spawns a growing number of tougher zombies; when the last one dies, a ~10 s intermission starts and the next round begins. Hits and kills earn points. The player absorbs two hits; the third kills; health regenerates after ~4 s without damage. Death ends the game.

**Why this priority**: rounds and points give the loop its progression and its score.

**Independent Test**: drive the round, points and health logic with explicit steps and a seed (no rendering): round counts, HP per round, points per event and the death/regen rules match the table below.

**Acceptance Scenarios**:

1. **Given** round N starts, **When** zombies are scheduled, **Then** the round's total count grows with N and each zombie's HP is 150 + 100 x (N - 1) up to round 9, then the round-9 value x 1.1 per extra round.
2. **Given** round N >= 4, **When** a zombie spawns, **Then** it moves at running speed instead of walking speed.
3. **Given** the last zombie of a round dies, **When** the intermission (10 s) ends, **Then** round N + 1 starts.
4. **Given** a shot hits a zombie without killing it, **Then** the player earns +10; a body kill earns +60, a head kill +100, a knife kill +130.
5. **Given** the player has taken two hits, **When** a third hit lands before regeneration, **Then** the player dies and the game is over with the round reached recorded.
6. **Given** the player was hit, **When** 4 s pass without damage, **Then** health is fully restored.

### User Story 6 - HUD, start menu and end screen (Priority: P2)

A clean HUD over the game shows points, current round, ammo (magazine / reserve), a red damage vignette when hurt, the touch buttons and a contextual interact prompt slot. A start menu launches the game (and unlocks audio); an end screen shows the round reached and a restart button. Texts are in French.

**Why this priority**: the game is playable without it in a debug sense, but not understandable by a player.

**Independent Test**: feed a logic state snapshot to the HUD and menus; the displayed values, vignette and screens match the snapshot, and the DOM is only updated when a shown value changes.

**Acceptance Scenarios**:

1. **Given** the page loads, **When** the start menu is shown, **Then** tapping "Jouer" starts a new game at round 1 with 500 points.
2. **Given** points, round or ammo change, **When** the HUD updates, **Then** the new value is shown and unchanged fields are not rewritten.
3. **Given** the player is hurt, **When** health is below full, **Then** a red vignette is visible and fades out on regeneration.
4. **Given** the game is over, **When** the end screen shows, **Then** it displays the round reached and "Rejouer" starts a fresh game.
5. **Given** a phone with a notch, **When** the HUD is shown, **Then** no element sits under the safe-area insets.

### User Story 7 - Basic synthesized sound (Priority: P2)

All sounds are synthesized: pistol shot, reload, knife swing, footsteps, spatialized zombie groans and attacks, player hurt, and a round jingle at each round change.

**Why this priority**: sound sells the atmosphere and tells the player where zombies are.

**Independent Test**: start a game, fire, reload, walk, let zombies approach and survive to round 2; each event plays its sound, groans pan with the zombie position, and the voice cap holds.

**Acceptance Scenarios**:

1. **Given** the start menu is tapped, **When** the game starts, **Then** the audio context is unlocked and the round jingle plays.
2. **Given** a game event (shot, reload, knife, footstep, hurt, round change), **When** it occurs, **Then** its sound plays once.
3. **Given** a zombie to the player's left, **When** it groans, **Then** the sound comes from the left and fades with distance.
4. **Given** the voice cap is reached, **When** a new sound is requested, **Then** the oldest voice is stopped first.

### Edge Cases

- The page is opened in portrait -> a "turn your device" overlay is shown and the simulation pauses.
- The tab goes to background -> the loop stops advancing; on return, no catch-up burst beyond the existing step cap.
- Two fingers on the same half -> only the first touch drives the stick or the look.
- A zombie dies during its attack swing -> the attack deals no damage.
- The player kills the last zombie and is hit on the same step -> the kill counts first; round ends normally if the player survives.
- Reload requested with a full magazine or an empty reserve -> ignored.
- Out of scope for this feature: wall weapons, ammo buys, paid doors/debris, barricade repair, mystery box, power-ups, weapon swap beyond the single pistol, advanced particles and post-processing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render the Station Brume map: a start room, three closed zone entrances and 6-8 windows, with fog, flickering lights and a player flashlight.
- **FR-002**: The system MUST move the player with a floating left stick and turn the view with a right-half drag on touch, and with keyboard/mouse on desktop, mapped to the same actions.
- **FR-003**: The system MUST prevent the player from crossing walls and closed zone entrances.
- **FR-004**: The system MUST let the player fire, aim, reload and knife with the starting pistol, with magazine and reserve ammo.
- **FR-005**: The system MUST resolve shots against zombies with body/head distinction, and apply a light aim assist on touch only.
- **FR-006**: The system MUST spawn zombies at windows, steer them toward the player, let them attack in reach and remove them on death.
- **FR-007**: The system MUST run rounds with growing zombie counts and the HP formula of US5, running zombies from round 4, and a 10 s intermission.
- **FR-008**: The system MUST award points: +10 hit, +60 kill, +100 head kill, +130 knife kill.
- **FR-009**: The system MUST kill the player on the third hit taken without regeneration, and fully regenerate after 4 s without damage.
- **FR-010**: The system MUST show a HUD (points, round, ammo, damage vignette), a start menu and an end screen with the round reached and a restart.
- **FR-011**: The system MUST synthesize the sounds of US7, spatialize zombie sounds, and cap simultaneous voices.
- **FR-012**: The system MUST be reproducible for a given seed: spawns and random choices draw from the seeded generator.

### Key Entities

- **Player**: position, view angles, health state (hits taken, time since last hit), points, weapon state.
- **Weapon state**: magazine, reserve, reload progress, fire cooldown.
- **Zombie**: position, health, speed mode (walk/run), state (spawning, chasing, attacking, dying), attack cooldown.
- **Round**: number, zombies remaining to spawn, zombies alive, phase (active / intermission), intermission timer.
- **Map layout**: walls, closed zone entrances, window spawn points, player start.

## Success Criteria *(mandatory)*

- **SC-001**: A new player can start a game from the menu and survive round 1 on a recent phone in landscape without instructions.
- **SC-002**: The game holds 60 fps on a recent phone in round 1 and never drops under 30 fps with the concurrent zombie cap reached.
- **SC-003**: For a fixed seed and the same inputs, two runs produce the same round progression and points.
- **SC-004**: The built game is a single HTML file that runs offline with no external request.

## Clarifications

### Session 2026-10-06

- Q: Scope of this run (the need exceeds one run)? → A: Feature 1 only, the playable core (map, movement, shooting + knife, zombies, rounds, points, health, HUD, basic sounds, menu/end); economy (wall weapons, doors 750/1000/1250, barricades +10/plank, box 950, power-ups) and premium polish are follow-up features listed in plan.md. Original IP, no licensed names or sounds.
- Q: Rules for points, rounds and health? → A: Hit +10, kill +60, head kill +100, knife kill +130; zombie HP 150 + 100/round up to round 9 then x1.1/round; running from round 4; 10 s intermission with jingle; 2 hits absorbed, 3rd kills, regen after 4 s; end screen with round reached and restart.
- Q: Controls and platform? → A: Mobile landscape first: floating left stick, right-half drag to look, fire/aim/reload/interact/swap/knife buttons (48px+), light aim assist on touch, keyboard/mouse fallback; 60 fps target, 30 fps floor; single-file build, no external asset.
- Q: Split into 6 stories and working assumptions? → A: Validated (6 stories: map + movement, pistol + knife, zombies, rounds + points + health, HUD + menus, basic sounds; assumptions below accepted). Sanity (A.5) then found the map + movement story at 9 files with companions (cap ~8): split into US1 map and US2 move/look, desktop fallback moved to US3; 7 stories, within the intent's ~7 per run.

## Assumptions

- Only the starting pistol exists in this feature; the swap and interact buttons are laid out but inactive until feature 2.
- The three zone entrances are visible and closed; opening them is feature 2.
- One seed per game, drawn at game start; tests inject it.
- The player starts with 500 points (genre default; spent in feature 2).
- Fog, flickering lights and flashlight are basic in this feature; particles, post-processing and richer animations belong to feature 3.
- Zombie pathing is direct steering with wall sliding; no navmesh in this feature.
