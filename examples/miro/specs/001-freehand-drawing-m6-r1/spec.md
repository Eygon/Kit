# Feature Specification: Freehand drawing on the board

**Feature Branch**: `001-freehand-drawing-m6-r1`
**Created**: 2026-10-07
**Input**: "Pouvoir dessiner à main levée sur le tableau (crayon, couleur, épaisseur), et que les tracés soient enregistrés comme les autres éléments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The board API stores freehand strokes (Priority: P1)

A freehand stroke is a new kind of board item. The API accepts it like the other items, keeps its points and stroke width, returns them when the board is loaded, and refuses malformed strokes.

**Why this priority**: Without storage, a drawn stroke disappears on reload; every front story depends on this contract.

**Independent Test**: Through the API only: create a Freehand item with points and a stroke width, reload the board items, and get the same points back; send invalid payloads and get 400.

**Acceptance Scenarios**:

1. **Given** an editor of a board, **When** they create an item of type Freehand with 3 points and stroke width 4, **Then** the API answers 201 and the item comes back with the same points and stroke width when the board items are listed.
2. **Given** an editor, **When** they create a Freehand item without points, **Then** the API answers 400.
3. **Given** an editor, **When** they create a StickyNote, Shape or Text item with points or a stroke width, **Then** the API answers 400.
4. **Given** an editor, **When** they create a Freehand item with 2001 points, **Then** the API answers 400.
5. **Given** an editor, **When** they create a Freehand item with a stroke width other than 2, 4 or 8, **Then** the API answers 400.
6. **Given** an existing Freehand item, **When** an editor patches its position, points or stroke width with valid values, **Then** the API answers 200 with the new values; **When** they patch points on a non-Freehand item, **Then** the API answers 400.
7. **Given** existing StickyNote, Shape and Text items, **When** the board items are listed, **Then** they come back unchanged, with no points and no stroke width.

### User Story 2 - Saved strokes are displayed on the board (Priority: P2)

When a board contains freehand strokes, each one is drawn at its place with its colour and thickness, with rounded line ends, and behaves like any other item: it can be selected, moved and deleted, and a deleted stroke comes back intact on undo.

**Why this priority**: Displaying stored strokes is the reading half of the feature and is testable as soon as the API serves them.

**Independent Test**: With a board whose items include a Freehand item (served by the API or a test fixture), open the board: the stroke is visible, selectable, movable and deletable; undo after delete restores it with its points.

**Acceptance Scenarios**:

1. **Given** a board item of type Freehand with points, colour and stroke width, **When** the board is displayed, **Then** a line through those points is drawn inside the item box with that colour, that thickness and rounded ends.
2. **Given** a displayed stroke, **When** an editor clicks it then drags it, **Then** it is selected and moved like a sticky note, and the move is saved.
3. **Given** a selected stroke, **When** an editor deletes it then undoes, **Then** the stroke comes back with the same points, colour and thickness.
4. **Given** the existing sticky notes, shapes and texts, **When** the board is displayed, **Then** they render exactly as before.

### User Story 3 - Draw a stroke with the Pencil (Priority: P3)

An editor picks the Pencil in the board toolbar, presses on the canvas and drags: the line follows the pointer while drawing. On release, the stroke is saved as a board item and can be undone and redone like any other creation.

**Why this priority**: It is the creation path users asked for; it builds on the stored and displayed item.

**Independent Test**: As an editor, choose the Pencil, press-drag-release on the canvas: a stroke appears during the drag, is saved on release, and undo removes it.

**Acceptance Scenarios**:

1. **Given** an editor on a board, **When** they look at the toolbar, **Then** a Pencil tool is offered with a translated label.
2. **Given** the Pencil is active, **When** the editor presses on the canvas and drags, **Then** a line follows the pointer during the drag and the board does not pan.
3. **Given** the editor is drawing, **When** they release the pointer, **Then** one Freehand item is created with the default colour and width, its box fitting the stroke, and the stroke stays where it was drawn.
4. **Given** a stroke was just created, **When** the editor undoes, **Then** the stroke is removed; **When** they redo, **Then** it comes back.
5. **Given** a Viewer, or a user whose role is not known yet, **When** they look at the toolbar, **Then** no Pencil is offered.
6. **Given** a very long drag, **When** the editor releases, **Then** the saved stroke keeps a point only every 2 px or more and never exceeds 2000 points.

### User Story 4 - Choose stroke colour and thickness (Priority: P4)

While the Pencil is active, the editor chooses the stroke colour among the sticky-note colours and the thickness among thin, medium and thick; the next strokes use that choice.

**Why this priority**: Customisation of the stroke; the Pencil already works with defaults without it.

