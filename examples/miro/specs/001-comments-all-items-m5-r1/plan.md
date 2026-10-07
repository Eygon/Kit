# Implementation Plan: Comments on every board item, with an unresolved-count badge

**Branch**: `001-comments-all-items-m5-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Part 1 (comment shapes and texts) is front-only: the comment API has no item-type restriction, only `board.tsx` gates the Comments button on sticky notes. Part 2 adds one back endpoint `GET /api/v1/boards/{boardId}/comments/counts` (contract written in prep: `contracts/comment-counts.yaml`), a front data layer for it, a badge rendered by `CanvasItem` for every item type, and an invalidation of the counts after each comment mutation.

## Technical Context

**Stack**: Front React 19 + TypeScript, @septeo/septeo-ui-components, TanStack Query, react-i18next, Vitest + Testing Library. Back (`backend` of .sk/repos.json, `Tableau.sln`) ASP.NET Core, EF Core, NUnit 4 + NSubstitute + Shouldly.
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`; back `/usr/bin/dotnet test Tableau.Tests --filter <Class>`.
**Constraints**: no request per item for the badge (FR-007); badge hidden at 0, "9+" above 9.

## Standards

Front (US1, US3, US4, US5):
- @agent-os/standards/testing/testing-patterns — mirrored tests, component test pattern
- @agent-os/standards/api/service-structure — static service method, 204 to []
- @agent-os/standards/api/url-builders — new board-level builder in apiURL
- @agent-os/standards/api/error-handling — read swallows with DisplayError
- @agent-os/standards/react/tanstack-query — key factory, query fn, hook
- @agent-os/standards/typing/model-dto-mapper — commentCount triad
- @agent-os/standards/typing/mapper-defaults — count DTO nullability resolved
- @agent-os/standards/react/component-structure — new badge element folder
- @agent-os/standards/react/i18n — badge aria-label through t()
- @agent-os/standards/react/mutation-cache-updates — invalidate server-derived counts

Back (US2):
- @agent-os/standards/controllers/controller-patterns — action on existing controller
- @agent-os/standards/controllers/http-204-no-content — empty counts return 204
- @agent-os/standards/controllers/http-response-contract — full ProducesResponseType set
- @agent-os/standards/data-access/ef-query-patterns — AsNoTracking grouped projection
- @agent-os/standards/dto/dto-shape — sealed record CommentCountDto
- @agent-os/standards/testing/testing-conventions — NUnit, NSubstitute, Shouldly AAA

