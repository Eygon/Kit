# Recon de feature

Squelette genere par recon-seed.mjs sur origin/dev (e1ac1ce). La prep garde ce qui sert la spec et ajoute ses faits.

## Composants partages reutilisables

- Modal (lib) — open: boolean, title: string, onClose: () => void, children?: ReactNode, footer?: ReactNode — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:50
- IconButton (lib) — icon: string, label: string, onClick: () => void, active?: boolean — source: node_modules/@septeo/septeo-ui-components/dist/index.d.ts:83
- No project help dialog; ShareBoardModal is the page-widget model — source: src/pages/board/components/widgets/shareBoardModal/shareBoardModal.tsx:15

## Helpers et hooks de la feature

- `isTextFieldTarget` duplicated, non exported, in both shortcut hooks (INPUT/TEXTAREA/SELECT/contentEditable) — source: src/pages/board/hooks/useBoardHistoryShortcuts.ts:10
- Shortcut hooks listen on `window` `keydown` in a `useEffect` and clean up on unmount — source: src/pages/board/hooks/useDeleteShortcut.ts:9
- Undo/redo gated by `canUseHistory` (editor/owner) in the page: the registry does not carry roles — source: src/pages/board/board.tsx:73
- Undo/Redo labels already exist: `pages.board.toolbar.undo` / `pages.board.toolbar.redo` — source: src/i18n/locales/fr.json:73

## Pieges verifies

- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle dans CHAQUE fichier ; parite : src/__tests__/i18n/localesParity.test.ts — source: git ls-tree origin/dev
- ALIAS tsconfig : @/*->./src/* — aucun autre alias n existe — source: tsconfig.json:19
- Lib Modal renders `<dialog open>` (no showModal): no Escape, no backdrop, no outside close — source: node_modules/@septeo/septeo-ui-components/dist/index.js:75
- Canvas uses onClick and items onPointerDown: the closing outside press swallows pointerdown AND click — source: src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:83
- Zoom is buttons only (ZoomControls), no keyboard zoom and no Ctrl+D in src: none are listed — source: grep keydown src
- Installed spacing tokens are `--spacing-1..8` (4px steps); no `--line-height-very-small` — source: node_modules/@septeo/septeo-ui-components/dist/septeo.css:1
- `"?"` arrives as `event.key === "?"` with shiftKey true on most layouts: do not require shift=false for it — source: src/pages/board/hooks/useBoardHistoryShortcuts.ts:20

## Recettes de test

- Shortcut hooks: renderHook + fireEvent.keyDown(document.body, { key }); text-field case fires on an appended input — source: src/__tests__/pages/board/hooks/useDeleteShortcut.test.ts:4
- board.test.tsx stubs every board widget with vi.mock (ShareBoardModal stub = aside + close button): stub ShortcutsHelpModal alike — source: src/__tests__/pages/board/board.test.tsx:141
- Locale values asserted per language with a `read(locale, path)` helper — source: src/__tests__/i18n/localesParity.test.ts:27

## Interdits grep-ables

- `<table`
- `className=.*#[0-9A-Fa-f]{3,6}\b`
- `\[[0-9.]+px\]`
- `--bg-page|--fg-|--blueS-|--grey-|--orange-`
- `from ["'](prjTypes|@api|@utils|@prjTypes|~)/`
- `secondary-[0-9]+`