**Independent Test**: As an editor, activate the Pencil, choose a colour and a thickness, draw: the saved stroke carries the chosen colour and width.

**Acceptance Scenarios**:

1. **Given** the Pencil is active, **When** the editor looks at the toolbar, **Then** the three sticky-note colours and the three thicknesses (2, 4, 8 px) are offered with translated labels, the current choice marked as active.
2. **Given** the editor chose the green colour and the thick width, **When** they draw a stroke, **Then** the created item has colour `#a7f3d0` and stroke width 8.
3. **Given** another tool than the Pencil is active, **When** the editor looks at the toolbar, **Then** the colour and thickness choices are not shown.
4. **Given** a Viewer, **When** they look at the toolbar, **Then** no colour or thickness choice is shown.

### Edge Cases

- A click without movement with the Pencil (a single point) -> a stroke of one point is created, with a box of positive size (half the stroke width around the point).
- A perfectly horizontal or vertical stroke -> the box keeps a positive width and height thanks to the stroke-width padding, so the API does not refuse it.
- More than 2000 kept points during a drag -> the stroke stops collecting points at 2000; the saved stroke has at most 2000 points.
- Stroke creation fails on the server -> nothing is added to the board and the undo history is not changed.
- Out of scope: eraser, editing the points of an existing stroke, curve smoothing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support a Freehand board item type next to StickyNote, Shape and Text.
- **FR-002**: The system MUST store, for a Freehand item, its ordered list of points (relative to the item origin) and its stroke width, and return them with the item.
- **FR-003**: The system MUST refuse a Freehand item without points, with more than 2000 points, or with a stroke width other than 2, 4 or 8, and refuse points or a stroke width on any other item type.
- **FR-004**: The board MUST draw each Freehand item as a line through its points, with its colour, its stroke width and rounded ends.
- **FR-005**: Freehand items MUST be selectable, movable and deletable like the other items.
- **FR-006**: Editors and owners MUST be offered a Pencil tool; pressing and dragging on the canvas with it MUST show the line while drawing and create a Freehand item on release.
- **FR-007**: The created stroke MUST keep a point only when it is at least 2 px away from the previous kept point, and MUST hold at most 2000 points.
- **FR-008**: The creation of a stroke MUST be an undoable and redoable action of the existing board history.
- **FR-009**: Editors MUST be able to choose the stroke colour among the sticky-note colours and the thickness among 2, 4 and 8 px while the Pencil is active.
- **FR-010**: Viewers, and users whose role is unknown, MUST NOT be offered the Pencil nor the colour and thickness choices.
- **FR-011**: All new labels MUST be available in French, English and Spanish.

### Key Entities

- **Freehand stroke**: a board item of type Freehand; it has the common item attributes (position, size, colour, stacking order) plus an ordered list of points (x, y relative to the item origin, at most 2000) and a stroke width (2, 4 or 8).

## Success Criteria *(mandatory)*

- **SC-001**: A stroke drawn by an editor is still displayed identically after reloading the board.
- **SC-002**: Undo right after drawing removes the stroke, redo restores it, in one action each.
- **SC-003**: No stroke saved through the Pencil exceeds 2000 points, whatever the drag length.
- **SC-004**: A Viewer never sees the Pencil, the colours or the thicknesses.

## Clarifications

### Session 2026-10-07

- Q: Which colours does the pencil offer, given the UI has no sticky-note palette (only the default #fde68a; the seed uses #fde68a, #a7f3d0, #fecaca)? → A: The three sticky-note colours of the seed, default #fde68a.
- Q: How is a stroke stored and validated by the API? → A: Freehand joins the existing item type enum; points are kept as a nullable JSON text column and the stroke width as a nullable integer, both only for Freehand; 400 when points are missing for Freehand, provided for another type, beyond 2000, or when the width is not 2, 4 or 8.
- Q: The semantic-elements standard forbids clickable divs, while drawing needs pointer handlers on the canvas surface. → A: Drawing stays on the existing canvas surface (deviation accepted for the drawing surface only); the Pencil, colour and thickness choices are native library controls.
- Q: Assumptions and stories for this run (box padding, 2 px simplification and 2000 cap, Pencil stays active after a stroke, history integration, Viewer without tool, no point editing from the front)? → A: Assumptions validated; the four stories are kept.

## Assumptions

- Points are relative to the item origin; the item box is the bounding box of the points padded by half the stroke width, so its size is always positive.
- The Pencil stays active after a stroke, so several strokes can be drawn in a row.
- The front never edits the points of a stroke; moving a stroke only changes its position.
- The default stroke is colour #fde68a and width 4 until the editor chooses otherwise.
- Pan, zoom and comments keep their current behaviour; strokes can carry comments like any item.
