# Feature Specification: Realtime board presence and live sync

**Feature Branch**: `001-realtime-presence-m8-r1`
**Created**: 2026-10-07
**Input**: "Voir qui est sur le tableau et voir les changements des autres en temps reel (SignalR)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Board hub with live presence (back) (Priority: P1)

A board member (viewer included) opens a realtime connection, joins the board's group and receives
the list of users currently connected to that board, refreshed every time someone arrives or leaves.
A non-member is refused without learning anything about the board.

**Why this priority**: every other story (avatars, live sync) rides on this connection and group.

**Independent Test**: integration tests with a realtime test client on the test host: two
members join the same board and both receive the presence list; a non-member is refused.

**Acceptance Scenarios**:

1. **Given** user 2 is a member of board 1, **When** they connect to the realtime channel as user 2 and join board 1, **Then** every connection in the board 1 group receives a presence update with a list containing user 2 (id and display name).
2. **Given** user 2 is already present on board 1, **When** a viewer of board 1 joins, **Then** both receive a presence update listing the two users.
3. **Given** user 2 has two connections joined to board 1, **When** one of them closes, **Then** user 2 still appears once in the list; **When** the last one closes, **Then** the board's users receive a presence update without user 2.
4. **Given** a user who is not a member of board 1 (or a board that does not exist), **When** they join board 1, **Then** the server refuses with the same generic error in both cases and they receive no presence or change event for board 1.
5. **Given** a connection without an identified user, **When** it joins a board, **Then** the server refuses it.

### User Story 2 - Broadcast board changes (back) (Priority: P1)

After any successful create, update or delete of a board item (sticky note, shape, text, freehand
stroke) or connector, the server tells the board's group that the board changed, with the
connection id of the author so the author can ignore its own echo.

**Why this priority**: it is the server half of "see the others' changes in real time".

**Independent Test**: integration test: a realtime client joined to board 1 receives a board-changed notice
after an item is created, carrying the author's connection id.

**Acceptance Scenarios**:

1. **Given** a client joined to board 1, **When** an editor creates, updates or deletes an item of board 1 through the API, **Then** the client receives a board-changed notice for board 1.
2. **Given** a client joined to board 1, **When** an editor creates, updates or deletes a connector of board 1, **Then** the client receives a board-changed notice for board 1.
3. **Given** the write request carries the author's connection id, **When** the change is broadcast, **Then** the notice carries that id; without it, the notice carries no author connection.
4. **Given** the write fails (403, 404, 400), **When** the request ends, **Then** no notice is sent.
5. **Given** the broadcast itself fails, **When** the write succeeded, **Then** the API still returns the success status.

### User Story 3 - Realtime connection and presence state (front) (Priority: P2)

When a board page opens, the front opens a realtime connection identified by the current user,
joins the board, keeps the list of present users up to date and exposes whether the connection is
online. The connection reconnects automatically and is closed when the page is left.

**Why this priority**: the front needs the connection and the presence data before showing them.

**Independent Test**: test with a simulated connection: opened and joined when the board opens,
presence list updated on each presence update, offline on connection loss, closed when the board is left.

**Acceptance Scenarios**:

1. **Given** the board page mounts for board 1, **When** it loads, **Then** a realtime connection identified as the current user, with automatic reconnection, is opened and board 1 is joined.
2. **Given** the connection is open, **When** a presence update is received, **Then** the page holds the list of present users (id, display name).
3. **Given** the connection is open, **When** it starts reconnecting or closes, **Then** the page knows it is offline; **When** it reconnects, **Then** it is online and joins the board again.
4. **Given** the page unmounts, **When** the board is left, **Then** the connection is closed.
5. **Given** the start or join fails, **When** it settles, **Then** the page is offline and the page keeps working.

### User Story 4 - Presence avatars and offline indicator (front) (Priority: P2)

At the top right of the board, the user sees round avatars (initials) of the people currently on the
board, at most five followed by "+N"; hovering an avatar shows the name. When the realtime connection
is lost, a small "Offline" indicator appears; editing is never blocked.

**Why this priority**: it is the visible half of "see who is on the board".

**Independent Test**: test of the avatar bar with 0, 3 and 7 users and both statuses, and
board page test asserting the bar replaces the single current-user avatar.

**Acceptance Scenarios**:

1. **Given** 3 present users, **When** the board header renders, **Then** 3 avatars of 28px with initials are shown, each with a tooltip holding the user name.
2. **Given** 7 present users, **When** the header renders, **Then** 5 avatars and a "+2" marker are shown; the marker's tooltip lists the two hidden names.
3. **Given** the connection is offline, **When** the header renders, **Then** an "Offline" indicator is shown and announced politely to screen readers, and the toolbar stays usable.
4. **Given** the connection is online, **When** the header renders, **Then** no offline indicator is shown.
5. **Given** fr, en or es is the active language, **When** the bar renders, **Then** every label (offline, +N tooltip, accessible names) is translated.

