# Feature Specification: Board sharing with Viewer / Editor roles

**Feature Branch**: `001-board-sharing-m2-r1`
**Created**: 2026-10-06
**Input**: "Pouvoir partager un tableau avec d'autres utilisateurs (lecteur ou éditeur), et que les droits soient respectés côté API."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Users are stored with a display name (Priority: P1)

The application stores its users (identifier and display name). The three existing users, Alice (1), Bob (2) and Carol (3), are present at start-up.

**Why this priority**: every sharing screen needs user names; no user store exists today.

**Independent Test**: create the data store: the users table exists with a required, length-bounded display name, and seeding yields Alice, Bob and Carol under identifiers 1, 2, 3.

**Acceptance Scenarios**:

1. **Given** a fresh data store, **When** it is seeded, **Then** users 1, 2, 3 exist with display names Alice, Bob, Carol.
2. **Given** the data model, **When** a user is stored without display name, **Then** it is refused.

---

### User Story 2 - Users directory is served by the API (Priority: P1)

Identified callers can list the users of the application, so that an owner can pick someone to share a board with.

**Why this priority**: the share dialog needs this list; it did not exist.

**Independent Test**: call the users endpoint as an identified user and receive the seeded users with their display names; call it unidentified and receive 401.

**Acceptance Scenarios**:

1. **Given** the seeded users, **When** user 1 requests the users list, **Then** Alice, Bob and Carol are returned with identifier and display name, ordered by display name.
2. **Given** no user identification on the request, **When** the users list is requested, **Then** the API answers 401.

---

### User Story 3 - Board owner manages members through the API (Priority: P1)

The owner of a board lists its members, adds a user as Viewer or Editor, changes a member's role and removes a member. Any member can read the member list; only the owner can change it.

**Why this priority**: it is the server-side rule the feature exists for: rights enforced by the API.

**Independent Test**: with the seeded board "Sprint planning" (Alice owner, Bob editor, Carol viewer) and "Retrospective" (Bob owner, Alice editor), exercise the four member operations as owner, editor, viewer and non-member and check status codes and resulting member list.

**Acceptance Scenarios**:

1. **Given** Carol is a Viewer of board 1, **When** she lists the members of board 1, **Then** she receives Alice (Owner), Bob (Editor), Carol (Viewer) with display names.
2. **Given** Bob owns board 2, **When** he adds Carol as Viewer, **Then** the API answers 201 with Carol's member entry and Carol can then read board 2.
3. **Given** Alice owns board 1, **When** she changes Carol's role to Editor, **Then** the API answers 200 and Carol can then modify items of board 1.
4. **Given** Alice owns board 1, **When** she removes Bob, **Then** the API answers 204 and Bob can no longer read board 1 (403).
5. **Given** Bob is an Editor (not owner) of board 1, **When** he adds, updates or removes a member, **Then** the API answers 403.
6. **Given** a user who is not a member of board 1, **When** he lists its members, **Then** the API answers 403.
7. **Given** Carol is a Viewer of board 1, **When** she creates, moves or deletes an item, **Then** the API answers 403 (rule already enforced, kept by this feature).

---

### User Story 4 - Front reads board members (Priority: P2)

The web application can fetch the members of a board, with their role and display name, against the interface contract.

**Why this priority**: every member screen and the read-only mode depend on it.

**Independent Test**: the member read call returns mapped members for a 200, an empty list for a 204, and reports the error and returns an empty list on failure.

**Acceptance Scenarios**:

1. **Given** the members endpoint returns three members, **When** the board members are fetched, **Then** three members with user id, display name and role are returned.
2. **Given** the members endpoint answers 204, **When** the board members are fetched, **Then** an empty list is returned.
3. **Given** the members endpoint fails, **When** the board members are fetched, **Then** the error is displayed once and an empty list is returned.

---

### User Story 5 - A Viewer sees a read-only board (Priority: P2)

When the signed-in user is a Viewer of the opened board, the editing tools are not offered and the board cannot be modified from the canvas.

**Why this priority**: it reflects the server rule in the interface, so a Viewer does not hit refusals.

**Independent Test**: open a board where the current user is a Viewer: only the Select and Comments tools are offered and creating, moving, editing or deleting an item triggers no change request.

**Acceptance Scenarios**:

1. **Given** the current user is a Viewer of the board, **When** the board opens, **Then** the toolbar shows Select (and Comments when applicable) but no sticky note, shape, text or delete tool.
2. **Given** the current user is a Viewer, **When** he drags or double-clicks an item, **Then** no item change is sent.
3. **Given** the current user is an Editor or the Owner, **When** the board opens, **Then** the toolbar is unchanged.

---

### User Story 6 - Everyone sees who has access (Priority: P2)

A "Share" button in the board header opens a dialog that lists the board members with avatar, name and role.

**Why this priority**: first visible piece of sharing; the owner actions build on this dialog.

**Independent Test**: open a board, click "Share": the dialog lists every member with avatar, name and role; closing it returns to the board.

**Acceptance Scenarios**:

1. **Given** a board with three members, **When** the user clicks "Share", **Then** a dialog lists the three members with avatar, display name and localized role.
2. **Given** the members are loading, **When** the dialog is open, **Then** a loading placeholder is shown.
3. **Given** the dialog is open, **When** the user closes it, **Then** the board is shown again.

---

### User Story 7 - Owner changes a role or removes a member (Priority: P3)

In the share dialog, the owner changes a member's role between Viewer and Editor, or removes a member. Other users see the list without these controls.

**Why this priority**: completes member management after the list exists.

**Independent Test**: as owner, change a member's role and remove a member from the dialog; the list refreshes. As a non-owner, no role control nor remove action is shown.

**Acceptance Scenarios**:

1. **Given** the current user owns the board, **When** he selects Editor for a Viewer member, **Then** the role change is saved and the list shows Editor.
2. **Given** the current user owns the board, **When** he removes a member, **Then** the member disappears from the list.
3. **Given** the current user is not the owner, **When** the dialog is open, **Then** roles are shown as text with no remove action.
4. **Given** the owner's own row, **When** the dialog is open, **Then** it shows "Owner" with no role control nor remove action.

---

### User Story 8 - Front reads the users directory (Priority: P3)

The web application can fetch the list of users (id, display name) against the interface contract.

**Why this priority**: required to propose someone to add.

**Independent Test**: the users read call returns mapped users for a 200, an empty list for a 204, and reports the error and returns an empty list on failure.

**Acceptance Scenarios**:

1. **Given** the users endpoint returns three users, **When** users are fetched, **Then** three users with id and display name are returned.
2. **Given** the users endpoint fails, **When** users are fetched, **Then** the error is displayed once and an empty list is returned.

---

### User Story 9 - Owner adds a member (Priority: P3)

In the share dialog, the owner selects a user who is not yet a member, chooses Viewer or Editor and adds them.

**Why this priority**: the sharing action itself; it needs the users directory and the dialog.

**Independent Test**: as owner, pick a non-member user and a role, click "Add": the user appears in the member list with the chosen role.

**Acceptance Scenarios**:

1. **Given** the current user owns the board, **When** he opens the dialog, **Then** a user picker lists only users who are not members yet, and a role picker offers Viewer and Editor (Viewer by default).
2. **Given** a user and a role are selected, **When** the owner clicks "Add", **Then** the member is added and appears in the list.
3. **Given** every user is already a member, **When** the dialog is open, **Then** the add control is disabled.
4. **Given** the current user is not the owner, **When** the dialog is open, **Then** no add control is shown.

### Edge Cases

- Adding a user who is already a member -> refused (400), list unchanged.
- Changing the owner's role or removing the owner -> refused (400).
- Role other than Viewer or Editor on add or change -> refused (400).
- Adding a user id that does not exist -> 404.
- Changing or removing a user who is not a member -> 404.
- Members request on an unknown board -> 404.
- Unidentified caller on any members or users endpoint -> 401.
- Removed member keeps the board open: his next request is refused (403) and the error is displayed.
- Out of scope: invitations by email, public links.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store users with an identifier and a display name and expose them to identified callers.
- **FR-002**: The system MUST let any member of a board read its member list (user, display name, role).
- **FR-003**: The system MUST let only the board owner add, re-role or remove members; any other caller is refused (403).
- **FR-004**: The system MUST accept only Viewer or Editor as role when adding or changing a member.
- **FR-005**: The system MUST refuse item creation, modification and deletion to a Viewer (403).
- **FR-006**: The web application MUST offer a "Share" action in the board header that lists members with avatar, name and role.
- **FR-007**: The web application MUST hide editing tools and block canvas edits for a Viewer.
- **FR-008**: The web application MUST let the owner add a member (user + role), change a member's role and remove a member; non-owners see the list only.
- **FR-009**: All new labels MUST exist in French, English and Spanish.

### Key Entities

- **User**: a person of the application; identifier, display name.
- **Board member**: link between a board and a user with a role (Viewer, Editor, Owner); exactly one Owner per board.

## Success Criteria *(mandatory)*

- **SC-001**: An owner shares a board with a user as Viewer or Editor in under 30 seconds from the board screen.
- **SC-002**: 100% of member-management and item-modification requests from unauthorized roles are refused by the API.
- **SC-003**: A Viewer is never offered an editing tool on the board screen.

## Clarifications

### Session 2026-10-06

- Q: The library icon button has no disabled state; how is the toolbar "disabled" for a Viewer? → A: editing tools (sticky note, shape, text, delete) are not rendered; Select and Comments stay.
- Q: The library has no dropdown; how is a user (and a role) selected? → A: native select controls styled with design tokens.
- Q: How does the web application know the current user's role? → A: from the board member list, readable by every member; only writes are owner-only.
- Q: Hypotheses (users endpoint missing, users table seeded, error codes, Viewer item rule already enforced, split in 9 stories to fit the size cap) → A: validated; the users endpoint is added back-side in this run; all 9 stories retained.

## Assumptions

- The users endpoint did not exist; it is created by this feature, with Alice, Bob and Carol seeded under their existing identifiers.
- The current user is the one the application already identifies, as today.
- Viewer refusal on item writes already exists server-side; the feature keeps it and covers it in acceptance.
- Invitations by email and public links are out of scope.
