# Feature Specification: Comments on every board item, with an unresolved-count badge

**Feature Branch**: `001-comments-all-items-m5-r1`
**Created**: 2026-10-07
**Input**: "Pouvoir commenter aussi les formes et les textes (pas seulement les post-it), et voir sur chaque élément un badge avec le nombre de commentaires non résolus."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comment shapes and texts (Priority: P1)

A board member selects a shape or a text item and opens its comment thread exactly as they already do for a sticky note. The comment service already accepts comments on any item type, so only the board screen withholds the action today.

**Why this priority**: It is the first half of the request and unlocks comments on every item with no server change.

**Independent Test**: Select a shape (then a text) with the select tool: the Comments toolbar button is offered, and clicking it opens the comments panel for that item.

**Acceptance Scenarios**:

1. **Given** a board with a shape, **When** the member selects the shape with the select tool, **Then** the Comments button is shown in the toolbar.
2. **Given** a selected text item, **When** the member clicks Comments, **Then** the comments panel opens for that text item.
3. **Given** a selected sticky note, **When** the member clicks Comments, **Then** the panel opens as before (no regression).
4. **Given** no item is selected, **When** the toolbar renders, **Then** the Comments button is not shown.

---

### User Story 2 - Unresolved comment counts per board (server) (Priority: P1)

The server exposes, for one board, the number of unresolved comments of every item that has at least one, in a single call, under the same access rules as reading an item's comments.

**Why this priority**: The badge needs the counts of every item without one request per item.

**Independent Test**: Call the counts endpoint on a board where one item has two unresolved and one resolved comment: the response lists that item with 2 and omits items with none.

**Acceptance Scenarios**:

1. **Given** a board where item A has 2 unresolved and 1 resolved comment and item B has only resolved comments, **When** a member requests the board counts, **Then** the response is 200 with exactly one entry `{ itemId: A, unresolved: 2 }`.
2. **Given** a board with no unresolved comment, **When** a member requests the counts, **Then** the response is 204 No Content.
3. **Given** a user who is not a member of the board, **When** they request the counts, **Then** the response is 403.
4. **Given** a request without an identified user, **When** it reaches the endpoint, **Then** the response is 401.
5. **Given** an unknown board, **When** a member requests the counts, **Then** the response is 404.

---

### User Story 3 - Front data access to the counts (Priority: P2)

The board screen can fetch the unresolved counts of the current board through the shared HTTP layer and cache them per board.

**Why this priority**: It is the data layer the badge reads; it is deliverable and testable on its own against the contract.

**Independent Test**: With the HTTP client mocked to return the contract payload, the counts query for board 1 resolves to a list of `{ itemId, unresolved }`; a 204 resolves to an empty list; a failure shows the standard error and resolves to an empty list.

**Acceptance Scenarios**:

1. **Given** the server returns `[{ itemId: 3, unresolved: 2 }]`, **When** the counts are fetched for the board, **Then** the result is one count of 2 for item 3.
2. **Given** the server answers 204, **When** the counts are fetched, **Then** the result is an empty list.
3. **Given** the server fails, **When** the counts are fetched, **Then** the error is displayed once and the result is an empty list.

---

### User Story 4 - Unresolved-count badge on every item (Priority: P2)

Every item on the canvas (sticky note, shape, text) that has unresolved comments shows a small pill at its top-right corner with the count; items with none show nothing.

**Why this priority**: It is the visible half of the request.

**Independent Test**: With counts `{ item 1: 3, item 2: 12 }` served, item 1 shows "3", item 2 shows "9+", item 3 shows no badge; the badge announces "3 unresolved comments" in the active language.

**Acceptance Scenarios**:

1. **Given** item 1 has 3 unresolved comments, **When** the board renders, **Then** item 1 shows a badge reading 3 with the accessible label "3 commentaires non résolus" (fr).
2. **Given** item 2 has 12 unresolved comments, **When** the board renders, **Then** its badge reads 9+.
3. **Given** item 3 has no unresolved comment, **When** the board renders, **Then** no badge is shown on item 3.
4. **Given** a shape and a text with unresolved comments, **When** the board renders, **Then** both show the badge like a sticky note.

---

### User Story 5 - Badge refresh after comment changes (Priority: P3)

After a member adds, resolves (or reopens) or deletes a comment, the badges reflect the new counts without reloading the page.

**Why this priority**: Without it the badge is stale until the next page load.

**Independent Test**: After a successful add, resolve or delete mutation, the board counts query is invalidated and refetched.

**Acceptance Scenarios**:

1. **Given** item 1 shows 2, **When** the member adds a comment on it, **Then** the counts are refetched and the badge reads 3.
2. **Given** item 1 shows 1, **When** the member resolves that comment, **Then** the counts are refetched and the badge disappears.
3. **Given** item 1 shows 2, **When** the member deletes an unresolved comment, **Then** the counts are refetched and the badge reads 1.

### Edge Cases

- Count above 9 -> the badge reads "9+"; the accessible label keeps the exact count.
- Count of 0 (item absent from the response) -> no badge.
- Counts request fails -> no badge, standard error display, the board stays usable.
- Item deleted while it had comments -> it disappears with its badge.
- Connectors -> out of scope: they cannot be commented and carry no badge.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board MUST offer the Comments action for any selected item (sticky note, shape, text) when the select tool is active.
- **FR-002**: The server MUST return, per board, the unresolved comment count of every item that has at least one, in a single response, with the same access rules as reading comments.
- **FR-003**: The server MUST answer 204 when no item of the board has an unresolved comment.
- **FR-004**: The board MUST show on each item with unresolved comments a badge with the count, capped at "9+", and none at 0.
- **FR-005**: The badge MUST expose an accessible label with the exact count, in French, English and Spanish.
- **FR-006**: The counts MUST be refreshed after a comment is added, updated (resolved / reopened / edited) or deleted.
- **FR-007**: The board MUST NOT request comments item by item to compute the badges.

### Key Entities

- **Unresolved comment count**: for one board item, the number of its comments not marked resolved (item id, count). Derived from existing comments; nothing new is stored.

## Success Criteria *(mandatory)*

- **SC-001**: A member can open the comment thread of a shape or a text in the same number of clicks as for a sticky note.
- **SC-002**: Loading a board fetches all badge counts in one request, whatever the number of items.
- **SC-003**: After adding, resolving or deleting a comment, the badge shows the new count without a page reload.

## Clarifications

### Session 2026-10-07

- Q: Where do the badge counts come from? → A: A new server endpoint GET /api/v1/boards/{boardId}/comments/counts returning `[{ itemId, unresolved }]`, only items with at least one unresolved comment, same rights as GET comments.
- Q: Library Badge (no primary tone) or a custom pill? → A: Custom pill at the item's top-right, primary colour, white text, "9+" above 9, hidden at 0; deviation from septeo-library-first accepted.
- Q: Assumptions and stories retained? → A: Shapes/texts need no server change; refresh by invalidation after add/resolve/delete; fr/en/es labels; connectors out of scope; all five stories retained.

## Assumptions

- The comment API already accepts comments on any item type (verified on the server code); User Story 1 is front-only.
- Viewers, who can already read and post comments, also see the badges.
- An empty result is 204 No Content (server convention for an empty GET).
- Connector comments are out of scope.
