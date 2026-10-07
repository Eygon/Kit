# Implementation Plan: Lock a board item

**Branch**: `001-lock-item-m11-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add an `isLocked` flag to board items, end to end. Back (Tableau, second git root): entity + DTOs + mappers + repository carry the flag (US1), and the item service refuses any change or deletion of a locked item with a new `ConflictException` mapped to 409 (US2). Front: the mapper exposes the flag, the toolbar offers a padlock toggle to editors/owner, the canvas item shows a padlock and does not drag when locked, and the board page blocks edit/delete (US3); lock/unlock enter the undo history and undo/redo on a locked item toasts instead of patching, and a 409 gets its own translated toast (US4). The contract `contracts/board-items-lock.yaml` is written in prep.

## Technical Context

**Stack**: front React 19 + TypeScript 6, `@septeo/septeo-ui-components`, TanStack Query, react-i18next, Vitest + Testing Library; back ASP.NET Core (net8.0), EF Core on SQLite in-memory (`EnsureCreated`, no migrations), NUnit 4 + NSubstitute + Shouldly, `WebApplicationFactory<Program>` integration tests.
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`; back `/usr/bin/dotnet test Tableau.Tests --filter <Class>`.
**Constraints**: schema created by `EnsureCreated` at startup (no migration file, standard ef-no-migrations); live sync relies on the existing `NotifyBoardChanged` after every PATCH/DELETE.

## Standards

Back (Tableau, origin/dev):
- @agent-os/standards/dto/dto-shape — new DTO properties, sealed records, XML docs
- @agent-os/standards/mappers/manual-mappers — extend existing static mappers
- @agent-os/standards/error-handling/domain-exceptions — 409 via a domain exception
- @agent-os/standards/services/service-validation — lock guard lives in the service
- @agent-os/standards/controllers/http-response-contract — declare the new 409
- @agent-os/standards/testing/testing-conventions — NUnit/NSubstitute/Shouldly tests
- Ecart accepte : @agent-os/standards/error-handling/domain-exceptions — only three domain exceptions (400/403/404) reach the client — a fourth `ConflictException` mapped to 409 is added, as the need demands a conflict status (clarify Q2)
- Depot prime : @agent-os/standards/error-handling/domain-exceptions — `MySepteo.Api.Exceptions` and `TranslationCode` absent -> `Tableau.Business/Exceptions`, message only
- Depot prime : @agent-os/standards/testing/testing-conventions — `MySepteo.Api.Tests/` absent -> `Tableau.Tests/` (integration tests through `WebApplicationFactory<Program>` exist and are kept)
- Depot prime : @agent-os/standards/mappers/manual-mappers — `MySepteo.Api.Mappers/` absent -> `Tableau.DAL/Mappers/`
- Depot prime : @agent-os/standards/services/service-validation — `DtoValidation` helpers absent -> inline guard throwing the domain exception

Front (origin/dev):
- @agent-os/standards/accessibility/icons-and-labels — padlock toggle and icon names
- @agent-os/standards/react/i18n — new labels and toasts
- @agent-os/standards/typing/mapper-defaults — `isLocked ?? false` in mappers
- @agent-os/standards/testing/testing-patterns — mapper cases, component tests
- @agent-os/standards/api/error-handling — 409 toast through `DisplayError` once
- @agent-os/standards/http-status — `HttpStatusCodeEnum.CONFLICT` check
- @agent-os/standards/react/hooks — history hook extension
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` absent -> `src/i18n/locales/{fr,en,es}.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/http-status — `@prjTypes/enums/httpStatusCode` absent -> `HttpStatusCodeEnum` in `src/enums/httpStatusCodeEnum.ts`

## Verified facts

