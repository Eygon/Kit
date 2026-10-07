# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (e1c2410). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- StickyNote — src/components/elements/stickyNote/stickyNote.tsx — props: color, content — source: src/components/elements/stickyNote/stickyNote.tsx:3
- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:15
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments — source: src/components/widgets/toolbar/toolbar.tsx:14

## Helpers et hooks de la feature

- Read-only derivation already computed: `isReadOnly` (unknown role = read-only) — reuse it, never recompute — source: src/pages/board/board.tsx:71
- Toolbar already hides every tool but SELECT when `readOnly` — a new tool in `TOOLS` is hidden for Viewers for free — source: src/components/widgets/toolbar/toolbar.tsx:16
- Create + history recipe: `createItem(newItem, { onSuccess: (item) => record({ kind: BoardActionKindEnum.CREATE, item }) })` — source: src/pages/board/board.tsx:79
- Screen to world point: `screenToWorld(clientX - bounds.left, clientY - bounds.top, viewport)` — source: src/pages/board/utils/screenToWorld.ts:3
- Pan gesture handlers are spread on the viewport div and pan on every move after pointer down — source: src/pages/board/hooks/usePanGesture.ts:14
- History recreation copies only the fields listed in `toNewBoardItem` — source: src/pages/board/hooks/useBoardHistory.ts:20
- Click-created presets per item type live in `PRESET_BY_TYPE` — source: src/pages/board/utils/buildNewItem.ts:12
- Sticky default colour constant `DEFAULT_STICKY_COLOR` — source: src/constants/canvasConstants.ts:13
- Toolbar labels block `pages.board.toolbar.*` — source: src/i18n/locales/fr.json:52

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- PARTAGE : `src/constants/canvasConstants.ts`, `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — ajout seulement
- `BODY_BY_TYPE` is an exhaustive object indexed by `item.type`: adding `FREEHAND` to the enum fails tsc until it gets a body — source: src/components/widgets/canvasItem/canvasItem.tsx:9
- `PRESET_BY_TYPE[type]` fails tsc the same way once `FREEHAND` exists — source: src/pages/board/utils/buildNewItem.ts:12
- Unknown item types fall back to STICKY_NOTE in the mapper: without `FREEHAND` in the enum a stroke renders as a sticky note — source: src/types/mappers/boardItem/boardItemMapper.ts:12
- Hex colours are forbidden in .tsx (standards check css/tailwind-tokens): palette values live in `canvasConstants.ts` — source: src/constants/canvasConstants.ts:13
- `BoardPoint` is page-scoped; a model under src/types must not import it — source: src/pages/board/types/boardHistory.ts:4
- The library `IconButton` has no colour prop and `Button` has no pressed state: active choice = `variant="primary"` — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:7

## Recettes de test

- Item fixtures: `buildBoardItem({ type, ... })` from the shared builders — source: src/__tests__/utils/builders.ts:15
- Board page test mocks every board hook with `vi.mock` and hoisted `mocks` (createItem, createItemAsync, role, members) — source: src/__tests__/pages/board/board.test.tsx:11
- History hook test mocks the three item mutations — source: src/__tests__/pages/board/hooks/useBoardHistory.test.tsx:1
- Canvas item test renders `CanvasItem` per type — source: src/__tests__/components/widgets/canvasItem/canvasItem.test.tsx:1
- Toolbar test queries tools by accessible name — source: src/__tests__/components/widgets/toolbar/toolbar.test.tsx:1
- Mapper test covers the five mapper cases of testing-patterns — source: src/__tests__/types/mappers/boardItem/boardItemMapper.test.ts:1

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Enum stored as string max 16 (`Freehand` fits); enums travel as strings in JSON — source: Tableau.DAL/EntityTypeConfigurations/BoardItemConfiguration.cs:13
- Schema from the EF model via `EnsureCreated` on SQLite in-memory; no migration — source: Tableau.Api/Program.cs:30
- `GetByBoard` projects with `.Select` into `BoardItemDto`: new fields must be added to that projection, not only to the mapper — source: Tableau.DAL/Repositories/BoardItemRepository.cs:16
- PATCH applies through `Apply`; `HasAnySuppliedValue` must count the new fields — source: Tableau.DAL/Dtos/UpdateBoardItemDto.cs:34
- `UpdateItem` validates before loading the item; type-dependent rules need the tracked item first — source: Tableau.Business/Services/BoardItemService.cs:40
- Service tests: NSubstitute repo + `EnsureAccess` returning Editor — source: Tableau.Tests/Services/BoardItemServiceTests.cs:19
- API tests: `WebApplicationFactory<Program>` + `X-User-Id` header + `JsonStringEnumConverter` options — source: Tableau.Tests/Controllers/ConnectorsApiTests.cs:15
- Mapper tests exist for board items — source: Tableau.Tests/Mappers/BoardItemMapperTests.cs:1
