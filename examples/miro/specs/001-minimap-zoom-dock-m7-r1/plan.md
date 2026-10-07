# Implementation Plan: Board minimap and grouped zoom controls

**Branch**: `001-minimap-zoom-dock-m7-r1` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

Front-only change on the board page. The existing zoom bar (`ZoomControls`) is restyled to design.md §C3 and gains a "Fit all" action; it moves into a bottom-right dock rendered by `BoardCanvas` (§C1). A new page-scoped `Minimap` (§C2) joins the dock in US2. Every action goes through the single existing view state `useViewport`, extended with `fitTo` (US1) and `centerOn` (US2); the canvas size comes from a new `useElementSize` hook.

## Technical Context

**Stack**: React 19 + TypeScript, Vite, Tailwind v4 (CSS-first, `src/index.css`), `@septeo/septeo-ui-components`, react-i18next (`src/i18n/locales/{fr,en,es}.json`), Vitest + Testing Library.
**Gates**: `node node_modules/vitest/vitest.mjs run <test files>`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js <files>`.
**Constraints**: no backend change, no new dependency, no second zoom state; zoom limits `MIN_ZOOM`/`MAX_ZOOM` unchanged.

## Design reference

- File: [design.md](./design.md), variant **a** (minimap and zoom grouped bottom-right).
- Lib <-> design arbitrations: design.md §5 D1-D9 (native buttons instead of `IconButton`, 4px gap, 14px value font, nearest neutral tokens, Tailwind shadows, `ri-fullscreen-line`, percentage keeps reset, minimap as native button).
- Rule: every value of design.md is a requirement; a gap = FAIL review.

## Standards

- @agent-os/standards/react/hooks — extends useViewport, creates useElementSize
- @agent-os/standards/react/component-structure — minimap folder, props type file
- @agent-os/standards/react/i18n — new aria-labels in three locales
- @agent-os/standards/accessibility/semantic-elements — native buttons, minimap click target
- @agent-os/standards/accessibility/icons-and-labels — icon-only zoom buttons need labels
- @agent-os/standards/accessibility/focus-visibility — new focusable controls need focus ring
- @agent-os/standards/testing/testing-patterns — mirrored tests, query by role
- Ecart accepte : @agent-os/standards/septeo-library-first — `IconButton` (40x40, no className) replaced by native `button type="button"` for the zoom bar — design.md 28x28 cannot be reached with the lib (0quater, design.md §5 D6)
- Ecart accepte : @agent-os/standards/css/tailwind-tokens — shadow without Septeo token: Tailwind theme `shadow-xs` / `shadow-sm` — the installed lib defines no shadow token (0quater, design.md §5 D5)
- Depot prime : @agent-os/standards/react/i18n — `src/utils/translate/*.json` and `esTranslations.test.ts` -> `src/i18n/locales/*.json` and `src/__tests__/i18n/localesParity.test.ts`
- Depot prime : @agent-os/standards/react/component-structure — `@prjTypes/...` alias -> `@/types/...` / `@/pages/board/types/...` (only alias `@/*`)

## Verified facts

- `src/pages/board/hooks/useViewport.ts:8-24` — `useViewport` — single view state `{ x, y, zoom }`; exposes `zoomIn`, `zoomOut`, `reset`, `panBy`; zoom clamped by `clampZoom` (source : recon inline)
- `src/pages/board/utils/clampZoom.ts:3` — `clampZoom` — clamps between `MIN_ZOOM` and `MAX_ZOOM` (source : recon inline)
- `src/constants/canvasConstants.ts:1-7` — `MIN_ZOOM` — 0.25 / `MAX_ZOOM` 3 / `ZOOM_STEP` 0.25 / `DEFAULT_ZOOM` 1 (source : recon inline)
- `src/pages/board/types/viewport.ts:1-5` — `Viewport` — `x`, `y` are screen offsets, `zoom` the scale (source : recon inline)
- `src/pages/board/utils/screenToWorld.ts:3-6` — `screenToWorld` — world = (screen - offset) / zoom (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:29` — `useViewport` — the only consumer of the view state (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:34-37` — `connectorItems` — items with the dragged position applied, the data the minimap must read to follow drags (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:45-55` — `handleBackgroundClick` — a click bubbling to the viewport deselects or creates an item: dock clicks must stop propagation (source : recon inline)
- `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:95` — `ZoomControls` — mounted with `zoom`, `onZoomIn`, `onZoomOut`, `onReset` (source : recon inline)
- `src/components/widgets/zoomControls/zoomControls.tsx:5-26` — `ZoomControls` — absolute bottom-right group, lib `IconButton` x2, percentage button = reset, format `125%` (source : recon inline)
- `src/types/components/zoomControls.ts:1-6` — `ZoomControlsProps` — props type to extend with `onFit` (source : recon inline)
- `src/types/models/boardItem/boardItem.ts:4-18` — `BoardItem` — every item (freehand included) has `x`, `y`, `width`, `height`: source of the bounding box and minimap shapes (source : recon inline)
- `src/i18n/locales/fr.json:76-81` — `zoom` — keys `pages.board.zoom.{label,in,out,reset}` exist (source : recon inline)
- `src/__tests__/pages/board/components/modules/boardCanvas/boardCanvas.test.tsx:67-82` — `zooms the world with the zoom controls` — asserts `125%` and the reset button name; format changes to `125 %` (source : recon inline)
- No test exists for `useViewport` nor `ZoomControls` on origin/dev; no element-size hook (`ResizeObserver` absent from `src`) (source : recon inline, git ls-tree / git grep)
- Lib check: `node_modules/@septeo/septeo-ui-components/dist/index.d.ts` — `IconButtonProps` has no `className`; `septeo.css` defines `--spacing-1..8` (4px steps, `--spacing-7` = 28px), no shadow token, no `--neutral-30` / `--neutral-70` (source : recon inline)
- origin/dev sha e1fd828 at prep time.

## Project Structure (files touched)

| File | Action | US |
|---|---|---|
| `src/pages/board/utils/getWorldBounds.ts` | create | US1 |
| `src/pages/board/hooks/useViewport.ts` | extend (`fitTo`) | US1 |
| `src/pages/board/hooks/useElementSize.ts` | create | US1 |
| `src/components/widgets/zoomControls/zoomControls.tsx` (+ `src/types/components/zoomControls.ts`) | extend | US1 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` | extend (dock, size, fit) | US1 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US1 |
| `src/pages/board/hooks/useViewport.ts` | extend (`centerOn`) | US2 |
| `src/pages/board/components/widgets/minimap/minimap.tsx` (+ `src/pages/board/types/minimap.ts`) | create | US2 |
| `src/pages/board/components/modules/boardCanvas/boardCanvas.tsx` | mount minimap | US2 |
| `src/i18n/locales/{fr,en,es}.json` | extend | US2 |

## Decisions

- One view state: `fitTo` and `centerOn` are added to `useViewport`; no other hook stores zoom or offset (intent + FR-004).
- Canvas size: `useElementSize(ref)` with `ResizeObserver`, returning `{ width, height }` (0 before the first measure) — alternative "read `getBoundingClientRect` on click" rejected because the minimap needs the size on every render.
- `getWorldBounds(items)` returns `null` for an empty list, so fit is a no-op and the minimap renders an empty frame.
- The dock wrapper (§C1) stays inside `boardCanvas.tsx` (a layout div, no own component); `ZoomControls` loses its own absolute positioning.
- Minimap is page-scoped (`src/pages/board/components/widgets/minimap/`): only the board consumes it (file-placement).
- Dock clicks call `stopPropagation` so `handleBackgroundClick` never fires from the dock.

## Artifacts

spec.md, plan.md, design.md, recon.md, tasks.md, checklists/requirements.md
