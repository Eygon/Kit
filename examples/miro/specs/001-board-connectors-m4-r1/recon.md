# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (f0f2eb6). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:14
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments — source: src/components/widgets/toolbar/toolbar.tsx:13
- ErrorBanner — src/components/elements/errorBanner/errorBanner.tsx — props: message, onRetry — source: src/components/elements/errorBanner/errorBanner.tsx:5

## Helpers et hooks de la feature

- `useItemDrag` holds the in-flight drag position as local `override`; zoom divides the pointer delta — source: src/hooks/useItemDrag.ts:28-34
- Item centre = `x + width / 2`, `y + height / 2` in world units; items are positioned with `left/top` inside `board-world` — source: src/components/widgets/canvasItem/canvasItem.tsx:28
- Service recipe to copy: `withBoardId` placeholder helper, `httpClient`, `HttpStatusCodeEnum.NO_CONTENT` -> [] — source: src/api/boardItems/boardItemService.ts:11-26
- Optimistic mutation recipe (cancel, snapshot, set, rollback, invalidate) — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:16-32
- Plain invalidate-on-success mutation recipe — source: src/pages/board/hooks/useDeleteBoardItemMutation.ts:8-13
- Read-only flag for Viewer — source: src/pages/board/board.tsx:51
- New tools map to no item type: `toolToItemType` returns null, `handleCreateAt` resets to SELECT — source: src/pages/board/utils/toolToItemType.ts:10

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- PARTAGE : `src/pages/board/board.tsx`, `src/components/widgets/toolbar/toolbar.tsx` — ajout seulement
- PARTAGE : `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` — ajout seulement
- CanvasItem stops click propagation and selects on pointer down: an item click never reaches the background handler — source: src/components/widgets/canvasItem/canvasItem.tsx:29-36
- Board page test mocks `BoardCanvas` and every board hook: a new hook used by `board.tsx` must be mocked there too — source: src/__tests__/pages/board/board.test.tsx:21-45
- Toolbar keeps only SELECT when `readOnly`: do not add a separate Viewer check for the Connector tool — source: src/components/widgets/toolbar/toolbar.tsx:15
- Neutral line colour token is `--neutral-60` (shipped by the Septeo lib), selection `--primary-60` — source: src/components/widgets/canvasItem/canvasItem.tsx:27

## Recettes de test

- Service tests mock `@/api/httpClient` (get/post/patch/delete) and `DisplayError` — source: src/__tests__/api/boardItems/boardItemService.test.ts:9-15
- Mutation tests: QueryClient `retry: false`, cache seeded by `setQueryData`, service mocked `__esModule: true` — source: src/__tests__/pages/board/hooks/useUpdateBoardItemMutation.test.tsx:11-24
- Canvas tests render `BoardCanvas` with `buildBoardItem` items via `renderWithProviders` — source: src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:9-27
- Builders: `buildBoard`, `buildBoardItem` exist; build connectors locally in each test — source: src/__tests__/utils/builders.ts:15

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Controller model: route attribute, `ReadCurrentUserId` + 401, `[FromServices]` per action, 204 on empty list — source: Tableau.Api/Controllers/BoardItemsController.cs:7-26
- Service model: `Service<IRepo>`, `IBoardService.EnsureAccess`, guards throw `BadRequestException` / `ResourceNotFoundException` — source: Tableau.Business/Services/BoardItemService.cs:10-67
- Repository model: projection with `AsNoTracking().Select`, `GetTracked`, `Remove`, `Save` — source: Tableau.DAL/Repositories/BoardItemRepository.cs:16-69
- Item membership check to mirror for both ends — source: Tableau.DAL/Repositories/CommentRepository.cs:34-35
- Cascade FK configuration to mirror — source: Tableau.DAL/EntityTypeConfigurations/CommentConfiguration.cs:14
- Enum stored as string (`HasConversion<string>()`), JSON enums as strings (`JsonStringEnumConverter`) — source: Tableau.DAL/EntityTypeConfigurations/BoardItemConfiguration.cs:13
- Model test on SQLite in-memory with `EnsureCreated` — source: Tableau.Tests/Data/CommentModelTests.cs:14-22
- API tests send `X-User-Id`; board 1: Alice(1) owner, Bob(2) editor, Carol(3) viewer, items 1-4; board 2: items 5-6 — source: Tableau.Tests/Controllers/CommentsApiTests.cs:23-32
- Service test: `Substitute.For<IBoardService>()` returning `BoardRole.Editor` — source: Tableau.Tests/Services/BoardItemServiceTests.cs:19-26
- PARTAGE : `Tableau.DAL/TableauContext.cs` — ajout seulement
