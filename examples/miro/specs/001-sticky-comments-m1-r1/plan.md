# Implementation Plan: Sticky note comments

**Branch**: `001-sticky-comments-m1-r1` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Add a `Comment` entity and a comments REST resource under `/api/v1/boards/{boardId}/items/{itemId}/comments` in the back (Tableau, .NET 8), and a right side comments panel on the board page of the front (React 19), opened from a new toolbar button when a sticky note is selected. The contract `contracts/comments.yaml` is written in prep, so back (US1-US3) and front (US4-US7) run as two parallel chains.

## Technical Context

**Stack**: front — React 19, TypeScript strict, TanStack Query v5, react-i18next (fr/en/es), Tailwind v4 with Septeo CSS-var tokens, Vitest + Testing Library, `@septeo/septeo-ui-components` (local package). Back — .NET 8 Web API controllers, EF Core + SQLite in memory (`EnsureCreated`), NUnit 4 + NSubstitute + Shouldly, `WebApplicationFactory<Program>` API tests.
**Gates**: front — `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`. Back — `/usr/bin/dotnet build Tableau.sln`, `/usr/bin/dotnet test Tableau.Tests --filter <Class>`.
**Constraints**: two git roots (front = this repo, back = `.sk/repos.json` backend); no migrations (schema by `EnsureCreated`); identity = `X-User-Id` header; no user directory (author label derived in the front).

## Design de reference

- Contract: [design.md](./design.md) — variant b (EDITMODE), comfortable density, right side.
- Lib <-> design arbitrations (design.md §5): A1 --elev-3 -> lib Drawer shadow; A2 13px -> --font-size-small; A3 native elements styled to the pixel for panel container, close button, count pill, empty state, textarea and Send button (lib components expose no className); A4 Skeleton + ErrorBanner for loading/error; A5 edit mode reuses C8/C6 values; P1-P6 nearest installed tokens.
- Rule: every value of design.md is a requirement; a deviation = FAIL review.

## Standards

Front (`agent-os/standards/index.yml`, alwaysInject applied on top):
- @agent-os/standards/api/service-structure — CommentService static class, 204 semantics
- @agent-os/standards/api/url-builders — comments URL builders in apiURL
- @agent-os/standards/api/error-handling — reads swallow, writes rethrow
- @agent-os/standards/react/tanstack-query — comment keys, query functions, hooks
- @agent-os/standards/typing/model-dto-mapper — comment model/dto/mapper triad
- @agent-os/standards/react/component-structure — panel and item component folders
- @agent-os/standards/react/i18n — all panel labels via t()
- @agent-os/standards/accessibility/icons-and-labels — close and toolbar icon-only buttons
- @agent-os/standards/react/mutation-cache-updates — create/update/delete comment mutations
- @agent-os/standards/typing/partial-update-builder — PATCH comment payload builder

Back (`agent-os/standards/index.yml` of the backend on origin/dev, alwaysInject applied on top):
- @agent-os/standards/data-access/ef-entity-type-configuration — CommentConfiguration wired by attribute
- @agent-os/standards/data-access/dbcontext-conventions — Comments DbSet expression-bodied
- @agent-os/standards/mappers/manual-mappers — CommentMapper extension methods
- @agent-os/standards/dto/dto-shape — sealed records with XML docs
- @agent-os/standards/controllers/http-response-contract — full ProducesResponseType sets
- @agent-os/standards/controllers/http-204-no-content — empty comment list returns 204
- @agent-os/standards/data-access/ef-query-patterns — AsNoTracking + Select reads
- @agent-os/standards/error-handling/domain-exceptions — 400/403/404 via middleware
- @agent-os/standards/dto/dto-cross-field-validation — no-op PATCH rejected
- @agent-os/standards/services/service-validation — trim/length/author rules in service

