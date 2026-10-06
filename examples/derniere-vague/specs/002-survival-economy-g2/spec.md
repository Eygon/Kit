# Feature Specification: Survival economy (wall buys, doors, barricades, mystery box)

**Feature Branch**: `002-survival-economy-g2`
**Created**: 2026-10-06
**Input**: "Feature 2 de Derniere Vague : l economie du mode survie — armes au mur, portes et debris payants vers 3 zones, barricades reparables, boite magique, bonus lâches par les zombies, HUD et sons associes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wall weapons and two-weapon loadout (Priority: P1)

The player spends points earned on zombies at three wall spots to buy a submachine gun (1000), a carbine (1200) or a shotgun (1500, several pellets per shot). Standing at a spot of a weapon already owned refills its ammo for half the price. The player carries at most two weapons: buying a third replaces the one in hand. The swap button switches between the two weapons.

**Why this priority**: points currently have no use; spending them is the core loop of the genre.

**Independent Test**: in a seeded session, give the ledger 2000 points, place the player at the carbine spot, press Interact: the ledger drops by 1200, the carbine is in hand, the pistol is the second slot; pressing swap brings the pistol back.

**Acceptance Scenarios**:

1. **Given** 1500 points and the player within reach of the carbine spot, **When** Interact is pressed, **Then** points drop to 300, the carbine is the weapon in hand with full mag and reserve, and a purchase event is emitted.
2. **Given** 800 points and the player at the carbine spot, **When** Interact is pressed, **Then** points are unchanged, no weapon changes and a denied event is emitted.
3. **Given** the player owns the carbine with an empty reserve, **When** Interact is pressed at the carbine spot with at least 600 points, **Then** 600 points are spent and mag and reserve are full.
4. **Given** the player holds two weapons (pistol, carbine) with the carbine in hand, **When** the shotgun is bought, **Then** the loadout becomes pistol + shotgun with the shotgun in hand.
5. **Given** two weapons, **When** swap is pressed once (held across steps), **Then** the other weapon is in hand exactly once.
6. **Given** the shotgun in hand, **When** it fires at a zombie at close range, **Then** several pellets are resolved and each one that hits deals damage.

---

### User Story 2 - Purchase HUD and wall-buy visuals (Priority: P1)

Each wall spot shows a drawn weapon silhouette and its price. Near a spot, a French prompt appears (« Acheter Carabine — 1200 », « Munitions Carabine — 600 ») and the touch Interact button shows up; with too few points the prompt turns red. The HUD shows the weapon in hand and the ammo of both weapons.

**Why this priority**: without visible spots and prompts US1 cannot be played.

**Independent Test**: render the HUD with a session whose interaction prompt is the carbine at 1200 and whose ledger is 800: the prompt text is « Acheter Carabine — 1200 » with the denied style; the wall-buy view builds one silhouette and one price label per spot.

**Acceptance Scenarios**:

1. **Given** the player within reach of a wall spot, **When** the frame renders, **Then** the prompt shows « Acheter <arme> — <prix> » and the touch Interact button is visible.
2. **Given** the player out of reach of every spot, **When** the frame renders, **Then** no prompt is shown and the touch Interact button is hidden.
3. **Given** fewer points than the price, **When** the prompt is shown, **Then** it carries the denied (red) style.
4. **Given** pistol and carbine owned, **When** the HUD renders, **Then** it shows the weapon in hand and the mag / reserve of both weapons, updated only when a value changes.

---

### User Story 3 - Paid doors and debris to three zones (Priority: P1)

Three closed passages lead from the start room to three zones: north (750), east (1000), west (1250). Buying one plays an opening of about one second, then the passage stops blocking and the windows of that zone start spawning zombies. Windows of a closed zone never spawn.

**Why this priority**: zones are where points go after the first weapon, and they widen the map.

**Independent Test**: in a seeded session, run a full round with no door open: every spawn uses a start-room window; open the east door with 1000 points, wait the opening time: the east passage no longer blocks movement and east-zone windows appear among spawns.

**Acceptance Scenarios**:

1. **Given** 1000 points at the east passage, **When** Interact is pressed, **Then** 1000 points are spent and the door enters its opening phase.
2. **Given** a door in its opening phase, **When** the opening time elapses, **Then** the passage no longer blocks the player or shots and a door-opened event is emitted.
3. **Given** the north zone closed, **When** zombies spawn for a whole round, **Then** none uses a north-zone window.
4. **Given** the north zone open, **When** zombies spawn, **Then** north-zone windows are part of the spawn draw.
5. **Given** 700 points at the north passage, **When** Interact is pressed, **Then** nothing opens and a denied event is emitted.

