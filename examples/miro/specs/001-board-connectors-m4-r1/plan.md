# Implementation Plan: Board connectors between items

**Branch**: `001-board-connectors-m4-r1` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

## Summary

Add a `Connector` resource to the board API (back, US1: entity, EF configuration with cascade on both item FKs, repository, service, controller under `/api/v1/boards/{boardId}/connectors`), then consume it in the front against `contracts/connectors.yaml`: data layer and query hook (US2), an SVG layer under the items in `BoardCanvas` (US3), live following during drag by lifting the drag position out of `useItemDrag` (US4), a Connector tool in the toolbar (US5), selection (US6), deletion (US7), and an Arrow/Line toggle (US8).

## Technical Context

**Stack**: front React 19 + TypeScript, Vite, Tailwind v4, `@septeo/septeo-ui-components`, TanStack Query, i18next, Vitest + Testing Library; back ASP.NET Core (.NET), EF Core on SQLite in-memory (`EnsureCreated`, no migrations), NUnit 4 + NSubstitute + Shouldly, `WebApplicationFactory` API tests.
**Gates**: front `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`, locale parity `src/__tests__/i18n/localesParity.test.ts`; back `/usr/bin/dotnet test Tableau.Tests/Tableau.Tests.csproj --filter <Class>`.
**Constraints**: two git roots (front = this repo, back = `.sk/repos.json` key `backend`); the front codes against the contract only; SQLite accepts two cascade paths to `BoardItems`.

## Standards