### User Story 5 - Live board sync (front) (Priority: P2)

When someone else changes an item or connector, the board refreshes by itself. The author's own
changes do not trigger a second reload.

**Why this priority**: it is the visible half of "see the others' changes in real time".

**Independent Test**: a board-changed notice from another connection reloads the board
items and connectors; one from the user's own connection does not; the connection id travels with every
write once known.

**Acceptance Scenarios**:

1. **Given** the connection is open on board 1, **When** a board-changed notice arrives from another connection, **Then** the items and connectors of board 1 are reloaded.
2. **Given** the connection is open with id `abc`, **When** a notice arrives from connection `abc`, **Then** nothing is reloaded.
3. **Given** the connection is open with id `abc`, **When** the user saves any change, **Then** the request identifies connection `abc`; **When** no connection is open, **Then** no connection is identified.
4. **Given** a board-changed notice arrives for another board, **When** it is handled, **Then** nothing is reloaded.

### Edge Cases

- Same user in two tabs -> listed once; disappears only when the last tab closes.
- Viewer -> sees presence and receives changes like any member.
- Removed from the board while connected -> no new join is accepted; already joined connections are out of scope.
- More than 5 users -> 5 avatars then "+N", N = remaining count.
- Connection drops -> "Offline" shown, editing still enabled; on reconnect the board is joined again and presence refreshed.
- Change event for a board other than the open one -> ignored.
- Author's own change -> no double reload (event ignored by connection id).
- Comment or member changes -> not broadcast (out of scope).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer a realtime channel per board that a client joins for a given board.
- **FR-002**: The system MUST identify the realtime caller with the same current-user identification as the rest of the API.
- **FR-003**: The system MUST accept a join only from a board member (any role) and refuse others with a generic error that does not reveal whether the board exists.
- **FR-004**: The system MUST notify the board's connected users of the presence list on every arrival and departure, counting a user once across connections.
- **FR-005**: The system MUST notify the board's connected users that the board changed, with the author's connection, after every successful item or connector create, update or delete, best-effort.
- **FR-006**: The front MUST open the connection when a board opens, reconnect automatically, close it when the board is left, and identify its connection on every change it saves.
- **FR-007**: The front MUST show present users as initials avatars (max 5 then "+N") with the name in a tooltip, and an "Offline" indicator when disconnected, without blocking editing.
- **FR-008**: The front MUST reload the board items and connectors on a change notice from another connection and ignore its own.
- **FR-009**: Every new label MUST exist in fr, en and es.

### Key Entities

- **Present user**: a user currently connected to a board — id and display name; held in server memory only.
- **Board change notice**: board id plus the author's connection id (nullable).

## Success Criteria *(mandatory)*

- **SC-001**: A user joining or leaving a board appears or disappears for the others within 2 seconds on a local network.
- **SC-002**: A change made by one member is visible to the others without any manual reload.
- **SC-003**: The author of a change triggers no extra reload of its own board.
- **SC-004**: A non-member cannot obtain the presence list or change events of a board.

## Clarifications

### Session 2026-10-07

- Q: How does the hub identify the caller, given the browser cannot set `X-User-Id` on a WebSocket and the back standard forbids reading the caller from the query? → A: Query string `userId`, read by the existing current-user resolver; deviation from controllers/current-user-resolution accepted.
- Q: How does the server know the author's connection to let it ignore its own echo? → A: `BoardChanged` carries `boardId` + the author's connection id, which the front sends in an `X-Connection-Id` header on every API request.
- Q: Which stories for this run, and how split? → A: All five; back and front in distinct stories; the npm and NuGet dependencies are explicit tasks.
- Q: Safety net — avatars replace the current single-user avatar, "+N" tooltip lists hidden names, offline while reconnecting/disconnected, only items and connectors broadcast, presence in memory, .NET SignalR client 8.0.*, generic refusal message? → A: Validated as proposed.

## Assumptions

- Presence lives in server memory (no table); a server restart empties it and clients rejoin on reconnect.
- The display name comes from the board member list (`DisplayName`).
- The current single-user avatar in the board header is replaced by the presence avatars (the current user is part of the list).
- The .NET SignalR client in tests uses version 8.0.* to match `net8.0`; the npm client is `@microsoft/signalr` 10.x.
- Out of scope: live cursors, simultaneous-edit conflict resolution, notifications, comment and member broadcasts.
