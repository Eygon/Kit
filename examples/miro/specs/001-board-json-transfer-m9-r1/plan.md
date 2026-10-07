# Implementation Plan: Board JSON export and import

**Branch**: `001-board-json-transfer-m9-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Two git roots. Back (`Tableau`, .NET 8): a `BoardTransferService` serves `GET /api/v1/boards/{id}/export` by composing the existing board, item and connector services (US1), then `POST /api/v1/boards/import` validates the document and writes board, items and remapped connectors inside one service-owned transaction through a new `BoardTransferRepository` (US2). Front (React + TanStack Query): an "Export" header button on the board page downloads `<name>.tableau.json` (US3); an "Import" button on the boards list reads a `.json` file, posts it and opens the new board (US4); import errors get translated toasts per error kind (US5). The contract `contracts/board-transfer.yaml` is written in prep, so both lanes start together.

## Technical Context

**Stack**: front React 19 + TanStack Query 5 + react-i18next + `@septeo/septeo-ui-components`, Vitest + Testing Library; back ASP.NET Core 8 controllers, EF Core + SQLite in memory (`EnsureCreated`), NUnit 4 + NSubstitute + Shouldly (back `CLAUDE.md`).
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`, parity `src/__tests__/i18n/localesParity.test.ts`; back `/usr/bin/dotnet test Tableau.Tests --filter <Class>`.
**Constraints**: import atomic; 1 MB body limit on the import route only; no comments or members in the file; error toasts never show the raw server message.

## Standards

Front (`agent-os/standards/index.yml` of this repo):
- @agent-os/standards/api/service-structure — new service methods, queryFunctions pass-through
- @agent-os/standards/api/error-handling — toast once, write methods rethrow
- @agent-os/standards/typing/model-dto-mapper — board file triad
- @agent-os/standards/react/hooks — export and import mutation hooks
- @agent-os/standards/react/i18n — new labels and toasts fr/en/es
- @agent-os/standards/react/tanstack-query — mutation hook naming, queryFunctions
- @agent-os/standards/react/mutation-cache-updates — invalidate boards list on import
- @agent-os/standards/typing/boundary-narrowing — picked file parsed as unknown
- @agent-os/standards/utils — error display only via DisplayError
- @agent-os/standards/http-status — 400/413 through the enum
- Depot prime : @agent-os/standards/api/service-structure — `generateRequestConfig()` + axios `api` -> `httpClient` of `src/api/httpClient.ts`
- Depot prime : @agent-os/standards/api/error-handling — backend `translationCode` -> status-based keys of `getErrorTranslationKey` (the client never reads the error body)
- Depot prime : @agent-os/standards/http-status — `@prjTypes/enums/httpStatusCode` -> `src/enums/httpStatusCodeEnum.ts` (`HttpStatusCodeEnum`)
- Not applicable: @agent-os/standards/api/multipart-upload — the import contract takes the document as JSON body ("follow the endpoint contract" clause), no file upload.

Back (`agent-os/standards/index.yml` of the backend, origin/dev):
- @agent-os/standards/controllers/controller-patterns — new export and import actions
- @agent-os/standards/controllers/http-response-contract — full ProducesResponseType sets
- @agent-os/standards/services/service-composition — transfer service composes board/item/connector services
- @agent-os/standards/mappers/manual-mappers — DTO to file DTO and file DTO to entity
- @agent-os/standards/dto/dto-shape — three board file DTOs
- @agent-os/standards/services/service-validation — import guards throw domain exceptions
- @agent-os/standards/data-access/repository-returns-dto — transactional import write
- @agent-os/standards/error-handling/domain-exceptions — 400 through BadRequestException
- @agent-os/standards/testing/testing-conventions — service tests, API tests
- Depot prime : @agent-os/standards/controllers/controller-patterns — `[Authorize(Policy)]` -> `ReadCurrentUserId()` + 401 `UnidentifiedUserMessage` of `Controller.cs`
- Depot prime : @agent-os/standards/error-handling/domain-exceptions — `TranslationCode` on BadRequestException -> message only (`BadRequestException.cs`)
- Depot prime : @agent-os/standards/services/service-validation — `DtoValidation` helpers -> inline guards as in `BoardItemService`

## Verified facts

