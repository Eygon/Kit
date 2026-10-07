# Feature Specification: Board connectors between items

**Feature Branch**: `001-board-connectors-m4-r1`
**Created**: 2026-10-06
**Input**: "Pouvoir relier deux éléments du tableau par un connecteur (flèche ou trait), qui suit les éléments quand on les déplace."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connector API on the board service (Priority: P1)

The board service stores connectors between two items of the same board and lets members list, create, restyle and delete them, with the same access rules as items. Deleting an item deletes its connectors.

**Why this priority**: every front story reads or writes connectors through this service.

**Independent Test**: API tests against the running service: list, create, restyle and delete a connector on a seeded board, with an Editor, a Viewer and an unidentified caller.

**Acceptance Scenarios**:

1. **Given** a board with no connector, **When** a member lists its connectors, **Then** the service answers 204 No Content.
2. **Given** two items A and B of board 1, **When** an Editor creates a connector from A to B with style Arrow, **Then** the service answers 201 with the connector (id, board, from, to, style, creator = caller) and a Location header, and the next list returns it (200).
3. **Given** an item that belongs to another board, or the same item as source and target, **When** an Editor creates a connector, **Then** the service answers 400 and nothing is stored.
4. **Given** a Viewer of the board, **When** they create, restyle or delete a connector, **Then** the service answers 403; **When** they list connectors, **Then** they get them.
5. **Given** an existing Arrow connector, **When** an Editor patches its style to Line, **Then** the service answers 200 with style Line; **When** the patch carries no style, **Then** 400.
6. **Given** an existing connector, **When** an Editor deletes it, **Then** 204 and it is no longer listed; an unknown connector id answers 404.
7. **Given** a connector from A to B, **When** item A is deleted, **Then** the connector is no longer listed.

---

### User Story 2 - Load the board's connectors (Priority: P1)

When a board opens, the front loads the board's connectors from the service, as described by the contract, so that the board can draw them. A board without connectors loads an empty list; a failed load does not break the board.

**Why this priority**: drawing, creating and deleting connectors all start from the loaded list.

**Independent Test**: call the board connectors loading with a mocked HTTP layer: a 200 list is mapped to connectors (id, board, source, target, style), a 204 gives an empty list, a failure gives an empty list and one error notice.

**Acceptance Scenarios**:

1. **Given** the service returns two connectors for board 1, **When** the board's connectors are loaded, **Then** two connectors are available with their source item, target item and style.
2. **Given** the service answers 204, **When** the connectors are loaded, **Then** the list is empty and no error is shown.
3. **Given** the service fails, **When** the connectors are loaded, **Then** the list is empty and the error is shown once.

---

### User Story 3 - See connectors on the board (Priority: P1)

A member opening a board sees every connector drawn as a straight 2px neutral line from the centre of its source item to the centre of its target item, with an arrow head at the target for Arrow connectors, drawn under the items. Viewers see them too.

**Why this priority**: displaying connectors is the first visible value and the base of every other front story.

**Independent Test**: render the board canvas with two items and one connector: a line joins both centres, with an arrow head for Arrow and none for Line.

**Acceptance Scenarios**:

1. **Given** items A (x 0, y 0, 100x100) and B (x 300, y 0, 100x100) and an Arrow connector A -> B, **When** the board is displayed, **Then** a line runs from (50, 50) to (350, 50) with an arrow head at B's end.
2. **Given** a Line connector, **When** the board is displayed, **Then** the line has no arrow head.
3. **Given** a connector whose source or target item is not in the board's item list, **When** the board is displayed, **Then** that connector is not drawn.
4. **Given** an Arrow connector A -> B, **When** item A is moved and dropped at a new position, **Then** the line starts from A's new centre.
5. **Given** a Viewer, **When** the board is displayed, **Then** connectors are visible.

---

### User Story 4 - Connectors follow items while dragging (Priority: P2)

While a user drags an item, every connector attached to it follows the item continuously, not only once the item is dropped.

