# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (57cb42b). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:17
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onDelete, canComment, onComments, readOnly (+5) — source: src/components/widgets/toolbar/toolbar.tsx:16
- CommentBadge — src/components/elements/commentBadge/commentBadge.tsx — props: count — overlay already rendered inside CanvasItem — source: src/components/elements/commentBadge/commentBadge.tsx:6
- IconButton (lib) — icon: string, label: string, onClick: () => void, active?: boolean — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:83
- Icon (lib) — name: string, size?: number — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:63
- Tooltip (lib) — label: string — wraps each toolbar IconButton — source: src/components/widgets/toolbar/toolbar.tsx:27
- septeoToast (lib) — success(message: string), error(message: string) — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:126

## Helpers et hooks de la feature

- Item drag: `useItemDrag` commits through `onCommit` only after a move past DRAG_THRESHOLD_PX — source: src/hooks/useItemDrag.ts:33
- Role: editor/owner = `canUseHistory` from `useCurrentUserBoardRoleQuery`; `isReadOnly` from members, unknown role = read-only (reuse, do not recompute) — source: src/pages/board/board.tsx:73
- Item PATCH: `useUpdateBoardItemMutation` is optimistic (setQueryData then rollback onError, invalidate onSettled) — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:18
- Item list cache key: `boardItemKeys.list(boardId)` holds `BoardItem[]` — source: src/pages/board/hooks/useUpdateBoardItemMutation.ts:14
- Error toast: `DisplayError(error, resolveKey?)` toasts once via `getErrorTranslationKey` — source: src/utils/displayError/displayError.ts:5
- History replay commits the step before applying and drops the entry on failure (`dropBoardAction`) — source: src/pages/board/hooks/useBoardHistory.ts:92
- Live sync: BoardChanged invalidates `boardItemKeys.all(boardId)` — source: src/pages/board/hooks/useBoardHub.ts:93

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- HttpStatusCodeEnum.CONFLICT already exists: no new enum member — source: src/enums/httpStatusCodeEnum.ts:9
- No per-item bar and no resize/z-index control exist in the front: the lock toggle goes in Toolbar — source: src/components/widgets/toolbar/toolbar.tsx:39
- PARTAGE : `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — ajout seulement
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

## Recettes de test

- board page: every data hook and BoardCanvas are vi.mock-ed with a hoisted `mocks` object — source: src/__tests__/pages/board/board.test.tsx:37
- history hook: mutations vi.mock-ed, `septeoToast.error` mocked as `mocks.toastError` — source: src/__tests__/pages/board/hooks/useBoardHistory.test.tsx:24
- toolbar: rendered directly, queried by role/name — source: src/__tests__/components/widgets/toolbar/toolbar.test.tsx:1
- mapper: five standard cases (all, missing, partial, null, falsy) — source: src/__tests__/types/mappers/boardItem/boardItemMapper.test.ts:1

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`

## Back (Tableau)

- Integration test recipe: `WebApplicationFactory<Program>`, header `X-User-Id` (editor = 2) — source: Tableau.Tests/Controllers/BoardItemsApiTests.cs:17
- Service test recipe: NSubstitute `IBoardItemRepository` + `IBoardService`, `TimeProvider.System` — source: Tableau.Tests/Services/BoardItemServiceTests.cs:22
- Domain exceptions live in `Tableau.Business/Exceptions/` (sealed, message ctor) — source: Tableau.Business/Exceptions/BadRequestException.cs:3
- Middleware mapping switch to extend for 409 — source: Tableau.Api/Middleware/ExceptionHandlingMiddleware.cs:22
- Schema: SQLite in-memory + EnsureCreated, no migrations — source: Tableau.Api/Program.cs:45
- PATCH no-op guard `HasAnySuppliedValue` must list the new field — source: Tableau.DAL/Dtos/UpdateBoardItemDto.cs:40
