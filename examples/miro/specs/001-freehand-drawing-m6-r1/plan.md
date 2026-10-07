# Implementation Plan: Freehand drawing on the board

**Branch**: `001-freehand-drawing-m6-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Add a `Freehand` board item type on both sides. The API (Tableau, second git root) stores the stroke points as a nullable JSON text column and the stroke width as a nullable integer on `BoardItem`, validates them, and returns them (US1). The front maps the new fields, renders a stroke as an SVG polyline inside the existing `CanvasItem` box (US2), adds a Pencil tool whose press-drag-release on the canvas builds a simplified stroke and creates the item through the existing create mutation and history (US3), then adds colour and thickness choices (US4). The contract `contracts/board-items-freehand.yaml` is written in prep; front stories code against it.

## Technical Context

**Stack**: Front: React 19 + TypeScript, Vite, TanStack Query, react-i18next, `@septeo/septeo-ui-components`, Tailwind v4, Vitest + Testing Library. Back: ASP.NET Core (.NET), EF Core on SQLite in-memory (`EnsureCreated`, no migrations), NUnit 4 + NSubstitute + Shouldly.
**Gates**: Front: `node node_modules/vitest/vitest.mjs run <test>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`. Back: `/usr/bin/dotnet test Tableau.Tests/Tableau.Tests.csproj --filter <Class>`.
**Constraints**: Max 2000 points per stroke; stroke widths 2/4/8; colours limited to the sticky-note colours; Viewer and unknown role get no drawing tool.

## Standards

Front (`agent-os/standards/index.yml`, alwaysInject applies on top):
- @agent-os/standards/typing/model-dto-mapper — new StrokePoint triad, BoardItem fields
- @agent-os/standards/typing/mapper-defaults — points `?? []`, strokeWidth default
- @agent-os/standards/react/component-structure — FreehandItem, StrokeOptions components
- @agent-os/standards/react/hooks — useFreehandDrawing, interactions state
- @agent-os/standards/react/i18n — Pencil, colour, thickness labels
- @agent-os/standards/accessibility/icons-and-labels — icon-only Pencil, swatch labels
- @agent-os/standards/constants — palette, widths, 2000 cap, 2 px step
- @agent-os/standards/testing/testing-patterns — mapper cases, component tests
- @agent-os/standards/accessibility/semantic-elements — tool and option controls
- Ecart accepte : @agent-os/standards/accessibility/semantic-elements — pointer handlers on a non-native element — the drawing surface is the existing `board-viewport` div, which already carries pan pointer handlers; the Pencil, colour and width choices stay library controls (clarify Q3)
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` -> `src/i18n/locales/{fr,en,es}.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/septeo-library-first — no colour-swatch control in the library -> library `Button` (ghost / primary for the active choice) holding a decorative swatch `span` and an `sr-only` label

Back (`agent-os/standards/index.yml` of Tableau on origin/dev, alwaysInject applies on top):
- @agent-os/standards/dto/dto-shape — StrokePointDto, new DTO fields
- @agent-os/standards/dto/nullable-as-required — points/strokeWidth optional
- @agent-os/standards/services/service-validation — Freehand rules as 400
- @agent-os/standards/data-access/ef-entity-type-configuration — new columns mapping
- @agent-os/standards/data-access/ef-no-migrations — schema via EnsureCreated only
- @agent-os/standards/mappers/mapper-null-defaults — JSON text to points
- @agent-os/standards/testing/testing-conventions — NUnit/NSubstitute/Shouldly tests

## Verified facts

Front, origin/dev `e1c2410` (recon inline, `git show origin/dev:<path>`):
- `src/types/enums/boardItem/boardItemTypeEnum.ts:1-8` — `BoardItemTypeEnum` — three members (`StickyNote`, `Shape`, `Text`) and the `isBoardItemType` guard; values are the backend enum names verbatim
- `src/types/enums/board/canvasToolEnum.ts:1-7` — `CanvasToolEnum` — select, stickyNote, shape, text, connector; no pencil
- `src/types/dtos/boardItem/boardItemDto.ts:1-13` — `BoardItemDto` — no points nor strokeWidth
- `src/types/dtos/boardItem/createBoardItemDto.ts:1-9` — `CreateBoardItemDto` — type, x, y, width, height, color?, content?
- `src/types/models/boardItem/boardItem.ts:3-15` — `BoardItem` — concrete fields, no points
- `src/types/models/boardItem/newBoardItem.ts:3-11` — `NewBoardItem` — create model passed to the create mutation
- `src/types/mappers/boardItem/boardItemMapper.ts:9-21` — `boardItemDtoToModel` — defaults per field; unknown type falls back to STICKY_NOTE
- `src/types/mappers/boardItem/boardItemMapper.ts:23` — `newBoardItemToDto` — spreads the model into the create DTO (new fields pass through)
- `src/components/widgets/canvasItem/canvasItem.tsx:9-13` — `BODY_BY_TYPE` — exhaustive object per item type; a new enum member breaks the lookup until it gets a body
- `src/components/widgets/canvasItem/canvasItem.tsx:41` — `Body` — bodies receive only `color` and `content`
- `src/types/components/itemBody.ts:1-4` — `ItemBodyProps` — color, content
- `src/pages/board/utils/buildNewItem.ts:12-16` — `PRESET_BY_TYPE` — indexed by every item type; a new member must get an entry
- `src/pages/board/utils/toolToItemType.ts:4-8` — `ITEM_TYPE_BY_TOOL` — Partial record; a tool without click-created type returns null
- `src/constants/canvasConstants.ts:13` — `DEFAULT_STICKY_COLOR` — `#fde68a`, the only sticky colour on the front
- `src/pages/board/hooks/useBoardHistory.ts:20-28` — `toNewBoardItem` — copies type, x, y, width, height, color, content only; points would be lost on undo-of-delete / redo-of-create
- `src/pages/board/hooks/useBoardHistory.ts:50-56` — `recreate` — recreates an item from history and remaps its id
- `src/pages/board/board.tsx:74-84` — `handleCreateAt` — create mutation then `record({ kind: CREATE, item })` on success, then back to SELECT
- `src/pages/board/board.tsx:71-72` — `isReadOnly` — true unless the current member is Editor or Owner (unknown role = read-only)
- `src/pages/board/board.tsx:162-170` — `Toolbar` — mounted with activeTool, readOnly, history
- `src/components/widgets/toolbar/toolbar.tsx:6-12` — `TOOLS` — tool list with remix icons and `pages.board.toolbar.*` keys
- `src/components/widgets/toolbar/toolbar.tsx:16` — `tools` — read-only keeps only SELECT
- `src/types/components/toolbar.ts:11-22` — `ToolbarProps` — props of the toolbar
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:26` — `usePanGesture` — pan handlers spread on the viewport div
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:39-49` — `handleBackgroundClick` — non-select tools create at the clicked world point
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:52-58` — `board-viewport` — div carrying pointer handlers, click and wheel
- `src/pages/board/hooks/usePanGesture.ts:5-30` — `usePanGesture` — pans on every pointer move after pointer down
- `src/pages/board/utils/screenToWorld.ts:3-6` — `screenToWorld` — screen to world coordinates with the viewport
- `src/pages/board/hooks/useBoardInteractions.ts:4-20` — `useBoardInteractions` — tool and selection state
- `src/pages/board/types/boardHistory.ts:4` — `BoardPoint` — page-scoped point type (not usable from `src/types`)
- `src/__tests__/utils/builders.ts:15-27` — `buildBoardItem` — test builder for items
- `src/__tests__/pages/board/board.test.tsx:11-58` — `mocks` — page test mocks every board hook with `vi.mock`
- `src/i18n/locales/fr.json:52-64` — `toolbar` — toolbar labels block
- Freehand item colours: no palette on the front; sticky colours in the backend seed are `#fde68a`, `#a7f3d0`, `#fecaca` (see Back facts; clarify Q1).