Back (`/tmp/.../miro/back`, origin/dev @ 5a17075). Structure read on the integration branch: `Tableau.sln` lists `Tableau.Api\Tableau.Api.csproj`, `Tableau.Business\Tableau.Business.csproj`, `Tableau.DAL\Tableau.DAL.csproj`, `Tableau.Tests\Tableau.Tests.csproj`; `git ls-tree origin/dev Tableau.Tests/` = Controllers, Data, Hubs, Mappers, Security, Services; `Tableau.Business/Exceptions/` = BadRequestException, ForbiddenException, ResourceNotFoundException (no conflict exception).
- `Tableau.DAL/Entities/BoardItem.cs:8-39` — `BoardItem` — entity without any lock column; the new `IsLocked` column is created by T001 (EF `EnsureCreated`, no migration).
- `Tableau.DAL/Dtos/BoardItemDto.cs:6-46` — `BoardItemDto` — read DTO, no lock field.
- `Tableau.DAL/Dtos/UpdateBoardItemDto.cs:40-42` — `HasAnySuppliedValue` — must include the new `IsLocked` so a lock-only PATCH is not rejected as empty.
- `Tableau.DAL/Dtos/BoardFileItemDto.cs:6-37` — `BoardFileItemDto` — export/import item, no lock field.
- `Tableau.DAL/Mappers/BoardItemMapper.cs:11-26` — `ToBoardItemDto` — entity to DTO.
- `Tableau.DAL/Mappers/BoardFileMapper.cs:8-20` — `ToBoardFileItemDto` — export mapping; `Tableau.DAL/Mappers/BoardFileMapper.cs:29-42` — `ToBoardItem` — import mapping.
- `Tableau.DAL/Repositories/BoardItemRepository.cs:16-38` — `GetByBoard` — hand-written `Select` projection, must list `IsLocked`.
- `Tableau.DAL/Repositories/BoardItemRepository.cs:57-69` — `Apply` — field-by-field PATCH application.
- `Tableau.Business/Services/BoardItemService.cs:45-64` — `UpdateItem` — `EnsureAccess(requireWrite: true)` then `GetTracked` then `Apply`; the lock guard goes between `GetTracked` and `Apply`.
- `Tableau.Business/Services/BoardItemService.cs:66-73` — `DeleteItem` — lock guard after `GetTracked`.
- `Tableau.Business/Services/BoardService.cs:46-65` — `EnsureAccess` — Viewer + requireWrite -> `ForbiddenException`: the lock change is already reserved to editor/owner.
- `Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22-31` — `InvokeAsync` — maps the three domain exceptions; 409 must be added here.
- `Tableau.Api/Controllers/BoardItemsController.cs:49-84` — `Patch` — calls `NotifyBoardChanged` after every update/delete: live sync of the lock (F8) needs no new event.
- `Tableau.Business/Services/BoardTransferService.cs:34-52` — `ExportBoard` — maps items with `ToBoardFileItemDto`; `Tableau.Business/Services/BoardTransferService.cs:54-81` — `ImportBoard` — maps with `ToBoardItem`.
- `Tableau.Api/Program.cs:22-45` — `SqliteConnectionStringBuilder` — in-memory SQLite + `EnsureCreated`: source of the new column = entity property created by T001, no volumetry (no persisted base).
- Contract field `isLocked` (BoardItemDto, UpdateBoardItemDto, BoardFileItemDto): source = column `BoardItems.IsLocked` created by T001 (entity `BoardItem`), default false; no existing row to verify (SQLite in-memory seeded at startup by `Tableau.DAL/Seed/DataSeeder.cs`, which sets no lock).