- Ecart accepte : @agent-os/standards/septeo-library-first — native `<aside>`, `<button>`, `<textarea>`, checkbox `<input>` for C2, C3 close, C5, C6 actions, C7, C8 instead of Drawer/IconButton/Button/Textarea/Badge/EmptyState — the installed lib exposes no className and cannot reach design.md values — (clarify Q3)
- Depot prime : @agent-os/standards/api/service-structure — `generateRequestConfig` + axios `api` -> `httpClient` (`src/api/httpClient.ts`)
- Depot prime : @agent-os/standards/api/url-builders — company-scoped builders -> unscoped builders of `src/utils/apiURL/apiURL.ts`
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and esTranslations test -> `src/i18n/locales/*.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/dto/dto-cross-field-validation — `Optional<T>` + class-level attribute -> nullable fields + `HasAnySuppliedValue` checked in the service (`Tableau.DAL/Dtos/UpdateBoardItemDto.cs`)
- Depot prime : @agent-os/standards/services/service-validation — `DtoValidation` helpers -> inline guards throwing `BadRequestException`
- Depot prime : @agent-os/standards/architecture/layer-base-classes — `ICurrentDbContextFactory` -> `Repository<TableauContext>(context, logger)`

## Verified facts

Front (this repo, origin/dev 90c2e49):
- `src/pages/board/board.tsx:23` — `useBoardInteractions` — board page owns tool/selection/editing state.
- `src/pages/board/board.tsx:45-66` — `renderCanvas` — Toolbar, BoardCanvas and EditItemPanel are rendered inside the relative canvas container; the comments panel mounts here.
- `src/pages/board/hooks/useBoardInteractions.ts:4-10` — `useBoardInteractions` — returns tool, selectedItemId, editingItemId and setters.
- `src/components/widgets/toolbar/toolbar.tsx:13-31` — `Toolbar` — IconButton + Tooltip per tool, delete button with `onDelete`; Comments button goes after it.
- `src/types/components/toolbar.ts:3-7` — `ToolbarProps` — activeTool, onToolChange, onDelete.
- `src/components/widgets/canvasItem/canvasItem.tsx:14-33` — `CanvasItem` — pointer down selects the item (`onSelect(item.id)`).
- `src/types/enums/boardItem/boardItemTypeEnum.ts:1-5` — `BoardItemTypeEnum.STICKY_NOTE` — value "StickyNote".
- `src/api/boardItems/boardItemService.ts:11-58` — `BoardItemService` — model for service: withBoardId/withItemId helpers, 204 -> [], reads swallow, writes rethrow.
- `src/api/httpClient.ts:10-36` — `httpClient` — sends X-User-Id = CURRENT_USER_ID, returns `{ status, data }`, data null on 204.
- `src/utils/apiURL/apiURL.ts:7-9` — `BOARD_ITEMS`, `BOARD_ITEM_BY_ID` — `{boardId}`/`{itemId}` placeholders.
- `src/utils/queryKeys/boardItemQueryKeys.ts:1-4` — `boardItemKeys` — all/list factory.
- `src/utils/queryFunctions/boardItemQueryFunctions.ts:5-12` — pass-through functions.
- `src/pages/board/hooks/useBoardItemsQuery.ts:6-11` — `useBoardItemsQuery` — queryTimes.short.
- `src/pages/board/hooks/useUpdateBoardItemMutation.ts:12-32` — optimistic 4-callback mutation model.
- `src/types/mappers/boardItem/boardItemMapper.ts:9-26` — DtoToModel with defaults, changes -> DTO filtering undefined.
- `src/config/apiConfig.ts:7` — `CURRENT_USER_ID = "1"` — current user id (string).
- `src/components/elements/boardCard/boardCard.tsx:17` — `t("pages.boards.ownerName", { id })` — author label pattern.
- `src/components/elements/errorBanner/errorBanner.tsx:5-22` — `ErrorBanner` — error state with retry.
- `src/utils/formatDate/formatDate.ts:1-4` — `formatDate` — absolute short date only; no relative formatter exists.
- `src/i18n/locales/fr.json` — `pages.board.*` keys; no `comments` key yet.
- `node_modules/@septeo/septeo-ui-components/dist/index.d.ts` — Drawer, IconButton, Button, Textarea, Badge, EmptyState have no className prop; no Checkbox export.
- `node_modules/@septeo/septeo-ui-components/dist/septeo.css` — installed tokens: primary-05/60/90, neutral-00/05/10/60/90, danger-60, success-60, font-size-small/normal/base, line-height-small, radius, radius-tiny, spacing-1..8.
- No test for `src/pages/board/board.tsx` exists; `src/__tests__/components/widgets/toolbar/toolbar.test.tsx` and `src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx` exist.

Back (backend repo, origin/dev 8e8b4c3; read with git show / ls-tree):
- `Tableau.sln` — projects: Tableau.Api, Tableau.Business, Tableau.DAL, Tableau.Tests (git show origin/dev:Tableau.sln | grep csproj).
- `ls-tree origin/dev Tableau.DAL/` — Dtos, Entities, EntityTypeConfigurations, Enums, Mappers, Repositories(+Interfaces), Seed, TableauContext.cs, BaseDbContext.cs.
- `Tableau.Api/Controllers/BoardItemsController.cs:7-78` — route `api/v1/boards/{boardId:int}/items`, ReadCurrentUserId -> 401, GET 204 on empty, POST Created, PATCH Ok, DELETE NoContent.
- `Tableau.Business/Services/BoardService.cs:46-65` — `EnsureAccess` — 404 unknown board, 403 non-member, returns BoardRole.
- `Tableau.Business/Services/BoardItemService.cs:22-69` — service model (EnsureAccess, TimeProvider UTC, GetTracked/Apply/Save).
- `Tableau.DAL/Repositories/BoardItemRepository.cs:16-69` — read projection AsNoTracking + Select, tracked writes.
- `Tableau.DAL/TableauContext.cs:12-16` — DbSets expression-bodied.
- `Tableau.DAL/EntityTypeConfigurations/BoardItemConfiguration.cs:7-17` — internal sealed config, MaxLength 2000 on Content.
- `Tableau.DAL/Entities/BoardMember.cs:8-16`, `Tableau.DAL/Enums/BoardRole.cs:3-8` — roles Viewer/Editor/Owner.
- `Tableau.Api/DependencyInjection/AutoRegistration.cs:7-24` — `*Service`/`*Repository` auto-registered Scoped.
- `Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22-30` — 400/403/404 mapping with `{ message }`.
- `Tableau.Api/Program.cs:17-31` — SQLite in memory, EnsureCreated, DataSeeder.
- `Tableau.DAL/Seed/DataSeeder.cs:8-10` — users 1 (Owner board 1), 2 (Editor), 3 (Viewer).
- `Tableau.Tests/Services/BoardItemServiceTests.cs:12-26` — NSubstitute repo + IBoardService mocks.
- `Tableau.Tests/Controllers/BoardsApiTests.cs:13-31` — WebApplicationFactory, `ClientFor(userId)` adds X-User-Id.
- No user/name table exists in the back: author name has no source (clarify Q1 -> front-derived label).
- Contract field id — base Tableau (SQLite in memory), table Comments, column Id — volumetry 0 (new table, US1).
- Contract field boardItemId — base Tableau, table Comments, column BoardItemId (FK BoardItems.Id; BoardItems seeded with 6 rows, `Tableau.DAL/Seed/DataSeeder.cs:25-34`) — volumetry 0 (new table).
- Contract field authorId — base Tableau, table Comments, column AuthorId (X-User-Id 1-3, `Tableau.DAL/Seed/DataSeeder.cs:8-10`) — volumetry 0 (new table).
- Contract field body — base Tableau, table Comments, column Body (max 2000) — volumetry 0 (new table).
- Contract field createdAt — base Tableau, table Comments, column CreatedAt (UTC, TimeProvider) — volumetry 0 (new table).
- Contract field updatedAt — base Tableau, table Comments, column UpdatedAt (UTC, TimeProvider) — volumetry 0 (new table).
- Contract field isResolved — base Tableau, table Comments, column IsResolved (default false) — volumetry 0 (new table).
- Contract fields: all `CommentDto` fields are served by the new `Comments` table created in US1 (no existing database to query; SQLite in memory, no MCP SQL on this host).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `Tableau.DAL/Entities/Comment.cs` | create | US1 |
| `Tableau.DAL/EntityTypeConfigurations/CommentConfiguration.cs` | create | US1 |
| `Tableau.DAL/TableauContext.cs` | extend (Comments DbSet) | US1 |
| `Tableau.DAL/Dtos/CommentDto.cs` | create (with mapper) | US1 |
| `Tableau.DAL/Mappers/CommentMapper.cs` | create | US1 |
| `Tableau.DAL/Repositories/CommentRepository.cs` (+ `Interfaces/ICommentRepository.cs`) | create | US2 |
| `Tableau.Business/Services/CommentService.cs` (+ `Interfaces/ICommentService.cs`) | create | US2 |
| `Tableau.DAL/Dtos/CreateCommentDto.cs` | create (with service) | US2 |
| `Tableau.Api/Controllers/CommentsController.cs` | create | US2 |
| `Tableau.DAL/Repositories/CommentRepository.cs` | extend | US3 |
| `Tableau.Business/Services/CommentService.cs` | extend | US3 |
| `Tableau.DAL/Dtos/UpdateCommentDto.cs` | create (with service) | US3 |
| `Tableau.Api/Controllers/CommentsController.cs` | extend | US3 |
| `src/utils/apiURL/apiURL.ts` | extend | US4 |
| `src/types/mappers/comment/commentMapper.ts` (+ `commentDto.ts`, `createCommentDto.ts`, `updateCommentDto.ts`, `comment.ts`) | create | US4 |
| `src/api/comments/commentService.ts` | create | US4 |
| `src/utils/formatRelativeTime/formatRelativeTime.ts` | create | US4 |
| `src/utils/queryKeys/commentQueryKeys.ts` | create | US5 |
| `src/utils/queryFunctions/commentQueryFunctions.ts` | create | US5 |
| `src/pages/board/hooks/useCommentsQuery.ts` | create | US5 |
| `src/pages/board/components/widgets/commentsPanel/commentItem/commentItem.tsx` (+ `src/pages/board/types/commentItem.ts`) | create | US5 |
| `src/pages/board/components/widgets/commentsPanel/commentsPanel.tsx` (+ `src/pages/board/types/commentsPanel.ts`) | create | US5 |
| `src/i18n/locales/{fr,en,es}.json` | extend (all comment keys) | US5 |
| `src/components/widgets/toolbar/toolbar.tsx` (+ `src/types/components/toolbar.ts`) | extend | US6 |
| `src/pages/board/hooks/useBoardInteractions.ts` | extend | US6 |
| `src/pages/board/board.tsx` | mount | US6 |
| `src/pages/board/hooks/useCreateCommentMutation.ts` | create | US7 |
| `src/pages/board/hooks/useUpdateCommentMutation.ts` | create | US7 |
| `src/pages/board/hooks/useDeleteCommentMutation.ts` | create | US7 |
| `src/pages/board/components/widgets/commentsPanel/commentComposer/commentComposer.tsx` (+ `src/pages/board/types/commentComposer.ts`) | create | US7 |
| `src/pages/board/components/widgets/commentsPanel/commentItem/commentItem.tsx` | extend | US7 |
| `src/pages/board/components/widgets/commentsPanel/commentsPanel.tsx` | extend | US7 |

Sizes (clarify Q4, re-split at tasks time): each US stays at 8 files or fewer including companions; US7 carries 7 production files (LOCALES counted as one).

## Decisions

- Author display = `t("pages.boards.ownerName", { id: authorId })`, initials from that label — no user table in the back (clarify Q1).
- Item existence is checked in `CommentRepository` (`BoardItems` of the same context, boardId + itemId) so `CommentService` depends only on `IBoardService` and its own repository (service-composition).
- Membership only (`EnsureAccess(requireWrite: false)`) for read, post and resolve; body edit author-only; delete author or `BoardRole.Owner` (clarify Q4).
- `MaxBodyLength = 2000` named constant in the back; front relies on the API for the limit (no client-side counter in the design).
- Panel state (`commentsItemId`) lives in `useBoardInteractions`; the Comments toolbar button is rendered only when the selected item is a sticky note and the tool is SELECT.
- Relative time via `Intl.RelativeTimeFormat` in a new util (no existing formatter).
- parallel.yml: back chain `[US1, US2, US3]` and front chain `[US4, US5, US6, US7]`, `after: null` since the contract is written in prep; barrier tasks 0 / 28 — /sk-impl reads parallel.yml.

## Artifacts

spec.md, plan.md, tasks.md, design.md, data-model.md, contracts/comments.yaml, recon.md, parallel.yml, checklists/requirements.md.
