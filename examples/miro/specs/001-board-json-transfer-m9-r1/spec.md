# Feature Specification: Board JSON export and import

**Feature Branch**: `001-board-json-transfer-m9-r1`
**Created**: 2026-10-07
**Input**: "Exporter un tableau en JSON et importer un fichier JSON comme nouveau tableau"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Serve a board as a portable file (Priority: P1)

Any member of a board, viewers included, can obtain the full content of that board as a portable "tableau" file: its name, every item (type, position, size, colour, content, freehand points and stroke width) and every connector with its two ends. Comments and members are not part of the file.

**Why this priority**: the file format is the single source of truth that both export and import rely on.

**Independent Test**: call the export for a seeded board as a viewer and check the returned document (format marker, version 1, name, items, connectors pointing at item keys of the same document).

**Acceptance Scenarios**:

1. **Given** a board with items and connectors, **When** a member (owner, editor or viewer) requests its export, **Then** the response is a document `{ format: "tableau", version: 1, name, items[], connectors[] }` where each item carries a file-local key, its type, position, size, colour, content and, for a freehand item, its points and stroke width.
2. **Given** the exported document, **When** its connectors are read, **Then** each connector's ends reference keys of items present in the same document.
3. **Given** a board the caller is not a member of, **When** the export is requested, **Then** the request is refused (forbidden) and nothing is returned.
4. **Given** a board with comments and several members, **When** it is exported, **Then** the document contains neither comments nor members.

---

### User Story 2 - Create a new board from a file, atomically (Priority: P1)

A signed-in user sends a "tableau" document and gets a brand new board, owned by them, named "<name> (import)", holding copies of every item and every connector. Connectors are re-attached to the newly created items, never to the ids written in the file. Any invalid content rejects the whole import with a clear message and creates nothing.

**Why this priority**: it is the core of the import; the screen only relays it.

**Independent Test**: post a valid document with two items and one connector, then read the new board: two items exist and the connector links the two NEW item ids; post an invalid document and check that no board was created.

**Acceptance Scenarios**:

1. **Given** a valid document named "Retro", **When** the user imports it, **Then** a new board "Retro (import)" is created with the user as owner and is returned.
2. **Given** a document whose connector links file keys 10 and 11, **When** it is imported, **Then** the created connector links the ids of the two items created from keys 10 and 11, not 10 and 11.
3. **Given** a document with an unknown format or version, invalid JSON, more than 2000 items, an unknown item type, a freehand item outside the existing stroke limits, or a connector whose end is not an item of the file, **When** it is imported, **Then** the request is rejected as a bad request with a clear message and no board, item or connector is created.
4. **Given** a request body larger than 1 MB, **When** it is sent to the import, **Then** it is rejected as too large and nothing is created.
5. **Given** a failure while the connectors are being saved, **When** the import runs, **Then** the board and its items are not kept (all or nothing).

---

### User Story 3 - Export button on the board screen (Priority: P2)

On a board screen, every member sees an "Export" button in the board header. Clicking it downloads `<board name>.tableau.json` holding the document of US1.

**Why this priority**: user-facing half of the export.

**Independent Test**: on the board screen, click "Export" with the export service mocked and check that a file named after the board is offered for download with the document content.

**Acceptance Scenarios**:

1. **Given** a board named "Sprint planning", **When** a member clicks "Export", **Then** a file `Sprint planning.tableau.json` is downloaded with the exported document as its content.
2. **Given** a viewer on the board, **When** the screen renders, **Then** the "Export" button is shown and usable.
3. **Given** the export fails on the server, **When** the user clicks "Export", **Then** one error toast is shown and no file is downloaded.

---

### User Story 4 - Import button on the boards list (Priority: P2)

On the boards list, an "Import" button lets the user pick a `.json` file. The file is sent as is; on success the list is refreshed and the new board opens.

**Why this priority**: user-facing half of the import.

**Independent Test**: on the boards list, pick a valid file with the import service mocked and check that the import is called with the file content and that the new board is opened.

**Acceptance Scenarios**:

1. **Given** the boards list, **When** the user clicks "Import" and picks a valid `.json` file, **Then** the file content is sent to the import, a success toast is shown, the list is refreshed and the created board opens.
2. **Given** the file picker, **When** it opens, **Then** it only offers `.json` files.
3. **Given** an import in progress, **When** the screen renders, **Then** the "Import" button is busy and cannot be clicked again.

