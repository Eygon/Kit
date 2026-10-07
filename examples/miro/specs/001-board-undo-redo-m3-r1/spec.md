# Feature Specification: Undo / redo on a board

**Feature Branch**: `001-board-undo-redo-m3-r1`
**Created**: 2026-10-06
**Input**: "Pouvoir annuler et rétablir mes dernières actions sur un tableau (Ctrl+Z / Ctrl+Shift+Z)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Undo and redo my last actions from the toolbar (Priority: P1)

As an editor of a board, I can undo my last actions (create, move, text edit, delete of an item) and redo them, using two buttons in the board toolbar. Undoing replays the inverse action on the server (create <-> delete, move back to the previous position, previous text), so the board stays consistent for everyone.

**Why this priority**: It is the core value: recovering from a mistake without rebuilding the item by hand.

**Independent Test**: On a board, create a sticky note, click Undo: the note disappears; click Redo: it comes back. Move a note, Undo: it returns to its start position. Edit a text, Undo: the previous text is back. Delete a note, Undo: it is back.

**Acceptance Scenarios**:

1. **Given** an open board with no action done yet, **When** the board is displayed, **Then** the Undo and Redo buttons are visible in the toolbar and both are disabled.
2. **Given** I created an item, **When** I click Undo, **Then** the item is deleted on the server and disappears, and Redo becomes enabled.
3. **Given** I dragged an item from position A to position B in one gesture, **When** I click Undo once, **Then** the item goes back to position A in a single step (one drag = one history entry, not one per pointer event).
4. **Given** I edited the text of an item, **When** I click Undo, **Then** the previous text is restored; **When** I click Redo, **Then** the new text is restored.
5. **Given** I deleted an item, **When** I click Undo, **Then** the item is re-created with the same type, position, size, color and text.
6. **Given** I undid an action, **When** I do a new action, **Then** Redo becomes disabled (the redo stack is cleared).
7. **Given** 51 actions done, **When** I undo repeatedly, **Then** only the last 50 can be undone.
8. **Given** an undo whose server request fails (item deleted by someone else), **When** I click Undo, **Then** one error toast is shown and that action leaves the history.
9. **Given** a history on board A, **When** I open board B, **Then** Undo and Redo are disabled.

---

### User Story 2 - Keyboard shortcuts for undo and redo (Priority: P2)

As an editor, I can undo with Ctrl+Z (Cmd+Z on macOS) and redo with Ctrl+Shift+Z (Cmd+Shift+Z) or Ctrl+Y, without reaching for the toolbar. When I am typing in a text field, the shortcuts keep their native meaning inside that field.

**Why this priority**: Speed for frequent users; the buttons of US1 already deliver the capability.

**Independent Test**: Create an item, press Ctrl+Z: it disappears; press Ctrl+Shift+Z: it is back; press Ctrl+Y after another undo: it is back. Focus a text field, press Ctrl+Z: the board history is untouched.

**Acceptance Scenarios**:

1. **Given** an action in the history and the focus outside any text field, **When** I press Ctrl+Z or Cmd+Z, **Then** the last action is undone.
2. **Given** an undone action, **When** I press Ctrl+Shift+Z, Cmd+Shift+Z or Ctrl+Y, **Then** it is redone.
3. **Given** the focus is in an input, a textarea or an editable element, **When** I press Ctrl+Z, **Then** the board history is not changed and the browser's native undo of the field applies.
4. **Given** an empty undo stack, **When** I press Ctrl+Z, **Then** nothing happens.

---

### User Story 3 - A read-only viewer has no undo / redo (Priority: P3)

A user whose role on the board is Viewer sees neither the Undo nor the Redo button, and the shortcuts do nothing for them.

**Why this priority**: Viewers cannot modify the board (the server refuses), so offering undo would only produce errors.

**Independent Test**: Open a board where the current user is Viewer: no Undo/Redo buttons; Ctrl+Z does nothing. Open a board where the user is Editor or Owner: buttons present.

**Acceptance Scenarios**:

1. **Given** the current user is Viewer on the board, **When** the board is displayed, **Then** no Undo and no Redo button is shown.
2. **Given** the current user is Viewer, **When** they press Ctrl+Z or Ctrl+Shift+Z, **Then** nothing happens.
3. **Given** the current user is Editor or Owner, **When** the board is displayed, **Then** the Undo and Redo buttons are shown.
4. **Given** the role of the current user is not known yet (loading or failed), **When** the board is displayed, **Then** the Undo and Redo buttons are hidden.

### Edge Cases

- Drag ended without movement (below the drag threshold) -> no history entry.
- Undo of a deleted item re-creates it with a new id -> later history entries that referred to the old id now refer to the new one.
- Undo / redo of an item deleted meanwhile by another user (404) -> one error toast, the entry is dropped.
- Typing in the edit panel or comment composer -> shortcuts are not intercepted.
- Changing board -> both stacks emptied.
- More than 50 actions -> the oldest entry is dropped.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST record, per board and for the current user only, the actions create, move, text edit and delete of an item.
- **FR-002**: The system MUST undo an action by applying its inverse through the existing item operations (no new server operation).
- **FR-003**: The system MUST record one drag gesture as one move action from the start position to the end position.
- **FR-004**: The system MUST keep at most 50 undoable actions; a new action MUST clear the redo stack; switching board MUST clear both stacks.
- **FR-005**: The toolbar MUST offer Undo and Redo buttons, each disabled when its stack is empty, with translated tooltips (fr, en, es).
- **FR-006**: Ctrl/Cmd+Z MUST undo; Ctrl/Cmd+Shift+Z and Ctrl+Y MUST redo, except when the focus is in a text field.
- **FR-007**: A failed undo or redo MUST show one error toast and remove the action from the history.
- **FR-008**: A Viewer MUST have neither the buttons nor the shortcuts; buttons are hidden while the role is unknown.

### Key Entities

- **History entry**: one user action on an item with what is needed to invert it (kind, item id, previous and next position or text, or the full item for create/delete).
- **Board member role**: role of the current user on the board (Viewer, Editor, Owner), served by the existing board members list.

## Success Criteria *(mandatory)*

- **SC-001**: An editor can revert any of their last 50 actions on a board in one click or one shortcut each.
- **SC-002**: A drag gesture is reverted in exactly one undo step.
- **SC-003**: A viewer never sees an undo or redo control.

## Clarifications

### Session 2026-10-06

- Q: Where does the current user's board role come from? → A: The existing board members list (GET members), matched on the current user id; no back change.
- Q: Shortcuts while the focus is in a text field? → A: Not intercepted; the field's native undo applies.
- Q: What happens when an undo/redo request fails (404)? → A: One error toast and the action leaves the stack.
- Q: Hypotheses and stories for this run? → A: Validated: tracked actions create / move / text edit / delete, cap 50, redo cleared on new action, stacks cleared on board change, Ctrl+Y also redoes; US1, US2, US3 retained.
- Q: The existing toolbar icon buttons cannot be disabled; how are empty-stack buttons shown? → A: Disabled library buttons with an icon and an accessible name, same toolbar column (asked after the first draft, while sketching tasks).

## Assumptions

- Out of scope: history shared between users, undo of comments, undo of resize / color changes (not exposed by the board today).
- While the role is loading or the members request failed, undo / redo are hidden (safe default; intent silent).
- A re-created item gets a new id from the server; the history remaps the old id to the new one.
- The error toast is the existing one shown by the item service on a failed write; no new message.
- No design: the buttons follow the existing toolbar icon buttons (icons ri-arrow-go-back-line / ri-arrow-go-forward-line).
