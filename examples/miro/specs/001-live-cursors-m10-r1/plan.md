# Implementation Plan: Live cursors of other people on the board

**Branch**: `001-live-cursors-m10-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the existing SignalR `BoardHub` (`/hubs/board`, F8) with a `MoveCursor(boardId, x, y)` method that relays a `CursorMoved` event to the OTHER members of the board group, membership being read from the in-memory presence tracker (no DB call per move). On the front, `useBoardHub` exposes the remote cursors (filtered by presence, own user excluded) and a throttled `moveCursor`; a new `RemoteCursorsLayer` (pointer-events none) is mounted inside the transformed board world of `BoardCanvas`, so cursors follow zoom and pan for free. Contract: `contracts/board-hub-cursors.asyncapi.yaml`.

## Technical Context

**Stack**: Front React 19 + TypeScript 6, `@microsoft/signalr` ^10, TanStack Query, Tailwind v4 tokens, `@septeo/septeo-ui-components`, Vitest 5 + Testing Library. Back ASP.NET Core (`Tableau.Api`, net SignalR hub), NUnit 4 + Shouldly, SignalR .NET client in `Tableau.Tests` (`Microsoft.AspNetCore.SignalR.Client`, F8).
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`; back `/usr/bin/dotnet test Tableau.Tests --filter FullyQualifiedName~Hubs`.
**Constraints**: no second hub or connection; no persistence; no server rate limit; front sends at most one position per `CURSOR_THROTTLE_MS` = 50 ms; idle fade after `CURSOR_IDLE_MS` = 5000 ms to opacity 0.3.

## Standards

Front (US2):
- @agent-os/standards/react/hooks — useBoardHub return shape, memoized callbacks
- @agent-os/standards/constants — throttle and idle durations `_MS`
- @agent-os/standards/typing/model-dto-mapper — remoteCursor DTO, model, mapper triad
- @agent-os/standards/typing/mapper-naming — `remoteCursorDtoToModel` naming
- @agent-os/standards/testing/mocking-conventions — hoisted fake hub connection
- Depot prime : @agent-os/standards/constants — constants live in `src/utils/<topic>/` -> the repo keeps canvas constants in `src/constants/canvasConstants.ts`, extended there.

Back (US1):
- @agent-os/standards/testing/testing-conventions — NUnit + Shouldly hub integration tests
- @agent-os/standards/dto/dto-shape — `CursorMovedDto` sealed record, XML docs
- Depot prime : @agent-os/standards/testing/testing-conventions — tests in `MySepteo.Api.Tests/` -> this repo's `Tableau.Tests/Hubs/`.

## Verified facts

Front (origin/dev 6a8041e):
- `src/api/realtime/boardHubConnection.ts:5-6` — `createBoardHubConnection` — single hub connection to `BOARD_HUB()` with `withCredentials: false`; CORS `AllowAnyOrigin` is therefore compatible, no CORS change needed.
- `src/pages/board/hooks/useBoardHub.ts:14-75` — `useBoardHub` — owns the connection inside one effect; registers `PresenceChanged`/`BoardChanged` with `connection.on`, unregisters with `off`; returns `{ presentUsers, isOnline }`. The connection is not exposed: `moveCursor` must live in this hook.
- `src/pages/board/hooks/useBoardHub.ts:36-38` — `handlePresenceChanged` — presence list mapped with `presenceUserDtoToModel`; source of "who is present" for cursor removal.
- `src/pages/board/board.tsx:48` — `useBoardHub` — only consumer of the hook; `board.tsx:189-205` renders `BoardCanvas`.
- `src/pages/board/board.tsx:81` — `CURRENT_USER_ID` — current user id compared as `Number(CURRENT_USER_ID)`; reused to exclude the own cursor.
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:66-78` — `BoardCanvas` — `board-viewport` spreads `drawing.handlers` or pan `handlers` (both define `onPointerMove`); `board-world` carries `translate(x,y) scale(zoom)`: a layer inside it is in board coordinates.
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:98-102` — `FreehandItem` — existing precedent of a `pointer-events-none absolute top-0 left-0` overlay inside `board-world`.
- `src/pages/board/hooks/useFreehandDrawing.ts:21-24` — `toWorldPoint` — screen->board conversion = `getBoundingClientRect` + `screenToWorld`.
- `src/pages/board/utils/screenToWorld.ts:3-6` — `screenToWorld` — `(screen - viewport.x) / zoom`.
- `src/constants/canvasConstants.ts:29-33` — `STROKE_COLORS` — the only colour palette offered on the board (yellow = `DEFAULT_STICKY_COLOR`, green, red); cursor colour source (clarify Q3).
- `src/types/dtos/presence/presenceUserDto.ts` — `PresenceUserDto` — existing presence triad domain folder `presence` for the new cursor triad.
- `src/__tests__/pages/board/hooks/useBoardHub.test.tsx:6-40` — `fakeConnection` — hoisted fake connection capturing `on` handlers by event name; extend it with `CursorMoved`.
- `src/__tests__/pages/board/board.test.tsx:53` — `useBoardHub` — page test mocks the hook via `mocks.hub`; return value must gain `remoteCursors` and `moveCursor`.
- `src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:252-256` — `renderCanvas` — Pencil test pattern with `fireEvent.pointerDown/pointerMove` on the viewport.

