# Feature Specification: Live cursors of other people on the board

**Feature Branch**: `001-live-cursors-m10-r1`
**Created**: 2026-10-07
**Input**: "Voir les curseurs des autres personnes en direct sur le tableau"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The real-time channel relays cursor positions to the other members (Priority: P1)

While a person moves their pointer over a board, the server relays each position to the other people currently connected to that same board, tagged with who moved. The sender never receives their own position back. The server stores nothing and imposes no rate limit; anyone who has joined the board (viewer included) may share a cursor.

**Why this priority**: The display (US2) has nothing to show until positions travel between people.

**Independent Test**: Two test clients join the same board through the existing real-time channel; one sends a position and the other receives it with the sender's identity and the same coordinates, while the sender receives nothing. Provable without any front-end change.

**Acceptance Scenarios**:

1. **Given** Bob and Carol have both joined board 1, **When** Bob sends cursor position (120, 80) for board 1, **Then** Carol receives a cursor-moved event carrying Bob's user id, Bob's display name, x = 120 and y = 80, as defined in the contract.
2. **Given** Bob and Carol have both joined board 1, **When** Bob sends a cursor position, **Then** Bob receives no cursor-moved event.
3. **Given** Carol (viewer) and Bob have both joined board 1, **When** Carol sends a cursor position, **Then** Bob receives it.
4. **Given** Carol has not joined board 2, **When** Carol sends a cursor position for board 2, **Then** no error is returned to Carol and no member of board 2 receives anything.
5. **Given** Bob has joined board 1 and Carol board 2 only, **When** Bob sends a position for board 1, **Then** Carol receives nothing.

### User Story 2 - Each person sees the other people's cursors on the board (Priority: P2)

On a board, each person sees, for every OTHER person present, an arrow in that person's colour with their first name next to it, at the place on the board where that person's pointer is. Positions are in board coordinates, so a cursor stays over the same item whatever the zoom or pan of each viewer. The person's own pointer movements are shared at most about 20 times per second. A cursor idle for 5 seconds fades; a cursor disappears as soon as its owner leaves the board. The cursor layer never gets in the way: clicks, drawing, selection and the canvas widgets behave exactly as if it were not there.

**Why this priority**: It is the user-visible value; it relies on US1's channel through the contract.

**Independent Test**: With the real-time connection mocked (as the existing presence tests do), feeding a cursor-moved event for another present user shows their labelled, coloured arrow at the right place for the current zoom and pan; moving the pointer over the canvas sends throttled positions; drawing with the Pencil across a displayed cursor still creates the stroke.

**Acceptance Scenarios**:

1. **Given** Bob is on board 1 and Carol is present, **When** a cursor-moved event for Carol at board position (200, 100) arrives, **Then** Bob sees an arrow labelled "Carol" in Carol's colour at board position (200, 100).
2. **Given** Carol's cursor is shown at board position (200, 100), **When** Bob zooms in or pans the view, **Then** the cursor stays over the same board position (it moves with the items).
3. **Given** Bob is on board 1, **When** an event carrying Bob's own user id arrives, **Then** no cursor is drawn for Bob.
4. **Given** Bob moves his pointer continuously over the canvas, **When** one second elapses, **Then** at most about 20 positions are sent, each expressed in board coordinates (independent of Bob's zoom and pan).
5. **Given** Carol's cursor is shown, **When** no new position for Carol arrives for 5 seconds, **Then** her cursor is shown at reduced opacity (0.3) and is not removed; a new position restores full opacity.
6. **Given** Carol's cursor is shown, **When** the presence list no longer contains Carol, **Then** her cursor disappears immediately.
7. **Given** the Pencil tool is active and Carol's cursor is shown at a point of the canvas, **When** Bob draws a stroke that starts on and crosses Carol's cursor, **Then** the stroke is created as if the cursor were not there.
8. **Given** the Select tool is active and Carol's cursor is shown over an item, **When** Bob clicks the item under the cursor, **Then** the item gets selected.
9. **Given** two different users, **When** their cursors are shown, **Then** each colour is always the same for the same user (deterministic by user id) and is taken from the colours already offered on the board.

### Edge Cases

- A position arrives for a user who is not (or no longer) in the presence list -> it is not displayed.
- The real-time connection is offline -> no position is sent and no error is shown; existing cursors stay until presence changes.
- The same person has two tabs open -> neither tab shows that person's own cursor (excluded by user id).
- Pointer leaves the canvas -> nothing is sent; the remote cursor stays where it was and fades after 5 s.
- Pointer movement while panning, dragging an item or drawing -> positions are still shared; the existing gesture is not altered.
- Canvas widgets (minimap, zoom controls) and the dock -> the cursor layer sits under no widget and never intercepts their pointer events.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST relay a member's cursor position on a board to the other members connected to that board only, with the sender's id and display name, per the contract.
- **FR-002**: The system MUST NOT send a member's cursor position back to its sender.
- **FR-003**: The system MUST silently ignore a cursor position sent for a board the sender has not joined.
- **FR-004**: The system MUST NOT store cursor positions.
- **FR-005**: The board MUST display, for every other present person, an arrow in that person's deterministic colour with their display name, at their position in board coordinates.
- **FR-006**: The board MUST share the person's pointer position in board coordinates, at most about 20 times per second.
- **FR-007**: A cursor without a new position for 5 seconds MUST be shown at opacity 0.3; it MUST disappear as soon as its owner is no longer present.
- **FR-008**: The cursor layer MUST NOT intercept any pointer interaction (click, drawing, selection, widgets).

### Key Entities

- **Cursor position**: who (user id, display name) and where (x, y in board coordinates) on which board; transient, never stored.

## Success Criteria *(mandatory)*

- **SC-001**: Another person's cursor appears within one second of their pointer moving, under normal network conditions.
- **SC-002**: Drawing, selecting and clicking on the canvas work identically with or without other people's cursors displayed.
- **SC-003**: A departed person's cursor is gone as soon as the presence list is updated.

## Clarifications

### Session 2026-10-07

- Q: A cursor position sent for a board the sender has not joined? → A: Ignored silently (no error on every move).
- Q: What happens to an idle cursor? → A: After 5 s it fades to opacity 0.3 and stays; it disappears immediately when its owner leaves (presence).
- Q: Which colours "already offered for post-its"? → A: The board's existing colour palette (the one offered in the toolbar, which contains the default sticky-note colour), picked deterministically by user id.
- Q: Hypotheses and stories for this run? → A: Board coordinates, ~20 positions/s, own cursor excluded by user id, viewers share their cursor, back and front in separate stories; both stories retained.

## Assumptions

- Out of scope: following someone's view, cursors on the minimap, shared selection.
- The existing real-time channel of the board is extended; no second channel or connection is opened.
- No persistence and no server-side rate limiting.
