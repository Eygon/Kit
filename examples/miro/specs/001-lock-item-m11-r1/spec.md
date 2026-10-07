# Feature Specification: Lock a board item

**Feature Branch**: `001-lock-item-m11-r1`
**Created**: 2026-10-07
**Input**: "Pouvoir verrouiller un item pour que personne ne le deplace ni ne le modifie"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The server stores and exposes the lock state of an item (Priority: P1)

An editor or the owner of a board can mark any item (sticky note, shape, text, freehand stroke) as locked or unlocked. The lock state is part of the item everyone reads, survives a reload, and travels with the board when it is exported and re-imported.

**Why this priority**: every other story reads or enforces this state; without it nothing can be locked.

**Independent Test**: through the API alone: lock an item as an editor, read the board items and see it locked; export the board, import the file, and see the imported item still locked.

**Acceptance Scenarios**:

1. **Given** an item that was never locked, **When** any member reads the board items, **Then** the item reports as unlocked.
2. **Given** an editor or the owner, **When** they set the item lock to true (per the contract), **Then** the response and every later read report the item as locked.
3. **Given** a locked item, **When** an editor sets the lock back to false, **Then** the item reports as unlocked.
4. **Given** a viewer, **When** they try to change the lock state of an item, **Then** the request is refused as forbidden and the item is unchanged.
5. **Given** a board with a locked and an unlocked item, **When** the board is exported (F9), **Then** the file carries the lock state of each item.
6. **Given** an exported file containing a locked item, **When** it is imported (F9), **Then** the new board contains that item locked; a file without any lock information imports every item unlocked.

---

### User Story 2 - The server refuses any change to a locked item (Priority: P1)

While an item is locked, nobody can move it, resize it, change its content, colour or stacking order, or delete it; the server answers with a conflict and a clear message. Unlocking the item makes it editable again.

**Why this priority**: the lock must hold for every client, including other open sessions and scripts, not only in the UI.

**Independent Test**: through the API alone, with US1 delivered: lock an item, try to move / resize / edit / change stacking / delete it and get a conflict each time; unlock it and the same move succeeds.

**Acceptance Scenarios**:

1. **Given** a locked item, **When** an editor sends a change of position, size, content, colour or stacking order, **Then** the server answers with a conflict (per the contract) and a message saying the item is locked, and the item is unchanged.
2. **Given** a locked item, **When** an editor deletes it, **Then** the server answers with the same conflict and the item still exists.
3. **Given** a locked item, **When** an editor sends a change that only unlocks it, **Then** it succeeds; a following move succeeds.
4. **Given** a locked item, **When** a member creates a connector to it (F4) or comments on it (F1/F5), **Then** the action succeeds as before.
5. **Given** a locked item, **When** a change mixes unlocking with a move in the same request, **Then** the request succeeds (the unlock applies first).

---

### User Story 3 - Lock, unlock and see the lock on the canvas (Priority: P1)

An editor or the owner selects an item and toggles a padlock button in the board toolbar. A locked item shows a small padlock icon. Trying to drag it moves nothing and sends no request; double-click edit and delete do nothing on it. A viewer never sees the toggle. A lock set by someone else appears live.

**Why this priority**: this is the user-facing value of the feature.

**Independent Test**: with the contract (and US1/US2 or a mocked API): select an item, click the padlock, see the icon; drag it and see that it does not move and that no update is sent; click again to unlock and drag it.

**Acceptance Scenarios**:

1. **Given** an editor with an unlocked item selected, **When** they click the padlock toggle, **Then** the item is locked and shows a padlock icon.
2. **Given** an editor with a locked item selected, **When** they click the toggle, **Then** the item is unlocked and the icon disappears.
3. **Given** a viewer, or a user whose role is still loading or failed to load, **When** an item is selected, **Then** no padlock toggle is shown.
4. **Given** a locked item, **When** anyone drags it, **Then** it stays in place and no update request is sent.
5. **Given** a locked item, **When** an editor double-clicks it or presses Delete / the toolbar delete button with it selected, **Then** no edit panel opens and nothing is deleted.
6. **Given** a locked item, **When** an editor selects it, opens its comments or starts a connector from it, **Then** these work as on an unlocked item.
7. **Given** two users on the same board, **When** one locks an item (F8), **Then** the other sees the padlock icon without reloading and can no longer drag it.