---

### User Story 5 - Translated import errors (Priority: P3)

When an import fails, the user sees one toast whose translated text depends on the kind of error (invalid file, file too large), never the raw server message.

**Why this priority**: refines the error path of US4, which already shows a generic error.

**Independent Test**: make the import fail with a bad-request error, a too-large error and an unreadable file, and check the toast text for each.

**Acceptance Scenarios**:

1. **Given** the server rejects the file as invalid, **When** the import fails, **Then** one toast says the file is not a valid board file (fr / en / es), not the server message.
2. **Given** the server rejects the file as too large, or the picked file is over 1 MB, **When** the import is attempted, **Then** one toast says the file is too large, and an oversized file is not sent.
3. **Given** a picked file that is not valid JSON, **When** the import is attempted, **Then** the "invalid file" toast is shown and nothing is sent.
4. **Given** any other failure (forbidden, server error), **When** the import fails, **Then** the existing generic error text is shown.

### Edge Cases

- Board with no items and no connectors -> exported with empty `items` and `connectors`; importing it creates an empty board.
- Board name containing characters invalid in a file name -> the browser receives the name as is; the download name is the board name followed by `.tableau.json`.
- Two connectors referencing the same item -> both are re-attached to the same new item.
- Import of a file exported by another user -> allowed; the importer becomes the owner and the only member.
- Import into an existing board (merge), PNG/PDF export and comments are out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let any board member, viewers included, export a board as a document `{ format: "tableau", version: 1, name, items[], connectors[] }`.
- **FR-002**: Exported items MUST carry a file-local key, type, position, size, colour, content and, for freehand items, points and stroke width; connectors MUST carry both ends as item keys and their style.
- **FR-003**: The export MUST NOT contain comments or members.
- **FR-004**: The system MUST create a new board named "<name> (import)" owned by the importing user from a valid document.
- **FR-005**: Imported connectors MUST reference the newly created items.
- **FR-006**: The import MUST be rejected, with a clear message and nothing created, for: unknown format or version, invalid JSON, more than 2000 items, unknown item type, freehand item outside the existing stroke limits, connector end missing from the file.
- **FR-007**: The import request body MUST be limited to 1 MB, on the import route only.
- **FR-008**: The import MUST be all or nothing.
- **FR-009**: The board screen MUST offer an "Export" action that downloads `<board name>.tableau.json`.
- **FR-010**: The boards list MUST offer an "Import" action that accepts a `.json` file and opens the created board.
- **FR-011**: Import errors MUST be shown as one translated toast chosen from the error kind, never the raw server message.
- **FR-012**: All new labels MUST exist in French, English and Spanish.

### Key Entities

- **Board file**: portable copy of a board: format marker, version, name, items, connectors.
- **Board file item**: file-local key, type, position, size, colour, content, optional freehand points and stroke width.
- **Board file connector**: the two item keys it links and its style.

## Success Criteria *(mandatory)*

- **SC-001**: Exporting a board then importing the file produces a board with the same number of items and connectors, each connector linking the copies of the originally linked items.
- **SC-002**: 100% of invalid files listed in FR-006 leave the number of boards unchanged.
- **SC-003**: A user goes from the boards list to the opened imported board in at most three actions (Import, pick the file, confirm the picker).

## Clarifications

### Session 2026-10-07

- Q: How is the import error toast text chosen? → A: From the error kind (invalid file / file too large, by response status and client-side checks), translated, never the raw server message.
- Q: How is the 1 MB limit enforced? → A: On the import route only, rejected as "too large".
- Q: Where is the export action, given the board screen has no menu? → A: A button in the board header, next to "Share".
- Q: Safety net and stories for this run? → A: All assumptions below accepted; US1 to US5 retained.

## Assumptions

- Export is open to every member, viewers included; non-members are refused.
- Items keep a file-local key in the document; it is only used to resolve connector ends at import time.
- The document is sent as is, as the content of the import request (no file upload form), as decided in plan.md.
- The screen checks the file size (1 MB) and that the file parses as JSON before sending; the server checks everything again.
- The importer becomes owner and only member of the new board; the new board opens right after the import.