**Why this priority**: the need explicitly asks that connectors follow moved items; live following makes the link readable during the move.

**Independent Test**: render the canvas with a connector A -> B, start dragging A by 100 px on screen at zoom 1 without releasing: the line's start is already at A's dragged centre.

**Acceptance Scenarios**:

1. **Given** a connector A -> B at zoom 1, **When** the user drags A by (+100, +40) px without releasing, **Then** the line starts at A's centre shifted by (+100, +40) while B's end does not move.
2. **Given** the same drag at zoom 2, **When** the pointer moves by (+100, +40) px, **Then** the line start moves by (+50, +20) world units.
3. **Given** a drag in progress, **When** the user releases the pointer, **Then** the line ends follow the item's saved position like the item itself.

---

### User Story 5 - Connector tool to link two items (Priority: P1)

An Editor picks the new "Connector" tool in the toolbar, clicks a source item then a target item, and a connector (Arrow) is created between them. The tool is absent for Viewers.

**Why this priority**: creating connectors is the core of the need.

**Independent Test**: on the board page with two items, choose the Connector tool, click item 1 then item 2: a creation request is sent for 1 -> 2 with style Arrow and the tool returns to Select.

**Acceptance Scenarios**:

1. **Given** an Editor on a board with items 1 and 2, **When** they choose the Connector tool and click item 1 then item 2, **Then** a connector 1 -> 2 with style Arrow is created and the tool returns to Select.
2. **Given** the Connector tool with item 1 picked as source, **When** the user clicks item 1 again, **Then** no connector is created and item 1 stays the pending source.
3. **Given** the Connector tool with a pending source, **When** the user clicks the empty background, **Then** the pending source is cleared, nothing is created and the tool returns to Select.
4. **Given** a Viewer, **When** the toolbar is displayed, **Then** the Connector tool is absent.
5. **Given** any of fr / en / es, **When** the toolbar is displayed, **Then** the Connector tool's label is translated.

---

### User Story 6 - Select a connector (Priority: P2)

A user clicks a connector to select it: its line gets thicker and in the primary colour. Selecting a connector and selecting an item are mutually exclusive.

**Why this priority**: deleting and restyling a connector both act on the selected connector.

**Independent Test**: on the board canvas with one connector, click its line: the line is shown selected and the item selection is cleared.

**Acceptance Scenarios**:

1. **Given** a displayed connector, **When** the user clicks its line, **Then** it is shown selected (thicker, primary colour) and any selected item is deselected.
2. **Given** a selected connector, **When** the user selects an item or clicks the background, **Then** the connector is no longer selected.
3. **Given** a Viewer, **When** they click a connector, **Then** it is shown selected.

---

### User Story 7 - Delete a connector (Priority: P2)

An Editor deletes the selected connector with the existing Delete button or the Delete key.

**Why this priority**: without deletion, a wrong connector cannot be fixed.

**Independent Test**: on the board page with one selected connector, press Delete: a delete request is sent for that connector and the selection is cleared.

**Acceptance Scenarios**:

1. **Given** an Editor with a selected connector, **When** they click the Delete button or press the Delete key, **Then** the connector is deleted and no longer drawn.
2. **Given** an Editor with a selected item and no selected connector, **When** they press the Delete key, **Then** the item is deleted, like with the Delete button.
3. **Given** a Viewer with a selected connector, **When** they press the Delete key, **Then** nothing is deleted.
4. **Given** the focus in a text field, **When** the user presses the Delete key, **Then** nothing is deleted.

---

### User Story 8 - Switch a connector between arrow and line (Priority: P3)

An Editor who selected a connector switches its style between Arrow and Line with a toolbar button.

**Why this priority**: the need names both arrows and lines; creation gives an Arrow, this story makes Line reachable.

**Independent Test**: on the board page with one selected Arrow connector, click the style button: an update request sets the style to Line.

**Acceptance Scenarios**:

1. **Given** an Editor with a selected Arrow connector, **When** they click the style button, **Then** the connector's style becomes Line and its arrow head disappears.
2. **Given** a selected Line connector, **When** the Editor clicks the style button, **Then** the style becomes Arrow.
3. **Given** no selected connector, or a Viewer, **When** the toolbar is displayed, **Then** the style button is absent.
4. **Given** any of fr / en / es, **When** the style button is displayed, **Then** its label is translated.

### Edge Cases

- Source and target are the same item -> no creation on the front; 400 from the service.
- An item of another board is used as source or target -> 400.
- The item at one end of a connector is deleted -> the connector disappears (server cascade; front skips connectors whose end is missing).
- Several connectors between the same two items -> allowed.
- Board without connectors -> 204, nothing drawn, no error shown.
- Connector list request fails -> the board and its items still display, without connectors.
- Out of scope: curved connectors, anchoring on item edges, labels on connectors, undo/redo of connectors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store connectors linking a source item and a target item of the same board, with a style Arrow or Line and the creating user.
- **FR-002**: The system MUST let any board member list the board's connectors, and only members with write access create, restyle or delete them (Viewer -> 403).
- **FR-003**: The system MUST reject a connector whose source and target are identical or do not both belong to the board (400).
- **FR-004**: The system MUST delete an item's connectors when the item is deleted.
- **FR-005**: The board MUST draw each connector as a straight line from the centre of its source item to the centre of its target item, under the items, with an arrow head for Arrow.
- **FR-006**: A connector MUST follow its items while they are dragged and after they are dropped.
- **FR-007**: An Editor MUST be able to create a connector with a Connector tool by clicking a source then a target item; the tool MUST be absent for Viewers.
- **FR-008**: A user MUST be able to select a connector by clicking it; an Editor MUST be able to delete the selected connector with the Delete button or the Delete key.
- **FR-009**: An Editor MUST be able to switch a selected connector between Arrow and Line.
- **FR-010**: Every new label MUST exist in fr, en and es.

### Key Entities

- **Connector**: a link on a board between a source item and a target item; attributes: identifier, board, source item, target item, style (Arrow or Line), creator.

## Success Criteria *(mandatory)*

- **SC-001**: An Editor links two items in 3 clicks (tool, source, target).
- **SC-002**: While an item is dragged, its connectors stay attached to it at every displayed frame.
- **SC-003**: After an item is deleted, none of its connectors remains visible after the board refreshes.
- **SC-004**: A Viewer sees every connector and has no way to create, restyle or delete one.

## Clarifications

### Session 2026-10-06

- Q: How does the user choose Arrow vs Line? → A: connectors are created as Arrow; a toolbar button switches the selected connector between Arrow and Line (US8).
- Q: Does a connector follow the item live during the drag or only on drop? → A: live during the drag (US4), and after the drop.
- Q: What does the Delete key delete? → A: the same as the Delete button: the selected connector, or the selected item when no connector is selected.
- Q: Hypotheses and stories retained for this run? → A: hypotheses below validated; US1 to US6 retained; back and front in distinct stories, contract written in prep. While sizing the tasks, the display story was split into US2 (load) and US3 (draw) to stay within the per-story file cap; then, at the lint, selection and deletion were split into US6 (select) and US7 (delete) for the same reason; stories are renumbered US1 to US8, scope unchanged.
- Q (late, before tasks): the accessibility standard requires native controls, but a connector is selected by clicking its line → A: accepted deviation, the line itself is clickable (like canvas items today).

## Assumptions

- Clicking the pending source again is ignored; clicking the background cancels the connector tool and returns to Select.
- The Connector tool returns to Select after one connector is created, like the item tools.
- Duplicate connectors between the same pair of items are allowed.
- Selecting a connector clears the item selection and vice versa.
- A Viewer may select a connector but cannot delete or restyle it.
- Connector list order is creation order (identifier).
- Visual: line 2px in the neutral palette colour, selected line thicker in the primary colour; no design file.
