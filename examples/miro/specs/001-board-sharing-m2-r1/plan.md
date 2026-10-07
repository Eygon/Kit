# Implementation Plan: Board sharing with Viewer / Editor roles

**Branch**: `001-board-sharing-m2-r1` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Back (Tableau API, second git root): add a `Users` table seeded with the three existing users, a `GET /api/v1/users` endpoint, and a `BoardMembersController` (list / add / change role / remove) where only the owner writes and any member reads. Front (tableau-web): a member read layer, a read-only board for Viewers (editing tools hidden, canvas edits blocked), and a "Share" dialog in the board header that lists members and lets the owner add, re-role and remove them. Both sides code against `contracts/board-sharing.yaml`, written in prep.

## Technical Context

**Stack**: front React 19 + TypeScript 6, `@septeo/septeo-ui-components` (local package), TanStack Query 5, react-i18next, Vitest + Testing Library; back .NET 8 Web API, EF Core + SQLite in memory (`EnsureCreated`), NUnit 4 + NSubstitute + Shouldly.
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`, `node node_modules/eslint/bin/eslint.js src`; back `/usr/bin/dotnet test Tableau.Tests --filter <Class>`, `/usr/bin/dotnet build Tableau.sln`.
**Constraints**: no Select/dropdown and no `disabled` on `IconButton` in the library; current user = `CURRENT_USER_ID` (front) sent as `X-User-Id`.

## Standards

Front (`agent-os/standards/index.yml`, alwaysInject applied on top):
- @agent-os/standards/api/service-structure — members and users services, query functions
- @agent-os/standards/typing/model-dto-mapper — boardMember and user triads
- @agent-os/standards/react/tanstack-query — members and users query hooks
- @agent-os/standards/react/mutation-cache-updates — add / re-role / remove members
- @agent-os/standards/react/i18n — share dialog and role labels
- @agent-os/standards/testing/mocking-conventions — default-export services and hooks mocks

Back (`agent-os/standards/index.yml` of the backend on origin/dev, alwaysInject applied on top):
- @agent-os/standards/data-access/ef-entity-type-configuration — new User entity
- @agent-os/standards/data-access/repository-returns-dto — users and members repositories
- @agent-os/standards/controllers/http-response-contract — users and members controllers
- @agent-os/standards/error-handling/domain-exceptions — owner-only, role and membership rules
- @agent-os/standards/testing/testing-conventions — service and API tests

- Depot prime : @agent-os/standards/septeo-library-first — `DropdownSelect` / dropdowns family absent from `packages/septeo-ui-components/dist/index.d.ts` -> native `<select>` styled with tokens (clarify Q2, no AC change)
- Depot prime : @agent-os/standards/api/service-structure — `generateRequestConfig` / `api` from `@utils/axios` / `getSelectedCompany` absent -> `httpClient` from `src/api/httpClient.ts` and `apiURL` builders without company
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` absent -> `src/i18n/locales/{fr,en,es}.json`, parity test `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/architecture/layer-base-classes — `ICurrentDbContextFactory` absent -> `Repository<TableauContext>(context, logger)` as in `BoardRepository`
- Depot prime : @agent-os/standards/testing/testing-conventions — tests live in `Tableau.Tests/` (not `MySepteo.Api.Tests/`); API tests use `WebApplicationFactory<Program>` over SQLite in memory (not the EF In-Memory provider), as `BoardsApiTests`

## Verified facts

Front (origin/dev 6a5adfc):
- `src/pages/board/board.tsx:94-104` — `BoardPage` header — header holds Back button, title and an `Avatar`; the Share button goes there (recon inline)
- `src/pages/board/board.tsx:64-77` — `Toolbar`, `BoardCanvas` — toolbar props and canvas handlers (`onMoveItem`, `onEditItem`, `onCreateAt`) are wired here (recon inline)
- `src/components/widgets/toolbar/toolbar.tsx:6-11` — `TOOLS` — select, sticky note, shape, text tools; delete at lines 27-29; comments at 30-39 (recon inline)
- `src/types/components/toolbar.ts:3-10` — `ToolbarProps` — no read-only prop today (recon inline)
- `src/config/apiConfig.ts:7` — `CURRENT_USER_ID` — current user is the string "1" (recon inline)
- `src/api/boards/boardService.ts:9-41` — `BoardService` — static async getAll/getById/create, 204 -> [] / null, `DisplayError` (recon inline)
- `src/utils/apiURL/apiURL.ts:3-13` — `BOARDS`, `BOARD_BY_ID` — placeholder `{boardId}` replaced in services; no members or users builder (recon inline)
- `src/utils/queryKeys/boardQueryKeys.ts:1-5` — `boardKeys` — all/list/detail (recon inline)
- `src/utils/queryFunctions/boardQueryFunctions.ts:1-7` — `fetchBoards`, `fetchBoardById`, `postBoard` (recon inline)
- `src/pages/boards/components/widgets/createBoardModal/createBoardModal.tsx:20-36` — `CreateBoardModal` — library `Modal` with `open/title/onClose/footer` (recon inline)
- `src/pages/board/hooks/useDeleteCommentMutation.ts:6-25` — optimistic 4-callback mutation recipe (recon inline)
- `packages/septeo-ui-components/dist/index.d.ts:83-88` — `IconButtonProps` — no `disabled`; no Select/Dropdown export in the file (lines 109-124) (recon inline)
- `src/__tests__/pages/board/board.test.tsx:10-41` — `BoardPage` tests mock every board hook by module path; a new hook used by `board.tsx` must be mocked there (recon inline)

Back (`/tmp/.../miro/back`, origin/dev 64a78aa; paths relative to the backend root):
- `Tableau.sln` projects (git show origin/dev:Tableau.sln): `Tableau.Api`, `Tableau.Business`, `Tableau.DAL`, `Tableau.Tests`; ls-tree origin/dev: `Tableau.DAL/{Dtos,Entities,EntityTypeConfigurations,Enums,Mappers,Repositories,Seed}`, `Tableau.Business/{Exceptions,Services}`, `Tableau.Api/{Controllers,DependencyInjection,Middleware,Security}`, `Tableau.Tests/{Controllers,Data,Mappers,Services}`
- `Tableau.Business/Services/BoardService.cs:46-65` — `EnsureAccess` — 404 unknown board, 403 non-member, 403 Viewer when `requireWrite`; returns the role
- `Tableau.Business/Services/BoardItemService.cs:30,42,62` — `AddItem/UpdateItem/DeleteItem` call `EnsureAccess(requireWrite: true)`: Viewer item writes already answer 403 (FR-005 already met)
- `Tableau.Tests/Controllers/BoardsApiTests.cs:72-78` — `PatchItem_Returns403_ForViewer` — existing proof of FR-005
- `Tableau.DAL/Entities/BoardMember.cs:8-17` — `BoardMember` — BoardId, UserId, Role; `BoardMemberConfiguration.cs:11-13` table `BoardMembers`, composite key, role as string
- `Tableau.DAL/Enums/BoardRole.cs:3-8` — `BoardRole` — Viewer, Editor, Owner
- `Tableau.DAL/Repositories/BoardRepository.cs:48-62` — `GetRole`, `Add` — owner inserted as member with role Owner at board creation
- `Tableau.Api/Controllers/Controller.cs:9-12` — `ReadCurrentUserId`, `UnidentifiedUserMessage` — 401 pattern used by every action
- `Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22-30` — domain exceptions -> 400/403/404 with `{ message }`
- `Tableau.Api/DependencyInjection/AutoRegistration.cs:7-23` — `*Service` / `*Repository` auto-registered against `I<Name>`
- `Tableau.Api/Program.cs:17-31` — SQLite in memory, `EnsureCreated`, `DataSeeder.Seed`
- `Tableau.DAL/Seed/DataSeeder.cs:8-24` — `AliceId=1`, `BobId=2`, `CarolId=3`; board 1 members Alice Owner / Bob Editor / Carol Viewer; board 2 Bob Owner / Alice Editor
- No user entity, no `Users` table, no users endpoint on origin/dev (`git ls-tree` + `git grep`): the users endpoint is created in this run (intent)

Contract field sources (`contracts/board-sharing.yaml`; MCP SQL unavailable, base = SQLite in memory created by `EnsureCreated` and filled by `DataSeeder`):
- `User.id`, `User.displayName` — table `Users`, created by T001 (entity) and filled by T003 (seed): no volumetry to prove
- `BoardMember.userId`, `BoardMember.role` — table `BoardMembers`, columns `UserId`, `Role` (existing), 5 seeded rows (`DataSeeder.cs:22-32`: board 1 x3, board 2 x2)
- `BoardMember.displayName` — table `Users`, column `DisplayName`, joined on `BoardMembers.UserId` (created by T001 / T003)
- `AddBoardMember`, `UpdateBoardMember` — write payloads, stored in `BoardMembers.UserId` / `Role`

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| (back) `Tableau.DAL/Entities/User.cs` + `EntityTypeConfigurations/UserConfiguration.cs` | create | US1 |
| (back) `Tableau.DAL/TableauContext.cs` | extend | US1 |
| (back) `Tableau.DAL/Seed/DataSeeder.cs` | extend | US1 |
| (back) `Tableau.DAL/Repositories/UserRepository.cs` + interface + `Dtos/UserDto.cs` | create | US2 |
| (back) `Tableau.Business/Services/UserService.cs` + interface | create | US2 |
| (back) `Tableau.Api/Controllers/UsersController.cs` | create | US2 |
| (back) `Tableau.DAL/Repositories/BoardMemberRepository.cs` + interface + `Dtos/BoardMemberDto.cs` | create | US3 |
| (back) `Tableau.Business/Services/BoardMemberService.cs` + interface + `Dtos/AddBoardMemberDto.cs`, `Dtos/UpdateBoardMemberDto.cs` | create | US3 |
| (back) `Tableau.Api/Controllers/BoardMembersController.cs` | create | US3 |
| `src/utils/apiURL/apiURL.ts` | extend | US4, US8 |
| `src/types/mappers/boardMember/boardMemberMapper.ts` + dto, model, `src/types/enums/boardMember/boardRoleEnum.ts` | create | US4 |
| `src/api/boards/boardService.ts` | extend | US4, US7, US9 |
| `src/pages/board/hooks/useBoardMembersQuery.ts` (+ `boardQueryKeys.ts`, `boardQueryFunctions.ts`) | create | US5 |
| `src/components/widgets/toolbar/toolbar.tsx` (+ `src/types/components/toolbar.ts`) | extend | US5 |
| `src/pages/board/board.tsx` | extend | US5, US6 |
| `src/pages/board/components/widgets/shareBoardModal/shareBoardModal.tsx` (+ `src/pages/board/types/shareBoardModal.ts`) | create / extend | US6, US7, US9 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US6, US7, US9 |
| `src/pages/board/hooks/useUpdateBoardMemberRoleMutation.ts`, `useRemoveBoardMemberMutation.ts` | create | US7 |
| `src/types/mappers/user/userMapper.ts` + dto, model | create | US8 |
| `src/api/users/userService.ts`, `src/utils/queryFunctions/userQueryFunctions.ts` | create | US8 |
| `src/pages/board/hooks/useUsersQuery.ts` (+ `src/utils/queryKeys/userQueryKeys.ts`), `useAddBoardMemberMutation.ts` | create | US9 |

## Decisions

- Current user's role on the front = the entry of `GET /boards/{id}/members` whose `userId` equals `Number(CURRENT_USER_ID)` (clarify Q3) — adding `currentUserRole` to `BoardDto` rejected: extra back change for data already served.
- Viewer toolbar = editing tools not rendered (`readOnly` prop on `Toolbar`), Select and Comments kept (clarify Q1) — `IconButton` has no `disabled`; a hand-rolled disabled button would bypass the library.
- `board.tsx` ignores create / move / edit / delete while the role is Viewer, so a Viewer triggers no 403.
- While the members query is loading, the board is treated as read-only (no edit offered before the role is known).
- FR-005 (Viewer 403 on item writes) has no task: already enforced and tested on origin/dev (Verified facts).
- `BoardMemberRepository` reads `DisplayName` by joining `Users`; existence of a user is checked through `IUserService` (service-composition: a service depends on another domain's service, not its repository).
- Members ordered owner first then by display name; users ordered by display name.
- Mutations: add / re-role / remove use plain invalidate-on-success of `boardKeys.members(boardId)` and `boardKeys.detail(boardId)` (member count is server-derived), success toast in the hook.
- `parallel.yml` written: two git roots, contract written in prep -> `after: null`; back chain US1-US3, front chain US4-US9. Barrier tasks: 0 of 32, so both chains start at once; /sk-impl reads this file.

## Artifacts

spec.md, plan.md, data-model.md, contracts/board-sharing.yaml, recon.md, tasks.md, parallel.yml, checklists/requirements.md
