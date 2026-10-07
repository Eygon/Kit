# Implementation Plan: Undo / redo on a board

**Branch**: `001-board-undo-redo-m3-r1` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

A per-board, per-session action history (create, move, text edit, delete) lives in a page-scoped hook of `src/pages/board/`, fed by the existing handlers of `board.tsx` and replaying inverses through the existing item mutations. The toolbar gains Undo / Redo buttons (US1), a window keydown hook adds the shortcuts (US2), and the current user's role, read from the existing members endpoint, hides both for a Viewer (US3). Front only; no back change.

## Technical Context

**Stack**: React 19, TypeScript strict, TanStack Query v5, react-i18next (fr/en/es), Tailwind v4 with Septeo tokens, `@septeo/septeo-ui-components`, Vitest + Testing Library (CLAUDE.md, package.json).
**Gates**: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`, `npm run typecheck`, `npx eslint src`.
**Constraints**: no new back endpoint (intent); history is client memory only (lost on reload); the error toast comes from the item service (`DisplayError`), never re-toasted in a hook.

## Standards

- @agent-os/standards/react/hooks — history and shortcuts hooks, named-object return
- @agent-os/standards/accessibility/icons-and-labels — icon-only undo/redo buttons need names
- @agent-os/standards/react/i18n — tooltips and accessible names via t()
- @agent-os/standards/testing/testing-patterns — mirrored tests, hook state transitions
- @agent-os/standards/constants — history cap BOARD_HISTORY_LIMIT
- @agent-os/standards/api/service-structure — new BoardMemberService class
- @agent-os/standards/api/url-builders — BOARD_MEMBERS builder in apiURL
- @agent-os/standards/react/tanstack-query — members query key / function / hook
- @agent-os/standards/typing/model-dto-mapper — boardMember triad
- @agent-os/standards/api/error-handling — read swallows, writes toast once
- Depot prime : @agent-os/standards/api/service-structure — `generateRequestConfig`, `getSelectedCompany`, `api` from `@utils/axios/axiosUtils` absent -> `httpClient` of `src/api/httpClient.ts` (identity header set there), no company segment
- Depot prime : @agent-os/standards/api/url-builders — tenant `company` parameter absent -> builders without parameter composed from `BOARD_BY_ID` (`src/utils/apiURL/apiURL.ts`)
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` absent -> `src/i18n/locales/{fr,en,es}.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/constants — `src/utils/<topic>/` placement; feature-local constant goes to `src/pages/board/utils/boardHistoryConstants.ts`

## Verified facts

- `src/pages/board/board.tsx:41-43` — `useUpdateBoardItemMutation`, `useCreateBoardItemMutation`, `useDeleteBoardItemMutation` — the page already owns the three item mutations (recon inline)
- `src/pages/board/board.tsx:53-57` — `handleCreateAt` — creation point: `createItem(buildNewItem(type, x, y))`, no onSuccess yet (recon inline)
- `src/pages/board/board.tsx:60-65` — `handleDelete` — delete point; the full item is the selected item computed above it (recon inline)
- `src/pages/board/board.tsx:85` — `onMoveItem` — move commits `{ x, y }` rounded; previous position readable from `boardItems` before the call (recon inline)
- `src/pages/board/board.tsx:100-103` — `onSave` — text edit commits the new content; the previous text is the editing item computed at the top of the page (recon inline)
- `src/pages/board/board.tsx:74-78` — `Toolbar` mount — props passed today: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments (recon inline)
- `src/hooks/useItemDrag.ts:36-40` — `onPointerUp` — a drag commits ONCE on pointer up, from the origin kept in a ref; no commit below the drag threshold: one gesture = one onMoveItem call (recon inline)
- `src/components/widgets/toolbar/toolbar.tsx:22-39` — `Toolbar` — tools rendered as `Tooltip` + `IconButton`; delete and comments buttons follow (recon inline)
- `packages/septeo-ui-components/dist/index.d.ts:83-88` — `IconButtonProps` — no disabled prop (recon inline)
- `packages/septeo-ui-components/dist/index.d.ts:7-14` — `ButtonProps` — icon and disabled, no aria-label (recon inline)
- `packages/septeo-ui-components/dist/index.js:8-19` — `Button` — renders a native button with `disabled` and children: an sr-only span gives its name (recon inline)
- `src/pages/board/hooks/useUpdateBoardItemMutation.ts:16-31` — `onMutate` — optimistic update with rollback on error; mutateAsync rejects on failure (recon inline)
- `src/pages/board/hooks/useCreateBoardItemMutation.ts:9-14` — `postBoardItem` — resolves with the created item (recon inline)
- `src/api/boardItems/boardItemService.ts:28-36` — `create` — maps the created DTO to a BoardItem with its server id (recon inline)
- `src/api/boardItems/boardItemService.ts:38-58` — `DisplayError` — update / remove toast then rethrow (recon inline)
- `src/utils/displayError/getErrorTranslationKey.ts:11-12` — `NOT_FOUND` — 404 maps to errors.notFound: the failed-undo toast already exists (recon inline)
- `src/types/models/boardItem/newBoardItem.ts:1-11` — `NewBoardItem` — type, x, y, width, height, color?, content?: a deleted item can be re-created from its fields (recon inline)
- `src/config/apiConfig.ts:7` — `CURRENT_USER_ID` — the string "1": compare with the member userId as a string (recon inline)
- `src/utils/apiURL/apiURL.ts:5` — `BOARD_BY_ID` — root to compose `BOARD_MEMBERS` (recon inline)
- `src/pages/board/hooks/useBoardQuery.ts:18-23` — `useBoardQuery` — model for a page-scoped query hook with queryTimes.short (recon inline)
- `src/__tests__/pages/board/board.test.tsx:33-36` — `useUpdateBoardItemMutation` — the page test mocks the three mutation hooks with mutate only (recon inline)
- Backend (read-only, `origin/dev` @ f5fb5c2, `Tableau.sln` -> Tableau.Api, Tableau.Business, Tableau.DAL, Tableau.Tests; `ls-tree Tableau.DAL/`: Dtos, Entities, Enums, Mappers, Repositories, Seed):
  - `Tableau.Api/Controllers/BoardMembersController.cs:7-26` — `GetAll` — GET `api/v1/boards/{boardId}/members`, 200 list / 204 empty
  - `Tableau.Business/Services/BoardMemberService.cs:22-26` — `GetMembers` — `requireWrite: false`: a Viewer can read the list
  - `Tableau.DAL/Dtos/BoardMemberDto.cs:9-15` — `UserId` — fields UserId, DisplayName, Role, serialized as userId, displayName, role
  - `Tableau.DAL/Enums/BoardRole.cs:5-7` — `Viewer` — Viewer / Editor / Owner
  - `Tableau.Api/Program.cs:15` — `JsonStringEnumConverter` — role serialized as the strings Viewer / Editor / Owner
  - `Tableau.Business/Services/BoardService.cs:59-61` — writes refused (403) for a Viewer
  - `Tableau.DAL/Seed/DataSeeder.cs:30-32` — `BoardRole` — data source of role: BoardMember rows seeded Owner / Editor / Viewer; SQL MCP unavailable, volume not measured
  - `Tableau.DAL/Repositories/BoardMemberRepository.cs:16-20` — `GetByBoard` — query that serves the members list

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/pages/board/utils/boardHistory.ts` (+ `src/pages/board/types/boardHistory.ts`, `src/pages/board/types/boardActionKindEnum.ts`, `src/pages/board/utils/boardHistoryConstants.ts`) | create | US1 |
| `src/pages/board/hooks/useBoardHistory.ts` | create | US1 |
| `src/components/widgets/toolbar/toolbar.tsx` (+ `src/types/components/toolbar.ts`) | extend | US1 |
| `src/pages/board/board.tsx` | extend / mount | US1, US2, US3 |
| `src/i18n/locales/fr.json`, `en.json`, `es.json` | extend | US1 |
| `src/pages/board/hooks/useBoardHistoryShortcuts.ts` | create | US2 |
| `src/types/mappers/boardMember/boardMemberMapper.ts` (+ dto, model, `src/types/enums/boardMember/boardRoleEnum.ts`) | create | US3 |
| `src/api/boardMembers/boardMemberService.ts` (+ `BOARD_MEMBERS` in `src/utils/apiURL/apiURL.ts`) | create | US3 |
| `src/pages/board/hooks/useCurrentUserBoardRoleQuery.ts` (+ `src/utils/queryKeys/boardMemberQueryKeys.ts`, `src/utils/queryFunctions/boardMemberQueryFunctions.ts`) | create | US3 |

## Decisions

- History = pure functions over `{ undo, redo }` stacks (`boardHistory.ts`) + one hook that executes inverses with `mutateAsync` — keeps the cap / redo-clear / remap rules unit-testable without React; a reducer inside the hook was rejected (untestable without rendering).
- An action is recorded in the `onSuccess` of the original mutation call in `board.tsx` (create needs the server id; a failed write must not enter the history).
- Undo of a delete re-creates the item from its fields; the new id replaces the old one in both stacks (`remapItemId`).
- A failed inverse (rejected `mutateAsync`) drops the action; no toast in the hook (the service already toasted once, api/error-handling).
- Buttons: library `Button` (variant ghost, size sm, `icon`, `disabled`) with an sr-only `t()` label inside the existing `Tooltip`, because `IconButton` has no `disabled` (clarify, late question).
- Role: `GET /boards/{boardId}/members` filtered on `CURRENT_USER_ID` through a `select`; unknown role (loading, error, not found) = no undo/redo.
- No parallel.yml: one git root touched (back is read-only), US share `board.tsx`.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md, contracts/boardMembers.yaml
