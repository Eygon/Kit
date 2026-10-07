# Feature Specification: Board minimap and grouped zoom controls

**Feature Branch**: `001-minimap-zoom-dock-m7-r1`
**Created**: 2026-10-07
**Input**: "Ajouter une mini-carte et regrouper les contrôles de zoom comme sur le design https://claude.ai/design/p/b41e9c07-2d6a-4f3e-8c55-91a0d7e4f2b3?file=Navigation.html"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Grouped zoom bar with "Fit all" (Priority: P1)

A board user finds the zoom controls grouped in a navigation dock at the bottom-right of the canvas, as in the design: zoom out, the current zoom percentage, zoom in and a "Fit all" button. "Fit all" adjusts zoom and position so that every item of the board is visible. The existing zoom behaviour (steps, limits, reset on the percentage) is kept: there is still one single view state.

**Why this priority**: it reworks an existing control that every user touches and gives the dock the minimap will join.

**Independent Test**: open a board with items spread beyond the visible area, click "Fit all": all items become visible; zoom in/out still change the percentage by one step; clicking the percentage resets the view.

**Acceptance Scenarios**:

1. **Given** a board at 100 %, **When** the user clicks "Zoom in", **Then** the world is scaled to 125 % and the bar shows `125 %`.
2. **Given** a board whose items do not all fit in the visible area, **When** the user clicks "Fit all", **Then** the view is zoomed and moved so the bounding box of all items is centered and entirely visible.
3. **Given** items so far apart that fitting would need a zoom below the minimum (or above the maximum), **When** the user clicks "Fit all", **Then** the zoom stops at the existing minimum (or maximum) and the items' bounding box is centered.
4. **Given** a zoomed and panned view, **When** the user clicks the percentage, **Then** the view returns to 100 % at the origin (existing behaviour).
5. **Given** the board page, **When** it renders, **Then** the zoom bar sits in the bottom-right dock and its rendering conforms to design.md §C1 and §C3, to the pixel (dimensions, tokens, typography, states, icons).
6. **Given** the UI language is fr, en or es, **When** the bar renders, **Then** every button has a translated accessible name (zoom out, zoom in, Fit all, reset).

### User Story 2 - Minimap (Priority: P2)

Above the zoom bar, a minimap shows an overview of all items of the board and a rectangle for the part currently visible. Clicking a point of the minimap centers the main view on that point. The minimap follows the view when it is panned or zoomed and follows an item while it is dragged.

**Why this priority**: it adds a new navigation aid on top of the dock delivered by US1.

**Independent Test**: on a board with several items, the minimap shows one shape per item and a viewport rectangle; panning the canvas moves the rectangle; clicking a corner of the minimap moves the view there.

**Acceptance Scenarios**:

1. **Given** a board with items, **When** the page renders, **Then** the minimap shows one shape per item, scaled to fit the minimap, and a rectangle for the visible area.
2. **Given** the minimap, **When** the user pans or zooms the canvas, **Then** the viewport rectangle moves or resizes accordingly.
3. **Given** the minimap, **When** the user drags an item on the canvas, **Then** its shape in the minimap follows the item during the drag.
4. **Given** the minimap, **When** the user clicks a point of it, **Then** the main view is centered on the corresponding board point and the zoom does not change.
5. **Given** a board without items, **When** the page renders, **Then** the minimap shows its empty frame and nothing fails.
6. **Given** the UI language is fr, en or es, **When** the minimap renders, **Then** it is a keyboard-reachable control with a translated accessible name.
7. **Given** the board page, **When** it renders, **Then** the minimap sits above the zoom bar in the dock and conforms to design.md §C1 and §C2, to the pixel.

### Edge Cases

- Board without items -> "Fit all" does nothing; minimap shows an empty frame.
- Visible area partly outside the items' bounding box -> the viewport rectangle is clipped by the minimap frame.
- A click inside the dock (minimap or zoom bar) -> never creates an item nor clears the selection on the canvas.
- Fit would exceed the zoom limits -> zoom clamped to the existing minimum/maximum.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST group the zoom controls and the minimap in one dock at the bottom-right of the canvas (variant a of the design).
- **FR-002**: The zoom bar MUST offer zoom out, the current percentage (format `<n> %`), zoom in and "Fit all", in this order.
- **FR-003**: "Fit all" MUST fit the bounding box of all items in the visible area, centered, within the existing zoom limits.
- **FR-004**: Zoom in, zoom out, reset, fit and minimap navigation MUST act on the single existing view state.
- **FR-005**: The minimap MUST show every item and the visible area, and update on pan, zoom and item drag.
- **FR-006**: Clicking the minimap MUST center the view on the clicked point without changing the zoom.
- **FR-007**: All new labels MUST exist in fr, en and es.
- **FR-008**: Rendering MUST conform to design.md §C1-§C3.

### Key Entities

- **View**: the visible part of the board (offset and zoom), already existing.
- **Items' bounding box**: smallest rectangle containing every item of the board, derived (not stored).

## Success Criteria *(mandatory)*

- **SC-001**: From any view, one click on "Fit all" makes every item visible (within zoom limits).
- **SC-002**: One click on the minimap brings the clicked area to the center of the screen.
- **SC-003**: The dock matches design.md to the pixel at review.

## Clarifications

### Session 2026-10-07

- Q: Variant and scope? → A: Variant a only (minimap and zoom grouped bottom-right); variant b, collapsible minimap and zoom keyboard shortcuts out of scope.
- Q: Zoom buttons: lib IconButton (40x40) cannot reach the 28x28 design? → A: Native buttons styled to the pixel (design.md §5 D6).
- Q: Design values without project target (`--space-7`, 14.5px, shadows, Fit icon)? → A: 4px project spacing; 14px token as accepted gap; Tailwind shadow-xs/shadow-sm; `ri-fullscreen-line` (design.md §5 D1, D2, D5, D7).
- Q: User stories for this run? → A: US1 grouped zoom bar with Fit all, US2 minimap; reuse the existing zoom logic (no second zoom state).
- Q: Colors absent from the lib (fg-2, grey-30) and the percentage reset? → A: nearest existing tokens neutral-60 / neutral-10; the percentage keeps resetting the view (design.md §5 D3, D4, D8).
- Q: Clickable SVG versus the semantic-elements standard? → A: The minimap is a native button wrapping the SVG, with a translated accessible name (design.md §5 D9).
- Q: Assumptions (safety net)? → A: Validated: minimap world = items' bounding box; empty board = empty frame and no-op fit; fit without margin, clamped; click centers without zoom change; minimap follows drags.

## Assumptions

- Minimap world = bounding box of all items; the viewport rectangle may be clipped.
- "Fit all" adds no margin around the bounding box.
- Out of scope: variant b, collapsible minimap, zoom keyboard shortcuts.