Front (origin/dev 124c3e3):
- `src/api/boards/boardService.ts:49-57` — `create` — write recipe: `httpClient.post`, `boardDtoToModel`, `DisplayError` then rethrow (source : recon inline)
- `src/api/httpClient.ts:11-32` — `request` — body is `JSON.stringify`-ed; non-ok response throws `HttpError(status, statusText)` without reading the body: the server message never reaches the screen (source : recon inline)
- `src/api/httpError.ts:1-9` — `HttpError` — carries `status` only (source : recon inline)
- `src/utils/displayError/displayError.ts:5-7` — `DisplayError` — single toast, key from `getErrorTranslationKey` (source : recon inline)
- `src/utils/displayError/getErrorTranslationKey.ts:4-16` — `getErrorTranslationKey` — maps 401/403/404, else `errors.generic` (source : recon inline)
- `src/enums/httpStatusCodeEnum.ts:1-11` — `HttpStatusCodeEnum` — has `BAD_REQUEST`, no 413 member (source : recon inline)
- `src/utils/apiURL/apiURL.ts:3-5` — `BOARDS` — `BOARDS()` and `BOARD_BY_ID()` with `{boardId}` placeholder (source : recon inline)
- `src/utils/queryFunctions/boardQueryFunctions.ts:10` — `postBoard` — pass-through pattern (source : recon inline)
- `src/utils/queryKeys/boardQueryKeys.ts:1-6` — `boardKeys` — `list()` key of the boards list (source : recon inline)
- `src/pages/boards/hooks/useCreateBoardMutation.ts:7-17` — `useCreateBoardMutation` — success toast in hook + invalidate `boardKeys.list()` (source : recon inline)
- `src/pages/boards/boards.tsx:34-39` — `BoardsPage` — header row with the "New board" `Button`; `onOpenBoard(boardId)` opens a board (source : recon inline)
- `src/pages/board/board.tsx:219-230` — `BoardPage` — header with Back, board name (`board.data?.name`) and Share buttons; no menu component (source : recon inline)
- `src/types/mappers/boardItem/strokePointMapper.ts:4-7` — `strokePointDtoToModel` — reusable for file points (source : recon inline)
- `node_modules/@septeo/septeo-ui-components/dist/index.d.ts:7-14` — `ButtonProps` — variant, size, icon, disabled, onClick; no file picker in the lib (source : recon inline)

Back (`/tmp/.../miro/back`, origin/dev 0cee9ef; paths relative to the backend root):
- Structure: `git show origin/dev:Tableau.sln` lists `Tableau.Api\Tableau.Api.csproj`, `Tableau.Business\Tableau.Business.csproj`, `Tableau.DAL\Tableau.DAL.csproj`, `Tableau.Tests\Tableau.Tests.csproj`; `ls-tree` of each project read on origin/dev 0cee9ef (source : recon inline)
- `Tableau.Api/Controllers/BoardsController.cs:7-58` — `BoardsController` — route `api/v1/boards`, `ReadCurrentUserId()` + 401, `[FromServices]` per action, `Created` on POST (source : recon inline)
- `Tableau.Business/Services/BoardService.cs:21-31` — `GetBoard` — null when the board does not exist, else `EnsureAccess(requireWrite: false)`: viewers allowed, non-members 403 (source : recon inline)
- `Tableau.Business/Services/BoardItemService.cs:26-30` — `GetItems` — read access check + items of the board (source : recon inline)
- `Tableau.Business/Services/BoardItemService.cs:13-14` — `MaxStrokePoints` — 2000 points max, widths 2/4/8 (source : recon inline)
- `Tableau.Business/Services/BoardItemService.cs:75-101` — `ValidateStroke` — private static freehand guard, to be exported for reuse (source : recon inline)
- `Tableau.Business/Services/Interfaces/IConnectorService.cs:7` — `GetConnectors` — connectors of a board with read access (source : recon inline)
- `Tableau.DAL/Repositories/BoardRepository.cs:55-62` — `Add` — board + owner `BoardMember` created together (source : recon inline)
- `Tableau.DAL/Repositories/Repository.cs:20` — `BeginTransactionAsync` — transaction helper on the base repository (source : recon inline)
- `Tableau.DAL/Mappers/BoardItemMapper.cs:44-45` — `SerializePoints` — points stored as JSON text (source : recon inline)
- `Tableau.DAL/Entities/Connector.cs:14-22` — `Connector` — `BoardId`, `FromItemId`, `ToItemId`, `Style`, `CreatedBy`; no navigation from `Board` (source : recon inline)
- `Tableau.Api/Program.cs:17` — `JsonStringEnumConverter` — enums bound as strings; an unknown type string fails binding -> automatic 400 (`[ApiController]`) (source : recon inline)
- `Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22-30` — `InvokeAsync` — BadRequestException -> 400 `{ message }` (source : recon inline)
- `Tableau.Business/Exceptions/BadRequestException.cs:3-8` — `BadRequestException` — message only, no translation code (source : recon inline)
- No `RequestSizeLimit` anywhere on origin/dev (grep `Tableau.Api`) (source : recon inline)