Back (backend root from `.sk/repos.json`, origin/dev cae39c1; `Tableau.sln` projects: `Tableau.Api/Tableau.Api.csproj`, `Tableau.Business/Tableau.Business.csproj`, `Tableau.DAL/Tableau.DAL.csproj`, `Tableau.Tests/Tableau.Tests.csproj`; `Tableau.Api/` holds Controllers, DependencyInjection, Hubs, Middleware, Security, Program.cs):
- `Tableau.Api/Hubs/BoardHub.cs:10-50` — `BoardHub` — `JoinBoard` resolves the user, checks membership via `IBoardMemberService.GetMembers`, adds to group `GroupOf(boardId)` and registers presence.
- `Tableau.Api/Hubs/BoardHub.cs:26` — `GroupOf` — group name `board-{boardId}`.
- `Tableau.Api/Hubs/BoardPresenceTracker.cs:6-68` — `BoardPresenceTracker` — in-memory map board -> user -> connection ids, guarded by a lock; holds `PresenceUserDto` (UserId, DisplayName) per joined connection: membership and identity source for `MoveCursor` without a DB call.
- `Tableau.Api/Hubs/Interfaces/IBoardPresenceTracker.cs:5-12` — `IBoardPresenceTracker` — exposes `Add` and `Remove` only; a lookup by (boardId, connectionId) must be added.
- `Tableau.DAL/Dtos/PresenceUserDto.cs:4-11` — `PresenceUserDto` — sealed record model for the new `CursorMovedDto`.
- `Tableau.Api/Program.cs:35-52` — `MapHub` — `AddSignalR`, CORS `AllowAnyOrigin`, hub mapped at `/hubs/board`.
- `Tableau.Tests/Hubs/BoardHubTests.cs:40-56` — `ConnectAsync` — integration test helper: `WebApplicationFactory<Program>`, LongPolling, `Channel` per event; Bob = 2, Carol = 3 (viewer), boards 1 and 2.
- `Tableau.Tests/Hubs/BoardPresenceTrackerTests.cs:7-21` — `BoardPresenceTrackerTests` — unit tests instantiate `BoardPresenceTracker` directly.

Contract fields (`contracts/board-hub-cursors.asyncapi.yaml`), all DERIVED, nothing stored:
- `userId`, `displayName` — derived from `Tableau.Api/Hubs/BoardPresenceTracker.cs` (`PresenceUserDto` registered by `JoinBoard` from `IBoardMemberService.GetMembers`), no DB read per move.
- `x`, `y`, `boardId` — given by the caller of `MoveCursor` (human-dictated contract, intent).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `Tableau.Api/Hubs/BoardPresenceTracker.cs` (+ `Interfaces/IBoardPresenceTracker.cs`) | extend (`Find`) | US1 |
| `Tableau.Api/Hubs/BoardHub.cs` (+ `Tableau.DAL/Dtos/CursorMovedDto.cs`) | extend (`MoveCursor`) / create DTO | US1 |
| `src/types/mappers/presence/remoteCursorMapper.ts` (+ dto, model) | create | US2 |
| `src/pages/board/utils/getCursorColor.ts` (+ `src/constants/canvasConstants.ts`) | create / extend | US2 |
| `src/pages/board/hooks/useBoardHub.ts` | extend | US2 |
| `src/pages/board/components/widgets/remoteCursorsLayer/remoteCursorsLayer.tsx` (+ props) | create | US2 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` (+ props) | extend, mount | US2 |
| `src/pages/board/board.tsx` | extend (wire) | US2 |

## Decisions

- Membership check in `MoveCursor` through the presence tracker (connection registered by `JoinBoard`) instead of `IBoardMemberService` — a DB round-trip on every pointer move is excluded; a connection that never joined is unknown -> ignored silently (clarify Q1).
- `Clients.OthersInGroup` — excludes the caller connection; the front additionally drops events carrying its own user id (other tabs of the same user).
- Cursor layer inside `board-world` — inherits translate/scale, so board coordinates need no conversion on display; the label is counter-scaled by `1/zoom` to keep a constant size.
- Idle fade computed from a per-cursor `lastMovedAt` timestamp in the layer with one interval tick — no server timer.
- Throttle in `useBoardHub.moveCursor` (leading call, then one per 50 ms) — no new dependency (no lodash in the repo).
- Two git roots, contract written in prep -> `parallel.yml` with `after: null`; /sk-impl reads it. Barrier part: 0 of 8 tasks.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md, contracts/board-hub-cursors.asyncapi.yaml, parallel.yml