Back (Tableau, paths relative to its root, origin/dev `606f2d2`; structure read with `git show origin/dev:Tableau.sln` -> `Tableau.Api\Tableau.Api.csproj`, `Tableau.Business\Tableau.Business.csproj`, `Tableau.DAL\Tableau.DAL.csproj`, `Tableau.Tests\Tableau.Tests.csproj`; `git ls-tree origin/dev Tableau.DAL/` -> Dtos, Entities, EntityTypeConfigurations, Enums, Mappers, Repositories, Seed):
- `Tableau.DAL/Enums/BoardItemType.cs:3-8` — `BoardItemType` — StickyNote = 0, Shape = 1, Text = 2
- `Tableau.DAL/Entities/BoardItem.cs:7-33` — `BoardItem` — entity wired to `BoardItemConfiguration` by attribute
- `Tableau.DAL/EntityTypeConfigurations/BoardItemConfiguration.cs:13` — `HasConversion` — type stored as string, max length 16 (`Freehand` fits)
- `Tableau.DAL/Dtos/CreateBoardItemDto.cs:7-31` — `CreateBoardItemDto` — required type/x/y/width/height
- `Tableau.DAL/Dtos/UpdateBoardItemDto.cs:34-35` — `HasAnySuppliedValue` — must include the new fields
- `Tableau.DAL/Mappers/BoardItemMapper.cs:8-35` — `ToBoardItemDto` — manual mapper both ways
- `Tableau.DAL/Repositories/BoardItemRepository.cs:16-36` — `GetByBoard` — `.Select` projection into `BoardItemDto` (new fields must be added there too)
- `Tableau.DAL/Repositories/BoardItemRepository.cs:55-65` — `Apply` — PATCH application
- `Tableau.Business/Services/BoardItemService.cs:28-38` — `AddItem` — size guard then add
- `Tableau.Business/Services/BoardItemService.cs:40-58` — `UpdateItem` — guards run before the item is loaded; type checks need the tracked item
- `Tableau.Api/Program.cs:15` — `JsonStringEnumConverter` — enums travel as strings
- `Tableau.Api/Program.cs:40` — `EnsureCreated` — SQLite in-memory connection; the schema follows the EF model, no migration
- `Tableau.Api/Controllers/BoardItemsController.cs:7` — `Route` — `api/v1/boards/{boardId:int}/items`, unchanged
- `Tableau.DAL/Seed/DataSeeder.cs:33-42` — `Item` — seeded sticky colours `#fde68a`, `#a7f3d0`, `#fecaca`
- Contract field sources: `points` -> `BoardItems.Points` column created by T001 (EnsureCreated, no migration); `strokeWidth` -> `BoardItems.StrokeWidth` column created by T001; `type = Freehand` -> `BoardItemType` member added by T001. No existing table column is read for a new field; SQL Server MCP not applicable (SQLite in-memory).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `Tableau.DAL/Mappers/BoardItemMapper.cs` (+ enum, entity, configuration, DTOs, `StrokePointDto.cs`) | extend | US1 |
| `Tableau.DAL/Repositories/BoardItemRepository.cs` | extend | US1 |
| `Tableau.Business/Services/BoardItemService.cs` | extend | US1 |
| `src/types/mappers/boardItem/boardItemMapper.ts` (+ enum, DTOs, models, StrokePoint triad) | extend | US2 |
| `src/components/elements/freehandItem/freehandItem.tsx` | create | US2 |
| `src/components/widgets/canvasItem/canvasItem.tsx` | extend | US2 |
| `src/pages/board/utils/buildNewItem.ts` + `src/constants/canvasConstants.ts` | extend | US2 |
| `src/pages/board/hooks/useBoardHistory.ts` | extend | US2 |
| `src/pages/board/utils/buildFreehandItem.ts` | create | US3 |
| `src/pages/board/hooks/useFreehandDrawing.ts` | create | US3 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` | extend | US3 |
| `src/components/widgets/toolbar/toolbar.tsx` | extend | US3, US4 |
| `src/pages/board/board.tsx` | extend | US3, US4 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US3, US4 |
| `src/components/elements/strokeOptions/strokeOptions.tsx` | create | US4 |
| `src/pages/board/hooks/useBoardInteractions.ts` | extend | US4 |

## Decisions

- Points stored as JSON text (`BoardItems.Points`, nullable) rather than a child table — the intent asks for a column; a stroke is always read and written whole.
- Points relative to the item origin, item box = bounding box padded by half the stroke width — moving a stroke is a plain x/y PATCH and the API size guard stays satisfied for dots and straight lines.
- The drawing gesture lives in a dedicated hook mounted by `BoardCanvas`; pan is skipped while the Pencil is active — the pan handlers on the same div would otherwise move the board during a stroke.
- The Pencil stays active after a stroke (assumption validated at the safety net) — unlike click-created items that return to SELECT.
- Colours = the three seeded sticky colours as a front constant (clarify Q1); widths 2/4/8 as a front constant mirrored by the API guard.
- `/sk-impl` reads `parallel.yml`: the contract is written in prep, so there is no barrier (`after: null`); the back chain (US1, 3 tasks) runs beside the front chain (US2-US4, 15 tasks). Barrier share: 0 of 18 tasks.

## Artifacts

spec.md, plan.md, data-model.md, contracts/board-items-freehand.yaml, recon.md, tasks.md, parallel.yml, checklists/requirements.md
