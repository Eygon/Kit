# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (6a5adfc). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:14
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete, canComment, commentsOpen, onComments — source: src/components/widgets/toolbar/toolbar.tsx:13

## Helpers et hooks de la feature

- Item mutation hooks (create / update / delete, boardId): use mutateAsync for the history — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:12
- Drag commits once on pointer up via onCommit -> onMove(item.id, x, y) — source: src/components/widgets/canvasItem/canvasItem.tsx:19, src/hooks/useItemDrag.ts:36
- Current user id: CURRENT_USER_ID is the string "1" — source: src/config/apiConfig.ts:7
- Page-scoped query hook model (queryTimes.short) — source: src/pages/board/hooks/useBoardQuery.ts:18
- Error toast: DisplayError -> septeoToast.error, 404 = errors.notFound — source: src/utils/displayError/getErrorTranslationKey.ts:11
- Test builders buildBoard / buildBoardItem — source: src/__tests__/utils/builders.ts

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- IconButton has no disabled prop; Button has icon + disabled but no aria-label (name via sr-only child) — source: packages/septeo-ui-components/dist/index.d.ts:83
- Item writes already toast in the service (DisplayError + rethrow): never toast again in a hook — source: src/api/boardItems/boardItemService.ts:46
- Board role is a string enum on the wire ("Viewer"/"Editor"/"Owner", JsonStringEnumConverter on the back); userId is a number, CURRENT_USER_ID a string — source: src/config/apiConfig.ts:7
- The update mutation is optimistic: read the previous x/y or content from boardItems BEFORE calling it — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:18

## Recettes de test

- Page test: renderWithProviders + vi.mock of each page hook; BoardCanvas stubbed with buttons calling its props — source: src/__tests__/pages/board/board.test.tsx:10
- The page test mocks mutation hooks with { mutate } only: add mutateAsync to those mocks when the page uses useBoardHistory — source: src/__tests__/pages/board/board.test.tsx:21
- Mutation hook test: real QueryClient wrapper + vi.mock of the default-export service (__esModule, default) — source: src/__tests__/pages/board/hooks/useUpdateBoardItemMutation.test.tsx:11
- Service test: vi.mock of httpClient and DisplayError, assert the URL and the mapped model — source: src/__tests__/api/boards/boardService.test.ts:8
- Toolbar test: renderWithProviders, query buttons by their French accessible name — source: src/__tests__/components/widgets/toolbar/toolbar.test.tsx:7

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
