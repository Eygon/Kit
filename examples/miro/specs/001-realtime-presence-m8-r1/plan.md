# Implementation Plan: Realtime board presence and live sync

**Branch**: `001-realtime-presence-m8-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add an ASP.NET Core SignalR hub `/hubs/board` to the back (presence tracked in memory, membership
checked through the existing member service, caller resolved by the existing resolver extended to the
`userId` query string) and broadcast `BoardChanged` from the item and connector controllers. On the
front, add `@microsoft/signalr`, a connection module, a `useBoardHub` hook (presence, status, sync by
query invalidation) and a presence avatar bar in the board header. Contract: `contracts/board-hub.yaml`.

## Technical Context

**Stack**: front React 19 + TypeScript strict + TanStack Query v5 + react-i18next (fr/en/es) + `@septeo/septeo-ui-components`, Vitest + Testing Library; back .NET 8 ASP.NET Core controllers, EF Core SQLite in memory, NUnit 4 + NSubstitute + Shouldly, `WebApplicationFactory<Program>` integration tests.
**Gates**: front `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`; back `dotnet test Tableau.Tests --filter <Class>`, `dotnet build Tableau.sln`.
**Constraints**: new npm dependency `@microsoft/signalr` 10.x and new NuGet test dependency `Microsoft.AspNetCore.SignalR.Client` 8.0.* (accepted, explicit tasks); no real socket in vitest (connection injected/mocked); presence in memory, no table.

## Standards

Front (US3-US5):
- @agent-os/standards/react/hooks — useBoardHub shape and effects
- @agent-os/standards/api/url-builders — hub URL in apiURL
- @agent-os/standards/typing/model-dto-mapper — PresenceUser triad
- @agent-os/standards/testing/mocking-conventions — mocked connection module
- @agent-os/standards/accessibility/live-regions — polite offline announcement
- @agent-os/standards/react/i18n — offline, +N, aria labels
- @agent-os/standards/react/mutation-cache-updates — invalidate on BoardChanged

Back (US1-US2):
- @agent-os/standards/controllers/current-user-resolution — hub caller identification
- @agent-os/standards/services/post-commit-side-effects — best-effort broadcast after write
- @agent-os/standards/testing/testing-conventions — NUnit, Shouldly, AAA
- @agent-os/standards/architecture/di-auto-registration — Api types registered manually
- @agent-os/standards/dto/dto-shape — PresenceUserDto record
- @agent-os/standards/error-handling/domain-exceptions — refusal mapped to HubException

- Ecart accepte : @agent-os/standards/controllers/current-user-resolution — "never from the request body or query" — a browser WebSocket cannot carry X-User-Id, the intent dictates `userId` in the query read by the same resolver (clarify Q1)
- Depot prime : @agent-os/standards/controllers/current-user-resolution — JWT helpers `ReadCompanyUserIdAsync` -> `Controller.ReadCurrentUserId` + `HeaderCurrentUserResolver` (X-User-Id header)
- Depot prime : @agent-os/standards/testing/testing-conventions — `MySepteo.Api.Tests/`, no EF in-memory -> `Tableau.Tests/` integration tests on `WebApplicationFactory<Program>` with the SQLite in-memory host of `Program.cs`, as every existing `*ApiTests`
- Depot prime : @agent-os/standards/error-handling/domain-exceptions — a hub has no ExceptionHandlingMiddleware: domain exceptions from `GetMembers` are caught in the hub and rethrown as one generic `HubException`

## Verified facts

Front (origin/dev 4ff6db0):
- `src/pages/board/board.tsx:216-227` — `BoardPage` — header right side renders a single `<Avatar name=...>` of the current user at line 226; presence bar replaces it
- `src/pages/board/board.tsx:42-47` — `useBoardItemsQuery` — the page already loads board, items, members, connectors by `boardId`
- `src/api/httpClient.ts:15-20` — `request` — every REST call sets `X-User-Id` from `CURRENT_USER_ID`; the place to add `X-Connection-Id`
- `src/config/apiConfig.ts:7` — `CURRENT_USER_ID` — current user id "1", source of the hub `userId` query value
- `src/utils/apiURL/apiURL.ts:3` — `BOARDS` — builders use `debugMode ? API_BASE_URL_LOCAL : API_BASE_URL`; hub builder composes the same base
- `src/utils/queryKeys/boardItemQueryKeys.ts:1-4` — `boardItemKeys` — `all(boardId)` key to invalidate on BoardChanged
- `src/utils/queryKeys/connectorQueryKeys.ts:1-4` — `connectorKeys` — `all(boardId)` key to invalidate on BoardChanged
- `src/__tests__/pages/board/board.test.tsx:12-50` — `vi.hoisted` — board page test mocks every page hook with `vi.mock`; useBoardHub is mocked the same way
- `packages/septeo-ui-components/dist/index.d.ts:98-101` — `AvatarProps` — `name: string, size?: number`; `Tooltip` takes `label: string, children`
- `package.json:11-19` — `dependencies` — no SignalR client today; `@microsoft/signalr` is added

Back (origin/dev 6f72179, read with git show / ls-tree):
- `Tableau.sln` — projects `Tableau.Api/Tableau.Api.csproj`, `Tableau.Business/Tableau.Business.csproj`, `Tableau.DAL/Tableau.DAL.csproj`, `Tableau.Tests/Tableau.Tests.csproj` (git show origin/dev:Tableau.sln); `Tableau.Api/` holds Controllers, DependencyInjection, Middleware, Security, Program.cs (ls-tree); no `Hubs/` folder yet
- `Directory.Build.props:3` — `TargetFramework` — net8.0, so the SignalR .NET client is pinned to 8.0.*
- `Tableau.Api/Program.cs:30-31` — `AddSuffixRegistrations` — resolver registered manually as singleton; auto-registration scans only Business and DAL assemblies, so Api types (hub tracker, notifier) are registered by hand
- `Tableau.Api/Program.cs:44-46` — `MapControllers` — pipeline where `MapHub<BoardHub>("/hubs/board")` is added
- `Tableau.Api/Security/HeaderCurrentUserResolver.cs:7-10` — `ResolveUserId` — header only today; extended with query `userId` fallback
- `Tableau.Api/Controllers/Controller.cs:11-12` — `ReadCurrentUserId` — controllers resolve the caller through `ICurrentUserResolver`
- `Tableau.Api/Controllers/BoardItemsController.cs:34-78` — `Post` — Post/Patch/Delete return after the service call; broadcast goes after it
- `Tableau.Api/Controllers/ConnectorsController.cs:34-78` — `Post` — same shape for connectors
- `Tableau.Business/Services/BoardMemberService.cs:22-26` — `GetMembers` — EnsureAccess(requireWrite false) then member list: membership check and display names in one call
- `Tableau.Business/Services/BoardService.cs:46-57` — `EnsureAccess` — throws ResourceNotFoundException (no board) or ForbiddenException (not a member)
- `Tableau.DAL/Repositories/BoardMemberRepository.cs:55` — `BoardMemberDto` — DisplayName projected from `User.DisplayName`
- `Tableau.DAL/Seed/DataSeeder.cs:21-24` — `User` — seed users Alice (1), Bob (2), Carol (3)
- `Tableau.DAL/Seed/DataSeeder.cs:30-40` — `BoardMember` — planning: Alice owner, Bob editor, Carol viewer; retro: Bob owner, Alice editor (Carol is not a member of retro)
- `Tableau.Tests/Tableau.Tests.csproj:16` — `Microsoft.AspNetCore.Mvc.Testing` — 8.0.*; no SignalR client package yet
- `Tableau.Tests/Controllers/BoardItemsApiTests.cs:17-30` — `ClientOf` — integration recipe: `WebApplicationFactory<Program>` + X-User-Id header

Contract field sources (contracts/board-hub.yaml):
- `PresenceUser.userId` — derived from BoardMember.UserId via `IBoardMemberService.GetMembers` (BoardMemberDto.UserId), seed: 3 users, 5 memberships (DataSeeder.cs lines 21-40); no MCP SQL here, source checked in the seed and the repository projection
- `PresenceUser.displayName` — derived from User.DisplayName (BoardMemberRepository.cs projection, max 100 from User.MaxDisplayNameLength)
- `BoardChanged.boardId` — route value `{boardId:int}` of the item/connector controllers
- `BoardChanged.connectionId` — request header `X-Connection-Id`, set by the front (created by T018), null when absent
- `JoinBoard.boardId` — client argument, checked by `GetMembers`
- Contract structure keys `asyncapi`, `protocol`, `channels`, `publish`, `subscribe`, `message`, `messages`, `x-http-headers` — AsyncAPI 2.6 document keywords, not data fields: no source needed

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `Tableau.Tests/Tableau.Tests.csproj` | extend (SignalR client package) | US1 |
| `Tableau.Api/Security/HeaderCurrentUserResolver.cs` | extend (query fallback) | US1 |
| `Tableau.Api/Hubs/BoardPresenceTracker.cs` (+ `Hubs/Interfaces/IBoardPresenceTracker.cs`, `Tableau.DAL/Dtos/PresenceUserDto.cs`) | create | US1 |
| `Tableau.Api/Hubs/BoardHub.cs` | create | US1 |
| `Tableau.Api/Program.cs` | extend (AddSignalR, tracker, MapHub) | US1 |
| `Tableau.Api/Hubs/BoardChangeNotifier.cs` (+ `Hubs/Interfaces/IBoardChangeNotifier.cs`) | create | US2 |
| `Tableau.Api/Program.cs` | extend (notifier registration) | US2 |
| `Tableau.Api/Controllers/BoardItemsController.cs` | extend | US2 |
| `Tableau.Api/Controllers/ConnectorsController.cs` | extend | US2 |
| `package.json` | extend (`@microsoft/signalr`) | US3 |
| `src/utils/apiURL/apiURL.ts` | extend (`BOARD_HUB`) | US3 |
| `src/api/realtime/boardHubConnection.ts` (+ presenceUser dto/model/mapper) | create | US3 |
| `src/pages/board/hooks/useBoardHub.ts` | create | US3 |
| `src/pages/board/components/widgets/presenceAvatars/presenceAvatars.tsx` (+ `types/presenceAvatars.ts`) | create | US4 |
| `src/pages/board/board.tsx` | mount | US4 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US4 |
| `src/api/realtime/boardHubConnection.ts` | extend (connection id holder) | US5 |
| `src/api/httpClient.ts` | extend (`X-Connection-Id`) | US5 |
| `src/pages/board/hooks/useBoardHub.ts` | extend (BoardChanged) | US5 |

## Decisions

- Presence tracker is a singleton registered in `Program.cs` (not a `*Service`: auto-registration is Scoped and does not scan the Api assembly) — scoped state would lose presence between hub invocations.
- Membership check and names come from `IBoardMemberService.GetMembers` (one call, any role) — reusing it avoids a second access policy; its domain exceptions become one generic `HubException`.
- Broadcast is triggered from the controllers after the service call (they hold the request headers and the route boardId); the notifier wraps `IHubContext<BoardHub>` in try/catch + log (post-commit-side-effects).
- Front sync invalidates `boardItemKeys.all` and `connectorKeys.all` instead of merging payloads (intent).
- The connection id is held by `boardHubConnection.ts` and read by `httpClient.ts`, so every mutation hook keeps working unchanged.
- `/sk-impl` reads `parallel.yml`: contract written in prep, so `after: null`; back chain [US1, US2] and front chain [US3, US4, US5] run in parallel; barrier share 0/19 tasks.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md, contracts/board-hub.yaml, parallel.yml