- Ecart accepte : @agent-os/standards/septeo-library-first — library `Badge` (tones neutral/success/danger/info, no aria-label) replaced by a custom pill in --primary-60 with white text — the need asks for the primary colour (clarify Q2)
- Depot prime : @agent-os/standards/api/url-builders — company-scoped builder -> `BOARDS()` root without company in `src/utils/apiURL/apiURL.ts`
- Depot prime : @agent-os/standards/api/service-structure — `api` + `generateRequestConfig` -> `httpClient` of `src/api/httpClient`
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` -> `src/i18n/locales/*.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/controllers/controller-patterns — `MySepteo.Api.Controllers.V1.Controller` and `[Authorize(Policy)]` -> `Tableau.Api/Controllers/Controller.cs` with `ReadCurrentUserId()` and service-level `EnsureAccess`, as every existing controller
- Depot prime : @agent-os/standards/testing/testing-conventions — `MySepteo.Api.Tests/` -> `Tableau.Tests/`

## Verified facts

Front (origin/dev 02d8e65, recon inline):
- `src/pages/board/board.tsx:68` — `canComment` — the Comments button is offered only when the selected item type is `BoardItemTypeEnum.STICKY_NOTE`; the only type gate of the comment feature in the front.
- `src/pages/board/board.tsx:154` — `handleToggleComments` — opens the panel for `selectedItemId`, type-agnostic.
- `src/pages/board/board.tsx:170-183` — `BoardCanvas` — the board renders the canvas with `items`; place to pass the counts down.
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:65-76` — `CanvasItem` — one `CanvasItem` per item, every type.
- `src/components/widgets/canvasItem/canvasItem.tsx:24-41` — `CanvasItem` — absolute-positioned wrapper per item (`relative` parent for a top-right badge); body chosen by `BODY_BY_TYPE`.
- `src/types/components/canvasItem.ts:3-11` — `CanvasItemProps` — props to extend with the unresolved count.
- `src/pages/board/types/boardCanvas.ts:5-16` — `BoardCanvasProps` — props to extend with the counts.
- `src/api/comments/commentService.ts:16-27` — `getAll` — read recipe: httpClient.get, 204 to [], DisplayError fallback.
- `src/utils/apiURL/apiURL.ts:5` — `BOARD_BY_ID` — root to compose the board-level counts URL.
- `src/utils/queryKeys/commentQueryKeys.ts:1-4` — `commentKeys` — per-item keys only; no board-level key yet.
- `src/utils/queryFunctions/commentQueryFunctions.ts:4` — `fetchComments` — pass-through pattern to copy.
- `src/pages/board/hooks/useCommentsQuery.ts:6-11` — `useCommentsQuery` — hook pattern with `queryTimes.short`.
- `src/pages/board/hooks/useCreateCommentMutation.ts:10-12` — `onSuccess` — invalidates only the item list today.
- `src/pages/board/hooks/useUpdateCommentMutation.ts:28-30` — `onSettled` — invalidates only the item list (resolve goes through this hook).
- `src/pages/board/hooks/useDeleteCommentMutation.ts:21-23` — `onSettled` — invalidates only the item list.
- `src/__tests__/pages/board/board.test.tsx:136-143` — `does not offer the comments button for a non-sticky item` — test to invert in US1.
- `node_modules/@septeo/septeo-ui-components/dist/index.d.ts:58-61` — `BadgeProps` — tone neutral/success/danger/info, no primary, no aria-label (clarify Q2).

Back (`backend`, origin/dev cf3c0f0, read with git show / ls-tree):
- Structure: `Tableau.sln` lists `Tableau.Api\Tableau.Api.csproj`, `Tableau.Business\Tableau.Business.csproj`, `Tableau.DAL\Tableau.DAL.csproj`, `Tableau.Tests\Tableau.Tests.csproj`; ls-tree of each project folder checked at cf3c0f0.
- `Tableau.Api/Controllers/CommentsController.cs:7` — `CommentsController` — route `api/v1/boards/{boardId:int}/items/{itemId:int}/comments`, no item-type check.
- `Tableau.Business/Services/CommentService.cs:31-57` — `AddComment` — checks board access and item existence only: any item type is accepted. US1 needs no back change.
- `Tableau.Business/Services/CommentService.cs:24-29` — `GetComments` — access rule to reuse: `EnsureAccess(userId, boardId, requireWrite: false)`.
- `Tableau.Business/Services/BoardService.cs:46-57` — `EnsureAccess` — unknown board throws ResourceNotFoundException (404), non-member ForbiddenException (403).
- `Tableau.DAL/Repositories/CommentRepository.cs:16-32` — `GetByItem` — AsNoTracking + Select projection recipe.
- `Tableau.DAL/Repositories/CommentRepository.cs:34-35` — `ItemExists` — `BoardItems.BoardId` filter available for a board-level query.
- `Tableau.Api/Controllers/Controller.cs:7-13` — `Controller` — base with `ReadCurrentUserId()` and `UnidentifiedUserMessage`.
- `Tableau.Tests/Controllers/CommentsApiTests.cs:23-32` — `ClientFor` — API test client with `X-User-Id` header (WebApplicationFactory).
- `Tableau.Tests/Services/CommentServiceTests.cs:22-31` — `SetUp` — NSubstitute repository and board service.

Contract field sources (`contracts/comment-counts.yaml`):
- `itemId` — table Comments, column BoardItemId (`Tableau.DAL/Entities/Comment.cs:13`), grouped; `unresolved` — count of rows with IsResolved = false (`Tableau.DAL/Entities/Comment.cs:23`). Volumetry not measured: no SQL MCP on this station, and `Tableau.DAL/Seed/DataSeeder.cs` seeds no comment (rows are created by users through the existing POST).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/pages/board/board.tsx` | extend (canComment any type) | US1 |
| `Tableau.DAL/Repositories/CommentRepository.cs` (+ interface, `CommentCountDto.cs`) | extend | US2 |
| `Tableau.Business/Services/CommentService.cs` (+ interface) | extend | US2 |
| `Tableau.Api/Controllers/CommentsController.cs` | extend | US2 |
| `src/utils/apiURL/apiURL.ts` | extend | US3 |
| `src/api/comments/commentService.ts` (+ commentCount triad) | extend | US3 |
| `src/utils/queryKeys/commentQueryKeys.ts` | extend | US3 |
| `src/utils/queryFunctions/commentQueryFunctions.ts` | extend | US3 |
| `src/pages/board/hooks/useCommentCountsQuery.ts` | create | US3 |
| `src/components/elements/commentBadge/commentBadge.tsx` (+ props) | create | US4 |
| `src/components/widgets/canvasItem/canvasItem.tsx` (+ props) | extend | US4 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` (+ props) | extend | US4 |
| `src/pages/board/board.tsx` | mount useCommentCountsQuery | US4 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US4 |
| `src/pages/board/hooks/use{Create,Update,Delete}CommentMutation.ts` | extend | US5 |

## Decisions

- No back US for shapes and texts — the server already accepts comments on any item (Verified facts); the change is the front gate.
- One board-level counts endpoint rather than N GET comments — FR-007, clarify Q1.
- Endpoint added as an action of `CommentsController` with an absolute route (`~/api/v1/boards/{boardId:int}/comments/counts`) — a new controller would duplicate the user resolution for one action.
- Empty result returns 204 (http-204-no-content); the front maps 204 to an empty list.
- Badge in `src/components/elements/commentBadge/` — consumed by the shared widget `CanvasItem`.
- Refresh by invalidating `commentKeys.counts(boardId)` in the three mutation hooks — counts are server-derived (mutation-cache-updates).
- `parallel.yml`: the contract is written in prep, so no barrier (`after: null`); the back US2 runs in its own lane while the front chain US1, US3, US4, US5 runs in order. /sk-impl reads this file. Barrier share: 0 / 17 tasks.

## Artifacts

spec.md, plan.md, recon.md, tasks.md, checklists/requirements.md, contracts/comment-counts.yaml, parallel.yml