Contract field sources (`contracts/board-transfer.yaml`, no SQL server reachable: in-memory SQLite seeded by `DataSeeder`):
- `Tableau.DAL/Entities/Board.cs:11` — `Name` — source of `BoardFile.name`
- BoardFile format and version: constants of the feature, created by T002
- `BoardFileItem.key` — derived from `BoardItem.Id` (`Tableau.DAL/Entities/BoardItem.cs:10`), file-local only
- `BoardFileItem.type/x/y/width/height/color/content/points/strokeWidth` — derived from `BoardItem` columns (`Tableau.DAL/Entities/BoardItem.cs:14-34`) through `BoardItemDto` (seed: 6 items, no freehand)
- `BoardFileConnector.fromKey/toKey/style` — derived from `Connector.FromItemId/ToItemId/Style` (`Tableau.DAL/Entities/Connector.cs:16-20`) (seed: no connector)

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `Tableau.Business/Services/BoardTransferService.cs` (+ `Interfaces/IBoardTransferService.cs`) | create | US1 |
| `Tableau.DAL/Mappers/BoardFileMapper.cs` (+ 3 DTOs in `Tableau.DAL/Dtos/`) | create | US1 |
| `Tableau.Api/Controllers/BoardsController.cs` | extend (export) | US1 |
| `Tableau.Business/Services/BoardItemService.cs` | extend (export `ValidateStroke`) | US2 |
| `Tableau.DAL/Mappers/BoardFileMapper.cs` | extend (file item -> entity) | US2 |
| `Tableau.DAL/Repositories/BoardTransferRepository.cs` (+ interface) | create | US2 |
| `Tableau.Business/Services/BoardTransferService.cs` | extend (import) | US2 |
| `Tableau.Api/Controllers/BoardsController.cs` | extend (import) | US2 |
| `src/api/boards/boardService.ts` (+ board file triad) | extend | US3, US4, US5 |
| `src/utils/queryFunctions/boardQueryFunctions.ts` | extend | US3, US4 |
| `src/pages/board/utils/downloadJsonFile.ts` | create | US3 |
| `src/pages/board/hooks/useExportBoardMutation.ts` | create | US3 |
| `src/pages/board/board.tsx` | extend (Export button) | US3 |
| `src/pages/boards/utils/readJsonFile.ts` | create | US4 |
| `src/pages/boards/hooks/useImportBoardMutation.ts` | create | US4 |
| `src/pages/boards/boards.tsx` | extend (Import button) | US4 |
| `src/utils/displayError/displayError.ts` | extend (optional key resolver) | US5 |
| `src/pages/boards/utils/getImportErrorTranslationKey.ts` | create | US5 |
| `src/pages/boards/hooks/useImportBoardMutation.ts` | extend (client-side error toast) | US5 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US3, US4, US5 |

## Decisions

- Export composes `IBoardService.GetBoard`, `IBoardItemService.GetItems`, `IConnectorService.GetConnectors` (service-composition) — a dedicated read repository in US1 was dropped: nothing in US1 needs it.
- The repository is created in US2, where the transactional write is its first caller; `BoardTransferService` then inherits `Service<IBoardTransferRepository>`.
- Import transaction: the service opens `BeginTransactionAsync`, the repository adds board + owner member + items (SaveChanges, ids known), then connectors whose ends are mapped through a `key -> new item id` dictionary, SaveChanges, commit. Any exception rolls back (all or nothing).
- Validation order in the service, before any write: format == "tableau", version == 1, items count <= 2000 (`MaxImportItems`), `Enum.IsDefined` on each type, `BoardItemService.ValidateStroke` per item, width/height > 0, unique keys, every connector end present among keys. Invalid JSON and unknown type strings are rejected by model binding (400).
- 1 MB limit (clarify Q2): `[RequestSizeLimit(MaxImportBodyBytes)]` on the import action (Kestrel 413) plus an explicit `Request.ContentLength > MaxImportBodyBytes` -> 413 guard in the action, so the API test is deterministic under `WebApplicationFactory`.
- Export button in the board header next to Share (clarify Q3); downloads via a Blob + object URL helper.
- Import errors (clarify Q1): `DisplayError` gains an optional key resolver; the import passes `getImportErrorTranslationKey` (400 -> invalid file, 413 -> too large, client-side `ImportFileError` kinds, else the generic resolver). Server errors are toasted once, in the service; client-side `ImportFileError`s (no request sent) are toasted once by the import hook `onError`.
- Front pre-checks the picked file (size > 1 MB, JSON parse failure) and throws a typed error before any request.
- parallel.yml: two lanes `[US1, US2]` (back) and `[US3, US4, US5]` (front), `after: null` because the contract is written in prep. /sk-impl reads this file. Barrier share: 0 of 25 tasks.

## Artifacts

spec.md, plan.md, recon.md, tasks.md, checklists/requirements.md, contracts/board-transfer.yaml, parallel.yml