---

### User Story 4 - Undo/redo and conflicts around locked items (Priority: P2)

Locking and unlocking are undoable actions. Undoing or redoing an earlier action on an item that is now locked does not force the change: the user gets a "item locked" message and the entry stays in the history. A conflict the server returns unexpectedly (someone else locked the item in between) shows a translated message.

**Why this priority**: it closes the gaps between the lock and the existing history and concurrency behaviours; the lock already holds without it.

**Independent Test**: with US3: move an item, lock it, press undo: the item does not move, a "item locked" message appears, and the move is still in the history; undo again after unlocking moves it back.

**Acceptance Scenarios**:

1. **Given** an editor who just locked an item, **When** they undo (F3), **Then** the item is unlocked; redo locks it again.
2. **Given** an item moved before being locked, **When** the editor undoes the move while it is locked, **Then** no update request is sent, a translated "item locked" toast appears, and the move entry stays in the undo history.
3. **Given** an item moved, then locked, **When** the editor undoes twice, **Then** the first undo unlocks the item and the second reverts the move.
4. **Given** any update or delete that the server refuses with a conflict, **When** the response arrives, **Then** one translated toast explains that the item is locked and the canvas returns to the server state.

### Edge Cases

- Lock toggled on an item another user just deleted -> the usual "not found" error toast, nothing else.
- Existing interaction modes on a locked item: with the Select tool a press selects it without moving it; the Pencil and shape tools behave as on an unlocked item except that the item never moves; the Connector tool still links it.
- Stacking order (bring to front / back) counts as a change and is refused server-side; the front has no such control today.
- Resize: the front has no resize handle today; the server refuses a size change on a locked item.
- Multi-selection: not implemented in the app; the lock never blocks selection.
- Role unknown (members loading, error, empty list) -> treated as viewer: no toggle.
- Out of scope: who locked the item (per-user lock), locking the whole board.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store a lock state per item, false by default, readable by every board member.
- **FR-002**: Only an editor or the owner MUST be able to change the lock state.
- **FR-003**: The system MUST refuse with a conflict any move, resize, content, colour, stacking-order change or deletion of a locked item, with a clear message.
- **FR-004**: Comments and connectors on a locked item MUST remain allowed; selection MUST remain allowed.
- **FR-005**: Export MUST include the lock state; import MUST restore it.
- **FR-006**: The board MUST offer a padlock toggle for the selected item to editors and the owner only, and show a padlock on locked items.
- **FR-007**: Dragging, editing or deleting a locked item in the UI MUST do nothing and send no request.
- **FR-008**: Locking and unlocking MUST be undoable; undo/redo of an action on a locked item MUST show an "item locked" message and keep the entry.
- **FR-009**: A conflict answer from the server MUST show a translated message.
- **FR-010**: All new texts MUST exist in French, English and Spanish.

### Key Entities

- **Board item**: gains a lock state (boolean, default unlocked), stored with the item and carried in the board file.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of change attempts on a locked item (move, resize, content, colour, stacking, delete) are refused by the server.
- **SC-002**: Dragging a locked item sends zero update requests.
- **SC-003**: A lock set by one user is visible to the other open sessions of the board without reload.
- **SC-004**: An export/import round-trip preserves the lock state of every item.

## Clarifications

### Session 2026-10-07

- Q: Where does the lock toggle live (no per-item bar exists)? → A: In the existing board toolbar, shown only when an item is selected and the user is editor/owner.
- Q: Which status for a change on a locked item, given the back standard only maps 400/403/404? → A: A new conflict exception mapped to a conflict status with a clear message (accepted deviation).
- Q: Undo/redo of an action on an item now locked? → A: No request, translated "item locked" toast, the entry stays in history; lock/unlock itself is undoable.
- Q: Assumptions and retained stories? → A: Connectors and comments allowed, stacking/resize/content/delete/move refused, selection never blocked, only editor/owner toggles, export/import carries the state, live sync via the existing board-changed event; all four stories retained.

## Assumptions

- Live propagation relies on the existing board-changed notification sent after every item update (F8); no new realtime event.
- The existing write-access check (editor/owner) already guards every item update, so it also guards the lock change.
- An old export file without lock information imports all items unlocked.
- Out of scope: per-user lock, whole-board lock.
