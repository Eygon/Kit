# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (90c2e49). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- ErrorBanner — src/components/elements/errorBanner/errorBanner.tsx — props: message, onRetry — source: src/components/elements/errorBanner/errorBanner.tsx:5
- StickyNote — src/components/elements/stickyNote/stickyNote.tsx — props: color, content — source: src/components/elements/stickyNote/stickyNote.tsx:3
- CanvasItem — src/components/widgets/canvasItem/canvasItem.tsx — props: item, zoom, selected, onSelect, onMove, onEdit — source: src/components/widgets/canvasItem/canvasItem.tsx:14
- Toolbar — src/components/widgets/toolbar/toolbar.tsx — props: activeTool, onToolChange, onDelete — source: src/components/widgets/toolbar/toolbar.tsx:13

## Helpers et hooks de la feature

- Lib : Skeleton, IconButton, Tooltip, septeoToast; no className prop, no Checkbox export — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts
- httpClient get/post/patch/delete returns { status, data }, data null on 204, X-User-Id header added — source: src/api/httpClient.ts:10
- DisplayError(error) toasts once via getErrorTranslationKey — source: src/utils/displayError/displayError.ts:5
- Path params: local withBoardId/withItemId helpers replacing {boardId}/{itemId} — source: src/api/boardItems/boardItemService.ts:11
- queryTimes.short for board-scoped lists — source: src/pages/board/hooks/useBoardItemsQuery.ts:10
- Current user id = CURRENT_USER_ID (string "1"), compare with Number() to an authorId — source: src/config/apiConfig.ts:7
- Author label = t("pages.boards.ownerName", { id }) -> "Utilisateur 1" — source: src/components/elements/boardCard/boardCard.tsx:17
- Selection state: selectedItemId/setSelectedItemId and tool from useBoardInteractions — source: src/pages/board/hooks/useBoardInteractions.ts:4
- Sticky check: item.type === BoardItemTypeEnum.STICKY_NOTE — source: src/types/enums/boardItem/boardItemTypeEnum.ts:2

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- PARTAGE : `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — ajout seulement
- Toolbar has no disabled state on IconButton: hide the Comments button instead of disabling it — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts
- Installed lib has --danger-60, NOT --error-60; no neutral-30/50/70, primary-50/70, line-height other than small — source: node_modules/@septeo/septeo-ui-components/dist/septeo.css
- Spacing tokens are --spacing-1..8 (4px steps), not --spacing-moderate etc. — source: node_modules/@septeo/septeo-ui-components/dist/septeo.css
- GET comments returns 204 (data null) when empty: map to [] — source: contracts/comments.yaml
- No test exists for src/pages/board/board.tsx: create src/__tests__/pages/board/board.test.tsx mocking the hooks
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19

## Recettes de test

- Service test: vi.mock("@/api/httpClient") with get/post/patch/delete vi.fn and vi.mock DisplayError — source: src/__tests__/api/boardItems/boardItemService.test.ts:9
- Hook test: vi.mock service { __esModule: true, default }, QueryClient retry false wrapper — source: src/__tests__/pages/board/hooks/useUpdateBoardItemMutation.test.tsx:11
- Component test: renderWithProviders (i18n fr + QueryClient) and userEvent; French labels asserted — source: src/__tests__/components/widgets/toolbar/toolbar.test.tsx:9
- Builders: buildBoardItem(overrides) — add buildComment next to it — source: src/__tests__/utils/builders.ts
- Mapper tests live in src/__tests__/types/mappers/<domain>/ — source: src/__tests__/types/mappers/boardItem/boardItemMapper.test.ts
- Relative time in tests: pin Date with vi.useFakeTimers().setSystemTime and assert the fr output — no existing helper

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
