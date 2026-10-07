# Implementation Plan: Keyboard shortcuts help

**Branch**: `001-shortcuts-help-m12-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

The board shortcuts (undo, redo, delete, show help) move into one registry, `src/pages/board/utils/boardShortcuts.ts`, that the existing keyboard hooks read (US1). A help dialog built on the library `Modal` renders that same registry grouped by `BoardShortcutGroupEnum`, opened by "?" or a header `IconButton`, closed by Escape, close button or a consumed outside press (US2). Front only, one git root.

## Technical Context

**Stack**: React 19 + TypeScript, `@septeo/septeo-ui-components` (local package), Tailwind v4 tokens, react-i18next (fr/en/es), Vitest + Testing Library.
**Gates**: `node node_modules/vitest/vitest.mjs run <tests of the task>`, `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`, `node node_modules/eslint/bin/eslint.js src`.
**Constraints**: no change to the library; no new shortcut beyond "?" (the help itself); no backend.

## Design de reference

- Contract: [design.md](./design.md) — single variant of `Raccourcis.html`.
- Lib <-> design arbitrations: D1 library `Modal` kept as is (width 560px, padding, radius, shadow, title not reproduced, accepted gap (c)); D2 key text `--neutral-90` (orange-40 undefined); D3 no Duplicate; D4 no zoom rows, Navigation group hidden while empty; D5 group heading `--neutral-60`.
- Rule: every value of design.md is a requirement; a deviation = FAIL review.

## Standards

- @agent-os/standards/react/hooks — new `useShortcutsHelp`, extended shortcut hooks
- @agent-os/standards/react/i18n — labels, key names, aria-label via t()
- @agent-os/standards/accessibility/modal-dialog — help dialog reuses the library Modal
- @agent-os/standards/accessibility/icons-and-labels — icon-only header keyboard button
- @agent-os/standards/constants — registry and key constants naming
- @agent-os/standards/react/component-structure — new widget folder and props file
- @agent-os/standards/testing/testing-patterns — mirrored tests, component pattern
- @agent-os/standards/testing/mocking-conventions — board.test.tsx mocks
- Depot prime : @agent-os/standards/accessibility/modal-dialog — `Modal` built on `showModal()` with native Escape/backdrop -> installed `Modal` renders `<dialog open>` (no `showModal`, no Escape, no outside close, fixed `septeo-modal-title` id): Escape and outside press are handled by `useShortcutsHelp`.

## Verified facts

- `src/pages/board/hooks/useBoardHistoryShortcuts.ts:10-13` — `isTextFieldTarget` — local non-exported helper (INPUT, TEXTAREA, SELECT, contentEditable) (source : recon inline)
- `src/pages/board/hooks/useBoardHistoryShortcuts.ts:19-22` — `handleKeyDown` — undo = (ctrl or meta)+Z without shift; redo = (ctrl or meta)+Shift+Z or ctrlKey+Y (source : recon inline)
- `src/pages/board/hooks/useDeleteShortcut.ts:3-12` — `DELETE_KEY` — Delete key, same duplicated `isTextFieldTarget` (source : recon inline)
- `src/pages/board/board.tsx:72-74` — `useBoardHistoryShortcuts` — mounted with canUndo/canRedo gated by `canUseHistory` (source : recon inline)
- `src/pages/board/board.tsx:144` — `useDeleteShortcut` — mounted with `handleDelete` (source : recon inline)
- `src/pages/board/board.tsx:239-253` — `PresenceAvatars` — header: left group (back, name, share, export) and `PresenceAvatars` at the right; the keyboard button goes just before it (source : recon inline)
- `src/pages/board/board.tsx:255` — `ShareBoardModal` — page-level modals are rendered after the canvas, outside it (source : recon inline)
- `src/components/widgets/zoomControls/zoomControls.tsx:10-31` — `ZoomControls` — zoom only through buttons; no keyboard handler for zoom anywhere in src (grep keydown) (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:82-83` — `handleBackgroundClick` — canvas reacts to pointer and click events: an outside press must swallow both pointerdown and the following click (source : recon inline)
- `src/components/widgets/toolbar/toolbar.tsx:28` — `IconButton` — existing usage `icon`, `label={t(...)}`, `onClick` (source : recon inline)
- `src/i18n/locales/fr.json:73` — `toolbar` — `pages.board.toolbar.undo` / `redo` exist (Annuler/Undo/Deshacer, Rétablir/Redo/Rehacer): reused as Undo/Redo labels (source : recon inline)
- `src/__tests__/i18n/localesParity.test.ts:6-15` — `getDeepKeys` — key parity fr/en/es and no empty value (source : recon inline)
- Library `Modal` (`node_modules/@septeo/septeo-ui-components/dist/index.js`, line 75 onward) renders `<dialog open>` with its own close `Button` (`ri-close-line`) and no Escape/outside handling; `ModalProps` has no className/width (source : recon inline)
- Freshness: working tree on `sk-audit-m12-r1`, up to date with `origin/dev` (e1ac1ce).

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/pages/board/utils/isTextFieldTarget.ts` | create (extracted from both hooks) | US1 |
| `src/pages/board/utils/boardShortcuts.ts` (+ `types/boardShortcut.ts`, `types/boardShortcutGroupEnum.ts`) | create | US1 |
| `src/pages/board/hooks/useBoardHistoryShortcuts.ts` | extend | US1 |
| `src/pages/board/hooks/useDeleteShortcut.ts` | extend | US1 |
| `src/i18n/locales/{fr,en,es}.json` | extend (shortcut labels, groups) | US1 |
| `src/pages/board/utils/getShortcutKeyLabels.ts` | create | US2 |
| `src/pages/board/components/widgets/shortcutsHelpModal/shortcutsHelpModal.tsx` (+ `types/shortcutsHelpModal.ts`) | create | US2 |
| `src/pages/board/hooks/useShortcutsHelp.ts` | create | US2 |
| `src/pages/board/board.tsx` | extend (button, hook, modal) | US2 |
| `src/i18n/locales/{fr,en,es}.json` | extend (title, key names) | US2 |

## Decisions

- Registry shape: `BOARD_SHORTCUTS: readonly BoardShortcut[]`, each `{ id, group, labelKey, combos }`, combo `{ key, ctrl, shift? }`; `ctrl` means Ctrl or Cmd; `shift` undefined = not checked (needed for "?"). The help shows `combos[0]`. Side effect: Cmd+Y now redoes on macOS like Ctrl+Y (the registry does not distinguish ctrl from meta) — accepted, harmless.
- Order of groups = declaration order of `BoardShortcutGroupEnum` (EDITING, NAVIGATION, HELP), labels via `BOARD_SHORTCUT_GROUP_LABEL_KEYS` in the enum file; NAVIGATION has no shortcut today and is not rendered (design D4).
- Escape / outside press live in `useShortcutsHelp` (state + listeners) so `ShortcutsHelpModal` stays presentational; outside = target not inside a `dialog` element; pointerdown and the next click are swallowed in capture phase on `window`.
- "?" while open keeps it open; other shortcuts unchanged while open (spec Assumptions).
- Undo/Redo labels reuse `pages.board.toolbar.undo|redo`; new keys under `pages.board.shortcuts.*`.

## Artifacts

spec.md, plan.md, tasks.md, recon.md, design.md, checklists/requirements.md
