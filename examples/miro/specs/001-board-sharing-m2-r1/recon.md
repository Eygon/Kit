# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (6a5adfc). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- ErrorBanner — src/components/elements/errorBanner/errorBanner.tsx — props: message, onRetry — source: src/components/elements/errorBanner/errorBanner.tsx:5
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments — source: src/components/widgets/toolbar/toolbar.tsx:13
- Library (no project equivalent): Modal (open, title, onClose, footer), Avatar (name), Button (disabled), Skeleton, EmptyState — source: packages/septeo-ui-components/dist/index.d.ts:50-123
- Library has NO Select/Dropdown and IconButton has NO disabled — source: packages/septeo-ui-components/dist/index.d.ts:83-88

## Helpers et hooks de la feature

- Current user id: `CURRENT_USER_ID` (string "1"), compare with `Number(CURRENT_USER_ID)` — source: src/config/apiConfig.ts:7
- Path params: builder with `{boardId}` placeholder + `.replace(...)` in the service — source: src/api/comments/commentService.ts:10-14
- Modal recipe (library Modal + footer Button) — source: src/pages/boards/components/widgets/createBoardModal/createBoardModal.tsx:20-36
- Success toast in mutation hook via `septeoToast.success(i18n.t(...))` — source: src/pages/boards/hooks/useCreateBoardMutation.ts:13
- Query times: `queryTimes.short` for board data — source: src/pages/board/hooks/useBoardQuery.ts:10
- Errors: services call `DisplayError(error)`; writes rethrow — source: src/api/boards/boardService.ts:32-39

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- PARTAGE : `src/pages/board/board.tsx`, `src/api/boards/boardService.ts`, `src/utils/apiURL/apiURL.ts` — ajout seulement
- PARTAGE : `src/utils/queryFunctions/boardQueryFunctions.ts`, `src/utils/queryKeys/boardQueryKeys.ts` — ajout seulement
- PARTAGE : `src/pages/board/components/widgets/shareBoardModal/shareBoardModal.tsx`, `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — ajout seulement
- board.test.tsx mocks every hook board.tsx imports: a new hook in board.tsx must get a vi.mock there — source: src/__tests__/pages/board/board.test.tsx:10-24
- Role values are backend strings "Viewer"/"Editor"/"Owner" (JsonStringEnumConverter) — source: contracts/board-sharing.yaml
- Native `<select>` is flagged by the septeo-library-first check: allowed here (library has none), plan.md Depot prime

## Recettes de test

- Service test: vi.mock("@/api/httpClient") with get/post/patch/delete vi.fn + vi.mock DisplayError — source: src/__tests__/api/boards/boardService.test.ts:8-18
- Page test: renderWithProviders + vi.mock of each hook module path — source: src/__tests__/pages/board/board.test.tsx:1-41
- Builders : src/__tests__/utils/builders.ts n a ni buildBoardMember ni buildUser et n est dans aucune US : construire BoardMember / User en litteral dans les tests — source : src/__tests__/utils/builders.ts:5-13 (corrige apres US5)
- Mutation hook test model — source: src/__tests__/pages/board/hooks/useDeleteCommentMutation.test.tsx
- Toolbar labels in tests are French ("Forme", "Sélectionner") — source: src/__tests__/components/widgets/toolbar/toolbar.test.tsx:20-21

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Controller model (401 + ProducesResponseType + [FromServices]) — source: Tableau.Api/Controllers/BoardItemsController.cs:7-78
- Service model (Service<TRepo>, depends on IBoardService.EnsureAccess) — source: Tableau.Business/Services/BoardItemService.cs:10-26
- Repository model (AsNoTracking + Select to DTO) — source: Tableau.DAL/Repositories/BoardRepository.cs:17-53
- Entity + configuration model — source: Tableau.DAL/Entities/Comment.cs:6-26, Tableau.DAL/EntityTypeConfigurations/CommentConfiguration.cs:7-16
- DTO model (sealed record, XML doc, `required`) — source: Tableau.DAL/Dtos/CreateCommentDto.cs:7-12
- Seed ids AliceId/BobId/CarolId; Seed returns early when Boards exist — source: Tableau.DAL/Seed/DataSeeder.cs:8-17
- API test recipe: WebApplicationFactory<Program> + X-User-Id header client — source: Tableau.Tests/Controllers/BoardsApiTests.cs:13-31
- Service test recipe: Substitute.For<IRepo>, AAA — source: Tableau.Tests/Services/BoardServiceTests.cs:11-21
- Model test recipe: SQLite in memory + EnsureCreated + Model.FindEntityType — source: Tableau.Tests/Data/CommentModelTests.cs:9-44
- PIEGE: API tests share one factory per fixture (state persists between tests): use board 2 or restore state — source: Tableau.Tests/Controllers/BoardsApiTests.cs:16-17
- No repository tests, no EF In-Memory provider (testing-conventions)