---

### User Story 4 - Repairable barricades (Priority: P1)

Every window holds six planks. A zombie arriving at a window tears planks one by one and only climbs in when none is left. Holding Interact near a damaged window puts planks back one by one, +10 points per plank, up to 500 repair points per round.

**Why this priority**: barricades are the main point source between kills and the core defensive gesture.

**Independent Test**: in a seeded session, spawn a zombie at a window: it stays outside until six plank-torn events have been emitted, then climbs in; then hold Interact near that window: planks return one per repair interval and the ledger grows by 10 each, stopping once 500 points were earned this round.

**Acceptance Scenarios**:

1. **Given** a window with 6 planks and a zombie at it, **When** time passes, **Then** one plank is torn per tear interval and the zombie enters only when planks reach 0.
2. **Given** a window with 2 planks, **When** the player holds Interact within reach, **Then** one plank is put back per repair interval, each giving +10 points, until 6.
3. **Given** 500 repair points already earned this round, **When** another plank is repaired, **Then** the plank returns but no points are added.
4. **Given** a new round starts, **When** a plank is repaired, **Then** points are earned again.
5. **Given** a window in a closed zone, **When** the session runs, **Then** no zombie targets it and it offers no repair prompt.

---

### User Story 5 - Zone, door and barricade visuals (Priority: P2)

The three zones are visible rooms beyond the passages. North and west passages are debris that collapse when bought; the east passage is a door that slides open. Each window shows its planks: torn ones disappear, repaired ones return.

**Why this priority**: US3 and US4 work without it but the player cannot read them.

**Independent Test**: build the station with the three zones and a door view and a barricade view; set a door to half its opening and a window to 3 planks: the debris is half collapsed and three plank meshes are visible on that window.

**Acceptance Scenarios**:

1. **Given** the station is built, **When** the scene is inspected, **Then** each zone has walls, floor and its window frames.
2. **Given** a debris passage opening, **When** frames render, **Then** the debris pieces fall and are hidden once the door is open.
3. **Given** the east door opening, **When** frames render, **Then** the door slides along its wall and is fully aside once open.
4. **Given** a window with N planks, **When** the frame renders, **Then** exactly N plank meshes of that window are visible.

---

### User Story 6 - Mystery box (Priority: P2)

For 950 points the box at its start spot opens, rolls through weapons for about 4 seconds and offers one: the three wall weapons, a light machine gun or the exotic « rayon à énergie ». The player takes it by interacting within about 10 seconds; otherwise it is lost. After a few rolls a teddy bear may come out: the 950 points are refunded and the box moves to another spot.

**Why this priority**: the box is the high-variance sink of the genre, after the deterministic ones.

**Independent Test**: in a seeded session with 2000 points at the box, press Interact: 950 points are spent, the box rolls for the roll time, then offers a weapon from the pool; interacting gives that weapon through the loadout rule of US1.

**Acceptance Scenarios**:

1. **Given** 950 points at the box, **When** Interact is pressed, **Then** the points are spent and the box rolls for the roll time.
2. **Given** the roll ends, **When** the offer is made, **Then** the weapon comes from the pool drawn with the session seed, and Interact within the offer time gives it (replacing the weapon in hand if two are held).
3. **Given** an offer not taken, **When** the offer time elapses, **Then** the box closes and the weapon is lost.
4. **Given** enough rolls were done for the teddy to be possible and the seeded draw selects it, **When** the roll ends, **Then** 950 points are refunded, a teddy event is emitted and the box moves to another spot.
5. **Given** the box is rolling, offering or moving, **When** another player interaction happens, **Then** no second purchase is made.

---

### User Story 7 - Mystery box visuals, weapon models and economy sounds (Priority: P2)

The box is a visible chest with a signal light beam above it; when bought the lid opens and weapon silhouettes cycle over it, the offered weapon floats until taken. The first-person model matches the weapon in hand. Sounds: purchase, denied, door opening, plank torn and plank placed (at the window), box roll music, teddy.

**Why this priority**: the box logic of US6, the new weapons and the feedback of US1-US4 need to be seen and heard.

**Independent Test**: create the box view with a box state rolling at half time: the lid is open and a silhouette is shown; feed the audio director a purchase, denied, doorOpened, plankTorn, plankRepaired, boxOpened and boxTeddy event: each plays its voice once.

**Acceptance Scenarios**:

