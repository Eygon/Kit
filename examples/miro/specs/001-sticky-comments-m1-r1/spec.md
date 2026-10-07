# Feature Specification: Sticky note comments

**Feature Branch**: `001-sticky-comments-m1-r1`
**Created**: 2026-10-06
**Input**: "Commentaires sur les post-it du tableau : panneau latéral conforme au design https://claude.ai/design/p/7d3c2a10-5e8b-4c1f-9a77-3b2e1f0c9d44?file=Commentaires.html, avec l'API back qui va avec."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comment data model (back) (Priority: P1)

The back stores comments attached to a board item: who wrote it, its text, when it was created and last updated, and whether it is resolved.

**Why this priority**: every other story reads or writes this data.

**Independent Test**: build the solution; the database created at startup has a Comments table; the comment mapper unit tests turn an entity into its read DTO with explicit defaults.

**Acceptance Scenarios**:

1. **Given** the API starts on an empty database, **When** the schema is created, **Then** a Comments table exists with Id, BoardItemId, AuthorId, Body (max 2000), CreatedAt, UpdatedAt, IsResolved, linked to BoardItems.
2. **Given** a comment entity, **When** it is mapped to its read DTO, **Then** every field is copied and a null body becomes an empty string.

### User Story 2 - List and post comments (back API) (Priority: P1)

A board member reads the comments of an item in creation order and posts a new comment.

**Why this priority**: the panel cannot show or add anything without it.

**Independent Test**: with the seeded board, `GET /api/v1/boards/1/items/1/comments` as user 1 returns 204, `POST` with a body returns 201 and the next GET returns it.

**Acceptance Scenarios**:

1. **Given** item 1 of board 1 has comments, **When** a member calls GET .../items/1/comments, **Then** 200 with the comments sorted by CreatedAt ascending.
2. **Given** an item without comments, **When** a member calls GET, **Then** 204 No Content.
3. **Given** a member, **When** they POST `{ "body": "  Looks good  " }`, **Then** 201, Location header, the comment has the trimmed body, AuthorId = caller, IsResolved = false, CreatedAt = UpdatedAt = now (UTC).
4. **Given** a body empty after trim or longer than 2000 characters, **When** POST, **Then** 400.
5. **Given** a caller who is not a member of the board, **When** GET or POST, **Then** 403; **Given** an unknown item on the board, **Then** 404; **Given** no X-User-Id, **Then** 401.

### User Story 3 - Edit, resolve and delete comments (back API) (Priority: P2)

The author edits the text of their comment, any member toggles its resolved flag, and the author or the board Owner deletes it.

**Why this priority**: completes the comment lifecycle shown by the design.

**Independent Test**: on a comment posted by user 2 on board 1: PATCH body as user 2 = 200, as user 1 = 403; PATCH isResolved as user 3 = 200; DELETE as user 1 (Owner) = 204.

**Acceptance Scenarios**:

1. **Given** the author, **When** PATCH `{ "body": "new" }`, **Then** 200 with the new body and a refreshed UpdatedAt.
2. **Given** a member who is not the author, **When** PATCH with a body, **Then** 403; **When** PATCH `{ "isResolved": true }` only, **Then** 200.
3. **Given** a PATCH with no field, **When** sent, **Then** 400; **Given** a body empty or > 2000 characters, **Then** 400.
4. **Given** the author or the board Owner, **When** DELETE, **Then** 204; **Given** any other member, **Then** 403.
5. **Given** an unknown comment, item or board, **Then** 404; a non-member gets 403.

### User Story 4 - Comments data access (front) (Priority: P1)

The front can fetch, create, update and delete the comments of an item against the contract, with errors shown once as a toast.

**Why this priority**: the panel stories consume it.

**Independent Test**: service and mapper unit tests with a mocked HTTP client: URLs match contracts/comments.yaml, 204 yields an empty list, a failed write shows the error toast and rethrows.

**Acceptance Scenarios**:

1. **Given** the API answers 200 with comments, **When** the comments of item 1 on board 1 are fetched, **Then** GET `/api/v1/boards/1/items/1/comments` is called and the comments are mapped with defaults.
2. **Given** the API answers 204, **When** fetched, **Then** an empty list.
3. **Given** a failed read, **Then** an error toast and an empty list; **Given** a failed write, **Then** an error toast and the error is rethrown.
4. **Given** a comment date, **When** it is formatted relative to now, **Then** the browser relative format of the current language is returned (seconds, minutes, hours, then days; e.g. "il y a 5 minutes").

### User Story 5 - Comments panel content (front) (Priority: P1)

The comments panel shows, for one board item, its comment count, the comments oldest first, an empty state, a loading state and an error state, and closes from its header.

**Why this priority**: first visible value of the feature; the entry point (US6) only opens it.

**Independent Test**: render the panel for item 1 of board 1 with the comment service mocked: 2 comments -> header shows 2 and both items; no comment -> "Aucun commentaire"; failure -> error banner with retry; close button calls onClose.

**Acceptance Scenarios**:

1. **Given** the item has 2 comments, **When** the panel renders, **Then** the header shows 2 and the comments are listed oldest first with avatar initials, author label ("Utilisateur {id}"), relative time, body and a check mark when resolved.
2. **Given** the item has no comment, **Then** the empty state "Aucun commentaire" is shown; while loading a skeleton is shown; on error an error banner with retry.
3. **Given** the panel is open, **When** the user clicks the close button, **Then** the close callback fires.
4. Rendering conforms to design.md §C2..§C6, pixel exact (dimensions, tokens, typography, states, icons).