Front (origin/dev @ 57cb42b):
- `src/types/dtos/boardItem/boardItemDto.ts:3-17` — `BoardItemDto` — no lock field.
- `src/types/dtos/boardItem/updateBoardItemDto.ts:1-9` — `UpdateBoardItemDto` — no lock field.
- `src/types/models/boardItem/boardItem.ts:4-18` — `BoardItem` — model, no lock field.
- `src/types/models/boardItem/boardItemChanges.ts:3` — `BoardItemChanges` — `Pick` of patchable fields; adding `isLocked` lets the existing PATCH path send it.
- `src/types/mappers/boardItem/boardItemMapper.ts:10-29` — `boardItemDtoToModel` — DTO to model with defaults; `boardItemChangesToDto` filters undefined.
- `src/types/dtos/board/boardFileItemDto.ts:3-14` — `BoardFileItemDto` — front only reads files to import (passes them through); export downloads the server JSON: no front change needed for F9.
- `src/api/boardItems/boardItemService.ts:38-49` — `update` — PATCH with `DisplayError` + rethrow.
- `src/utils/displayError/getErrorTranslationKey.ts:4-16` — `getErrorTranslationKey` — no 409 case (falls to `errors.generic`).
- `src/enums/httpStatusCodeEnum.ts:1-12` — `HttpStatusCodeEnum` — `CONFLICT = 409` already present.
- `src/components/widgets/toolbar/toolbar.tsx:16-79` — `Toolbar` — holds the selection-dependent actions (delete, connector style, comments) and hides write actions when `readOnly`.
- `src/components/widgets/canvasItem/canvasItem.tsx:17-47` — `CanvasItem` — wires `useItemDrag` handlers on pointer events; selection happens before drag.
- `src/hooks/useItemDrag.ts:20-51` — `useItemDrag` — commits via `onCommit` only after a move beyond the threshold.
- `src/pages/board/board.tsx:73-82` — `canUseHistory` — role from `useCurrentUserBoardRoleQuery` (editor/owner); `isReadOnly` derived from members (unknown role = read-only).
- `src/pages/board/board.tsx:130-170` — `handleDelete` — delete, move and save handlers, each recording a history action.
- `src/pages/board/hooks/useBoardHistory.ts:60-90` — `applyUndo` — switch over action kinds; `src/pages/board/hooks/useBoardHistory.ts:92-104` — `replay` — commits the step before applying and drops the entry on failure.
- `src/pages/board/types/boardHistory.ts:6-10` — `BoardAction` — union of CREATE/DELETE/MOVE/EDIT_TEXT.
- `src/pages/board/utils/boardHistory.ts:29-34` — `remapAction` — handles any `itemId` action generically: a LOCK action needs no change there.
- `src/pages/board/hooks/useBoardHub.ts:91-94` — `handleBoardChanged` — invalidates `boardItemKeys.all(boardId)` on BoardChanged: a remote lock arrives live (F8, reused, untouched).

## Project Structure (files touched)

| Fichier | Action | US |
|---|---|---|
| `Tableau.DAL/Mappers/BoardItemMapper.cs` (+ `Entities/BoardItem.cs`, `Dtos/BoardItemDto.cs`) | etendre | US1 |
| `Tableau.DAL/Repositories/BoardItemRepository.cs` (+ `Dtos/UpdateBoardItemDto.cs`) | etendre | US1 |
| `Tableau.DAL/Mappers/BoardFileMapper.cs` (+ `Dtos/BoardFileItemDto.cs`) | etendre | US1 |
| `Tableau.Business/Exceptions/ConflictException.cs` | creer | US2 |
| `Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs` | etendre | US2 |
| `Tableau.Business/Services/BoardItemService.cs` | etendre | US2 |
| `Tableau.Api/Controllers/BoardItemsController.cs` | etendre | US2 |
| `src/types/mappers/boardItem/boardItemMapper.ts` (+ dto, model, changes) | etendre | US3 |
| `src/components/widgets/toolbar/toolbar.tsx` (+ `src/types/components/toolbar.ts`) | etendre | US3 |
| `src/components/widgets/canvasItem/canvasItem.tsx` | etendre | US3 |
| `src/pages/board/board.tsx` | etendre | US3, US4 |
| `src/i18n/locales/{fr,en,es}.json` | etendre | US3, US4 |
| `src/pages/board/hooks/useBoardHistory.ts` (+ enum, union) | etendre | US4 |
| `src/utils/displayError/getErrorTranslationKey.ts` | etendre | US4 |

## Decisions

- Lock toggle in the existing `Toolbar` (selection-dependent actions already live there) — a floating per-item bar would be a new component with its own pointer handling (clarify Q1).
- 409 through a new `ConflictException` mapped in the middleware — 400 would hide the intent and the front could not tell it apart (clarify Q2).
- A PATCH that sets `isLocked=false` together with other fields succeeds (unlock first) — keeps "unlock then edit" in one request possible; a lock-only PATCH on a locked item always passes.
- Front blocks drag/edit/delete locally (no request) and only relies on the 409 toast for races with another user.
- Undo/redo on a locked item: check the cached item before applying; toast and leave the history untouched (clarify Q3).
- `parallel.yml`: two git roots, contract written in prep -> `after: null`, back chain `[US1, US2]` and front chain `[US3, US4]` run in parallel; barrier share 0 / 15 tasks. /sk-impl reads `parallel.yml`.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, contracts/board-items-lock.yaml, parallel.yml, checklists/requirements.md