1. **Given** the box idle at a spot, **When** the frame renders, **Then** the chest and its light beam stand at that spot.
2. **Given** the box rolling, **When** frames render, **Then** the lid is open and silhouettes change over time.
3. **Given** the box moved, **When** the frame renders, **Then** the chest and beam stand at the new spot.
4. **Given** each economy event, **When** the audio director updates, **Then** its sound plays once; plank sounds are spatialised at their window.
5. **Given** the weapon in hand changes, **When** the next frame renders, **Then** the first-person model is the one of the new weapon.

### Edge Cases

- Interact held across steps -> one purchase only (purchases react to the press, repair to the hold).
- Two interaction points in reach -> the nearest one is offered.
- Ammo refill of an owned weapon whose mag and reserve are already full -> no purchase, no spending, no prompt price change.
- Buying while reloading -> the reload of the replaced weapon is cancelled.
- No spawn window available (all zones closed and start windows in a list) -> start windows always exist; an empty list never reaches the random pick.
- Box teddy -> the box never relocates to its current spot.
- Repair while a zombie is tearing the same window -> both apply; planks stay within 0..6.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST sell the submachine gun (1000), carbine (1200) and shotgun (1500) at fixed wall spots, and their ammo at half price to owners.
- **FR-002**: The system MUST keep at most two weapons; buying a third replaces the weapon in hand; swap MUST toggle between them.
- **FR-003**: The shotgun MUST fire several pellets per shot, each resolved as a hit.
- **FR-004**: The system MUST show a French interaction prompt and the touch Interact button when an interaction point is in reach, in red when points are insufficient.
- **FR-005**: The system MUST sell three passages (750, 1000, 1250) with an opening animation, after which the passage stops blocking and the zone windows spawn.
- **FR-006**: Every window MUST hold 6 planks torn one by one by zombies before they enter, and repaired by holding Interact (+10 points per plank, 500 per round cap).
- **FR-007**: The mystery box MUST cost 950, roll ~4 s, offer a weapon from {SMG, carbine, shotgun, LMG, energy ray} for ~10 s, and after some rolls MAY give a teddy that refunds and relocates it.
- **FR-008**: All randomness (box draw, teddy) MUST come from the session seed.
- **FR-009**: The HUD MUST show the weapon in hand and the ammo of both weapons.
- **FR-010**: Sounds MUST play for purchase, denied, door, plank torn/placed, box roll and teddy.

### Key Entities

- **Loadout**: up to two weapon states and the index of the one in hand.
- **Interaction point**: a place with a reach, a kind (wall buy, door, repair, box) and a label/price.
- **Zone door**: zone id, price, kind (debris or door), state closed / opening (progress) / open.
- **Barricade**: window id, planks 0..6, repair timer; per-round repair points earned.
- **Mystery box**: spot index, state idle / rolling / offering / moving, offered weapon, roll count.

## Success Criteria *(mandatory)*

- **SC-001**: A player can go from 500 starting points to owning a wall weapon and one open zone within the first five rounds.
- **SC-002**: Every purchase, denial, door, plank and box action gives visible and audible feedback in the same frame or the next.
- **SC-003**: Two sessions with the same seed and inputs produce the same box results.
- **SC-004**: The game keeps its mobile budget (no more than 4 dynamic lights, no new external asset).

## Clarifications

### Session 2026-10-06

- Q: The need splits into ~10 US above the ~7 US cap; which slice for this run? → A: US1-US7 (wall buys, doors/zones, barricades, mystery box, with their presentation); power-ups deferred whole.
- Q: Barricade repair points cap per round? → A: 500 points per round, reset at round start.
- Q: First-person model for the new weapons? → A: one primitive model per weapon, swapped on the weapon in hand.
- Q: Safety net (assumptions below, retained US) → A: validated as listed; US1-US7 retained.

## Assumptions

- Interaction reach 1.5 m; nearest point wins; purchases on the Interact press, repair on the hold.
- Ammo refill costs half the weapon price and fills mag and reserve.
- Shotgun: 8 pellets in a fixed spread from config; LMG and energy-ray stats are new config entries.
- Box pool: equal weights, energy ray at half weight, pistol excluded; teddy possible from the 4th roll with a 1/4 chance; three box spots.
- Door opening lasts 1 s; a plank is torn every 1.2 s; repair puts back one plank per 0.75 s of hold.
- Out of scope (deferred to the next run): power-ups dropped by zombies (max ammo, insta-kill 30 s, double points 30 s, nuke +400; seeded ~1/30 per kill, max 4 per round; floating blinking object ~25 s; announce sound and text) and their HUD icons with countdown.
- Names stay original (no trademarked names).