Front (US2 to US8):
- @agent-os/standards/api/service-structure — new `ConnectorService` class and queryFunctions layer
- @agent-os/standards/api/url-builders — connector endpoints in apiURL
- @agent-os/standards/api/error-handling — reads swallow, writes rethrow
- @agent-os/standards/react/tanstack-query — connector key factory and query hook
- @agent-os/standards/react/mutation-cache-updates — create/delete/update connector mutations
- @agent-os/standards/react/hooks — drag position callback, Delete shortcut hook
- @agent-os/standards/react/i18n — toolbar labels in fr/en/es
- @agent-os/standards/typing/model-dto-mapper — connector triad
- @agent-os/standards/testing/mocking-conventions — default-export service mocks
- @agent-os/standards/accessibility/semantic-elements — toolbar controls, connector hit line
- Ecart accepte : @agent-os/standards/accessibility/semantic-elements — clickable non-native element — the connector is selected by clicking its SVG line, like canvas items are clickable divs today (clarify Q5)
- Depot prime : @agent-os/standards/api/service-structure — `generateRequestConfig` / `api` from axiosUtils -> `httpClient` from `src/api/httpClient.ts`
- Depot prime : @agent-os/standards/api/url-builders — `company` segment and `getSelectedCompany()` -> `BOARD_BY_ID()` builders without tenant
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` -> `src/i18n/locales/{fr,en,es}.json` and `src/__tests__/i18n/localesParity.test.ts`

Back (US1, index of the backend repo on origin/dev):
- @agent-os/standards/controllers/http-response-contract — full ProducesResponseType set per action
- @agent-os/standards/data-access/ef-entity-type-configuration — `ConnectorConfiguration` with cascade FKs
- @agent-os/standards/services/service-validation — same-item and same-board guards, no-op PATCH
- @agent-os/standards/error-handling/domain-exceptions — 400/403/404 via existing exceptions
- @agent-os/standards/testing/testing-conventions — NUnit + NSubstitute + Shouldly
- Depot prime : @agent-os/standards/services/service-validation — `DtoValidation` helpers -> inline guards throwing `BadRequestException`, as in `BoardItemService`
- Depot prime : @agent-os/standards/architecture/layer-base-classes — `ICurrentDbContextFactory` ctor argument -> `Repository<TableauContext>(dbContext, logger)` as in `BoardItemRepository`
- Depot prime : @agent-os/standards/testing/testing-conventions — "no EF / no repository tests" -> the repo already tests the model on SQLite in-memory (`Tableau.Tests/Data/`) and the API through `WebApplicationFactory` (`Tableau.Tests/Controllers/`)

## Verified facts

Front (this repo, origin/dev f0f2eb6):
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:41-57` — `BoardCanvas` — items are rendered inside the transformed `board-world` div; a connector layer placed first in that div is drawn under the items in world coordinates (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:22-31` — `handleBackgroundClick` — background click deselects with SELECT, otherwise calls `onCreateAt` (source : recon inline)
- `src/components/widgets/canvasItem/canvasItem.tsx:14-20` — `CanvasItem` — drag position comes from `useItemDrag` and is only committed through `onMove` on pointer up (source : recon inline)
- `src/components/widgets/canvasItem/canvasItem.tsx:29-33` — `CanvasItem` — pointer down calls `onSelect(item.id)`, so any item click reaches the page's `onSelectItem` (source : recon inline)
- `src/hooks/useItemDrag.ts:19-47` — `useItemDrag` — the in-flight drag position is local `override` state, invisible to `BoardCanvas` (source : recon inline)
- `src/pages/board/board.tsx:59-60` — `isReadOnly` — Viewer (or members loading) is read-only (source : recon inline)
- `src/pages/board/board.tsx:72-77` — `handleDelete` — Delete button deletes the selected item only (source : recon inline)
- `src/pages/board/board.tsx:125-127` — `onMoveItem` — a drop calls `updateItem` with rounded x/y (source : recon inline)
- `src/pages/board/hooks/useUpdateBoardItemMutation.ts:18-25` — `useUpdateBoardItemMutation` — item moves are written optimistically in the items cache, so a connector reading items follows on drop (source : recon inline)
- `src/components/widgets/toolbar/toolbar.tsx:6-15` — `TOOLS` — tool list; read-only keeps only SELECT, so a new tool is absent for Viewers by construction (source : recon inline)
- `src/components/widgets/toolbar/toolbar.tsx:28-32` — `Toolbar` — Delete button rendered only when not read-only (source : recon inline)
- `src/types/enums/board/canvasToolEnum.ts:1-6` — `CanvasToolEnum` — no CONNECTOR member yet (source : recon inline)
- `src/pages/board/utils/toolToItemType.ts:4-10` — `toolToItemType` — Partial record, a new tool maps to null: `handleCreateAt` creates nothing and resets to SELECT (source : recon inline)
- `src/api/boardItems/boardItemService.ts:11-26` — `BoardItemService` — service recipe: `withBoardId`, `httpClient.get`, NO_CONTENT -> [] , DisplayError (source : recon inline)
- `src/utils/apiURL/apiURL.ts:5-13` — `BOARD_ITEMS` — builders compose from `BOARD_BY_ID()` with `{boardId}` placeholders; no connector builder (source : recon inline)
- `src/utils/queryKeys/boardItemQueryKeys.ts:1-4` — `boardItemKeys` — `all` / `list` factory to mirror (source : recon inline)
- `src/pages/board/hooks/useBoardItemsQuery.ts:6-11` — `useBoardItemsQuery` — page-scoped query hook with `queryTimes.short` (source : recon inline)
- `src/i18n/locales/fr.json:52-60` — `pages.board.toolbar` — toolbar labels; no connector key (source : recon inline)
- `src/components/widgets/canvasItem/canvasItem.tsx:27` — `CanvasItem` — selection colour token `--primary-60`; neutral `--neutral-60` is shipped by the Septeo library (source : recon inline)

Back (`.sk/repos.json` backend, origin/dev f5fb5c2):
- `Tableau.sln` lists `Tableau.Api\Tableau.Api.csproj`, `Tableau.Business\Tableau.Business.csproj`, `Tableau.DAL\Tableau.DAL.csproj`, `Tableau.Tests\Tableau.Tests.csproj` (git show origin/dev:Tableau.sln)
- `ls-tree origin/dev Tableau.DAL/` holds `Dtos/`, `Entities/`, `EntityTypeConfigurations/`, `Enums/`, `Mappers/`, `Repositories/`, `Seed/`, `TableauContext.cs`; no connector file anywhere
- `Tableau.Api/Controllers/BoardItemsController.cs:7-26` — `BoardItemsController` — route `api/v1/boards/{boardId:int}/items`, user from `ReadCurrentUserId`, empty list -> 204 (source : recon inline)
- `Tableau.Business/Services/BoardItemService.cs:22-26` — `GetItems` — read access through `IBoardService.EnsureAccess(userId, boardId, requireWrite: false)`; writes pass `requireWrite: true` (Viewer -> 403) (source : recon inline)
- `Tableau.Business/Services/Interfaces/IBoardService.cs:14` — `EnsureAccess` — shared access check to reuse (source : recon inline)
- `Tableau.DAL/EntityTypeConfigurations/CommentConfiguration.cs:14` — `CommentConfiguration` — FK to BoardItem with `OnDelete(DeleteBehavior.Cascade)`: the cascade model to mirror (source : recon inline)
- `Tableau.DAL/Repositories/CommentRepository.cs:34-35` — `ItemExists` — board/item membership check to mirror for both ends (source : recon inline)
- `Tableau.DAL/TableauContext.cs:12-20` — `TableauContext` — DbSets as `=> Set<T>()`; no Connectors (source : recon inline)
- `Tableau.Api/Program.cs:17-36` — `Program` — SQLite in-memory, `AddSuffixRegistrations` (Service/Repository auto-registered), `EnsureCreated`, `MapControllers` (source : recon inline)
- `Tableau.DAL/Dtos/UpdateBoardItemDto.cs:33-35` — `HasAnySuppliedValue` — no-op PATCH pattern (source : recon inline)
- `Tableau.DAL/Seed/DataSeeder.cs:29-42` — `DataSeeder` — board 1: Alice owner, Bob editor, Carol viewer, items 1-4; board 2: items 5-6 (source : recon inline)

Contract field sources (`contracts/connectors.yaml`): table `Connectors` is created by T002 (EF configuration + DbSet, schema through `EnsureCreated`, no migration); `id`, `boardId`, `fromItemId`, `toItemId`, `style`, `createdBy` = columns of that table, created by T002; `createdBy` filled from the caller id by T004.

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| back `Tableau.DAL/Mappers/ConnectorMapper.cs` (+ entity, enum, DTOs) | create | US1 |
| back `Tableau.DAL/TableauContext.cs` (+ `ConnectorConfiguration.cs`) | extend | US1 |
| back `Tableau.DAL/Repositories/ConnectorRepository.cs` (+ interface) | create | US1 |
| back `Tableau.Business/Services/ConnectorService.cs` (+ interface, update DTO) | create | US1 |
| back `Tableau.Api/Controllers/ConnectorsController.cs` | create | US1 |
| `src/utils/apiURL/apiURL.ts` | extend | US2 |
| `src/api/connectors/connectorService.ts` (+ triad, enum) | create; extend US5, US7, US8 | US2 |
| `src/utils/queryKeys/connectorQueryKeys.ts` | create | US2 |
| `src/utils/queryFunctions/connectorQueryFunctions.ts` | create; extend US5, US7, US8 | US2 |
| `src/pages/board/hooks/useConnectorsQuery.ts` | create | US2 |
| `src/pages/board/utils/connectorEndpoints.ts` | create | US3 |
| `src/pages/board/components/modules/boardCanvas/connectorLayer.tsx` | create; extend US6 | US3 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` | extend | US3, US4, US6 |
| `src/pages/board/board.tsx` | extend | US3, US5, US6, US7, US8 |
| `src/hooks/useItemDrag.ts` | extend | US4 |
| `src/components/widgets/canvasItem/canvasItem.tsx` | extend | US4 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US5, US8 |
| `src/components/widgets/toolbar/toolbar.tsx` | extend | US5, US8 |
| `src/pages/board/hooks/useCreateConnectorMutation.ts` | create | US5 |
| `src/pages/board/hooks/useDeleteConnectorMutation.ts` | create | US7 |
| `src/pages/board/hooks/useDeleteShortcut.ts` | create | US7 |
| `src/pages/board/hooks/useUpdateConnectorMutation.ts` | create | US8 |

## Decisions

- Connector geometry is computed in the front from item centres (`x + width / 2`, `y + height / 2`) — no geometry stored server side; anchoring on edges is out of scope.
- Live following lifts the drag position: `useItemDrag` reports its override through an optional callback, `CanvasItem` forwards it with the item id, `BoardCanvas` keeps `{ itemId, x, y } | null` and feeds the connector layer with the overridden item — the item list cache is not written during the drag.
- The SVG layer is the first child of `board-world` (drawn under items), `overflow: visible`, `pointer-events: none` except on a transparent wide hit line per connector (US6).
- Connectors whose source or target is missing from the items list are skipped by the layer; no extra invalidation is added to item deletion.
- Pending source of the Connector tool is page state in `board.tsx`; a click on the same item is ignored, a background click goes through `handleCreateAt` (no item type -> resets to SELECT) and clears the pending source.
- Delete shortcut: a `keydown` listener on `window` for the `Delete` key, ignored while focus is in an input/textarea, calls the page's delete handler.
- parallel.yml: the contract is written in prep, so `after: null`; US1 (back) runs in its own lane, US2 to US8 (front) chain in the other. Barrier share: 0 barrier task out of 37.
- /sk-impl reads `parallel.yml`.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, checklists/requirements.md, contracts/connectors.yaml, parallel.yml.