### User Story 6 - Open the comments panel of a sticky note (front) (Priority: P1)

In selection mode the user selects a sticky note and clicks the Comments button of the toolbar; the comments panel of that note opens on the right of the board.

**Why this priority**: makes the panel reachable from the board.

**Independent Test**: render the board page with the board hooks and the comment service mocked, select a sticky note, click Comments: the panel for that note is shown; close hides it.

**Acceptance Scenarios**:

1. **Given** a sticky note is selected with the select tool, **When** the user clicks the Comments toolbar button, **Then** the comments panel opens for that note and the button shows its active state.
2. **Given** no item or a non-sticky item is selected, **Then** the Comments button is not offered.
3. **Given** the panel is open, **When** the user closes it, **Then** it disappears and the button is no longer active.
4. Rendering conforms to design.md §C1, pixel exact.

### User Story 7 - Write, edit, delete and resolve comments in the panel (front) (Priority: P2)

From the open panel the user posts a comment, edits or deletes their own comments from the hover actions, and toggles the resolved state of any comment.

**Why this priority**: completes the design interactions on top of the read panel.

**Independent Test**: with the comment service mocked, render the panel: send a comment, edit it, toggle resolved, delete it; each call hits the service and the list refreshes.

**Acceptance Scenarios**:

1. **Given** an empty composer, **Then** Send is disabled; **When** the user types text and clicks Send or presses Ctrl/Cmd+Enter, **Then** the comment is posted trimmed, the field is cleared and the list and count refresh.
2. **Given** a comment by the current user, **When** the user hovers or focuses it, **Then** "Modifier" and "Supprimer" appear; they never appear on other users' comments.
3. **Given** the user clicks Modifier, **When** they change the text and save, **Then** the comment body is updated; cancel restores the original text.
4. **Given** the user clicks Supprimer, **Then** the comment is removed from the list and the count decreases.
5. **Given** any comment, **When** the user toggles "Résolu", **Then** the comment shows the resolved state (check mark, reduced opacity) and the flag is saved.
6. **Given** a write fails, **Then** an error toast is shown and the list reflects the server state.
7. Rendering conforms to design.md §C6..§C8, pixel exact (dimensions, tokens, typography, states, icons).

### Edge Cases

- Body made only of spaces -> Send disabled in the front, 400 in the back.
- Body of 2001 characters -> 400.
- Comment on an item of another board (route mismatch) -> 404.
- Viewer role -> can read, post and resolve (membership only); cannot edit others' text.
- Board Owner deleting another member's comment -> allowed by the API; the front only offers actions to the author.
- Item deleted while the panel is open -> next fetch returns 404, error banner shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist comments per board item with author, body (1-2000 characters after trim), creation and update dates, resolved flag.
- **FR-002**: The API MUST list an item's comments sorted by creation date ascending, 204 when there are none.
- **FR-003**: The API MUST let any board member post a comment and toggle its resolved flag.
- **FR-004**: The API MUST restrict body edits to the author, and deletion to the author or the board Owner.
- **FR-005**: The API MUST answer 401 without identity, 403 for non-members or forbidden actions, 404 for unknown board, item or comment, 400 for invalid payloads.
- **FR-006**: The front MUST open a right side comments panel for the selected sticky note from a toolbar Comments button in selection mode.
- **FR-007**: The panel MUST show the comment count, the list, an empty state, a loading state and an error state.
- **FR-008**: The panel MUST let the user post, edit and delete their own comments, and toggle the resolved flag of any comment.
- **FR-009**: All panel labels MUST exist in French, English and Spanish.
- **FR-010**: The panel MUST render as design.md (variant b, comfortable density).

### Key Entities

- **Comment**: a remark attached to one board item; author identifier, text, creation and update dates, resolved flag.

## Success Criteria *(mandatory)*

- **SC-001**: A member opens the comments of a sticky note in 2 clicks (select, Comments).
- **SC-002**: Every API rule of FR-002..FR-005 is covered by an automated test.
- **SC-003**: The panel matches design.md values for every section C1..C8 at review.

## Clarifications

### Session 2026-10-06

- Q: Design variant and scope? → A: proposition b only, comfortable density, right side; a, c, mentions, notifications, realtime out of scope (0quater).
- Q: Lib vs design gaps? → A: (a) lib + class override when possible; impossible here (no className) so (b) native elements styled to the pixel; 13px -> --font-size-small; --elev-3 -> lib Drawer shadow (0quater).
- Q: Author display name source (no user entity in the back)? → A: derived in the front from authorId with the existing "Utilisateur {id}" label (Q1).
- Q: Design colors whose target is absent from the installed lib? → A: nearest installed token (design.md §5 P1-P6) (Q2).
- Q: Native elements vs septeo-library-first? → A: deviation accepted for the panel, close button, Send button, textarea and count pill (Q3).
- Q: Hypotheses and decomposition (filet)? → A: validated: membership-only read/post/resolve, author-only body edit, author-or-Owner delete, 204 on empty list, any item type in the API, sticky-only entry in the front, seven stories (US4-US7 re-split at tasks time to respect the 8-file cap) (Q4).

## Assumptions

- Identity is the X-User-Id header (existing resolver); the front user is CURRENT_USER_ID.
- No user directory exists: the author label is "Utilisateur {id}".
- Relative time uses the browser Intl relative time formatting in the current language.
- Schema is created by EnsureCreated (no migrations).
