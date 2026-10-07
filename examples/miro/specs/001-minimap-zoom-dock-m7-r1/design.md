# Design reference: Board navigation (minimap + zoom dock)

## 1. Source

- URL: https://claude.ai/design/p/b41e9c07-2d6a-4f3e-8c55-91a0d7e4f2b3?file=Navigation.html
- projectId: `b41e9c07-2d6a-4f3e-8c55-91a0d7e4f2b3` ("Tableau — Navigation", read-only)
- File: `Navigation.html`, variant **a** (`TWEAK_DEFAULTS` EDITMODE `{"placement":"a","showPercent":true}`)
- Read on: 2026-10-07
- Imported files: `Navigation.html`, `minimap.jsx`, `zoom-controls.jsx`, `styles.css`; `_ds/colors_and_type.css` read only to resolve variables missing from the base table (`--radius-s`, `--radius-m`, `--elev-1`, `--elev-2`, `--font-weight-semibold`, `--font-sans`). Excluded (shell): `shell.js`, `shell.css`, `tweaks-panel.jsx`.
- No file truncated.
- reference.png: not produced (claude-in-chrome unavailable in this session).
- The imported `_ds` has no identifier folder (`_ds/colors_and_type.css` at the root), so it cannot be compared with `a730067f` from design-tokens.md; every variable used here was re-read in that css.

## 2. Scope

Reproduced (variant a: minimap and zoom grouped bottom-right of the canvas):
- C1 Navigation dock (bottom-right container, column).
- C2 Minimap.
- C3 Zoom bar (zoom out, percentage, zoom in, Fit all).

Excluded: variant b (minimap top-right, `.nav-dock--b`), application shell, tweaks panel, collapsible minimap, zoom keyboard shortcuts. Glyphs `−`, `+`, `⤢` of the mockup are placeholders for icons (see C3).

## 3. Token mapping

Base table copied from `_shared/design-tokens.md`, then checked against the installed lib (`node_modules/@septeo/septeo-ui-components/dist/septeo.css`) and `src/index.css`.

### Palettes

| design | project |
|---|---|
| grey-XX | neutral-XX |
| blueS-XX | primary-XX |
| orangeS-XX | secondary-XX |
| green-* | success-* |
| red-* | error-* |
| purple-* | information-* |
| yellow-* | warning-* |

grey-01 maps to neutral-00.

### Semantic variables

| design | project |
|---|---|
| --primary | primary-80 |
| --primary-hover | primary-70 |
| --secondary | primary-50 |
| --accent | secondary-50 |
| --primary-text-1 | primary-90 |
| --primary-bg | primary-05 |
| --primary-icon | primary-50 |
| --fg-1 | neutral-90 |
| --fg-2 | neutral-70 |
| --fg-3 | neutral-60 |
| --fg-4 | neutral-50 |
| --bg-page | neutral-05 |
| --border-input | neutral-30 |
| --border-divider | neutral-10 |
| --border-cell | neutral-10 |
| --border-focus | primary-50 |

### Values used by this design (target checked in the installed css)

| design value | hex (design) | project target | exists |
|---|---|---|---|
| --bg-page | — | `bg-(--neutral-05)` | yes (#f6f7f9) |
| --border-divider | — | `border-(--neutral-10)` | yes (#eceef2) |
| --fg-1 | — | `text-(--neutral-90)` | yes (#1c2030) |
| --fg-2 | — | `text-(--neutral-60)` (neutral-70 absent, §5 D3) | yes (#6b7385) |
| --grey-05 (hover bg) | #F3F4F6 | `bg-(--neutral-05)` | yes (#f6f7f9) |
| --grey-30 (minimap item fill) | #D1D5DB | `fill-(--neutral-10)` (neutral-30 absent, §5 D4) | yes (#eceef2) |
| --blueS-05 (viewport fill) | #EFF6FF | `fill-(--primary-05)` | yes (#eef4ff) |
| --blueS-60 (viewport stroke) | #2563EB | `stroke-(--primary-60)` | yes (#2f6fed) |
| --radius-m 8px | — | `rounded-(--radius)` | yes (8px) |
| --radius-s 4px | — | `rounded-(--radius-tiny)` | yes (4px) |
| --elev-1 `0 1px 2px rgba(17,24,39,.06)` | — | `shadow-xs` (§5 D5) | Tailwind theme |
| --elev-2 `0 2px 8px rgba(17,24,39,.10)` | — | `shadow-sm` (§5 D5) | Tailwind theme |
| --font-weight-semibold 600 | — | `font-semibold` | Tailwind |
| --font-sans | — | inherited from `body` (`src/index.css`) | yes |

### Sizes

| px (design) | where | project target |
|---|---|---|
| 16px right/bottom | C1 offset | `right-(--spacing-4) bottom-(--spacing-4)` (--spacing-4 = 16px) |
| 8px gap | C1 gap | `gap-(--spacing-2)` (--spacing-2 = 8px) |
| 200px x 140px | C2 box | `w-50 h-35` |
| 1px border | C2, C3 | `border` |
| 36px height | C3 | `h-9` |
| 0 4px padding | C3 | `px-(--spacing-1)` (--spacing-1 = 4px) |
| gap var(--space-7) | C3 gap | `gap-(--spacing-1)` (4px, §5 D1) |
| 28px x 28px | C3 buttons | `size-7` |
| 48px min-width | C3 value | `min-w-12` |
| 14.5px font-size | C3 value | `text-(length:--font-size-normal)` (14px, §5 D2) |
| 20px line-height | C3 value | `leading-(--line-height-small)` (20px) |
| 2px min item size | C2 items | SVG attribute, computed (not CSS) |
| 1.5 stroke-width | C2 viewport | SVG attribute `strokeWidth={1.5}` |

Depot prime: design-tokens.md names spacing tokens `--spacing-tiny`, `--spacing-very-moderate`, `--spacing-base`; the installed lib only defines `--spacing-1`..`--spacing-8` (4px steps). Targets above use the installed names. Warning: `--spacing-7` exists in the lib and is **28px**; it is NOT the design's `--space-7`.

## C1 Navigation dock

- box: `position: absolute; right: 16px; bottom: 16px`; flex column; gap 8px; align-items flex-end; above the world layer (`z-10`, as the current zoom bar).
- children, top to bottom: C2 Minimap, C3 Zoom bar.
- classes expected: `absolute right-(--spacing-4) bottom-(--spacing-4) z-10 flex flex-col items-end gap-(--spacing-2)`.
- does not catch canvas clicks: a click inside the dock never creates an item nor deselects (stops propagation to the canvas background).

## C2 Minimap

- box: width 200px; height 140px; background --bg-page; border 1px --border-divider; radius 8px; box-shadow --elev-2 -> `shadow-sm` (§5 D5); overflow hidden.
- content: one SVG 200x140. Scale = `min(200 / world.width, 140 / world.height)`, world = bounding box of all items.
- items: one rect per item at `(item.x - world.x) * scale`, `(item.y - world.y) * scale`, width/height `max(2, size * scale)`; fill --grey-30 -> `fill-(--neutral-10)` (§5 D4).
- viewport rectangle: visible area in world coordinates, same transform; fill --blueS-05 at opacity 0.4 (`fill-opacity` 0.4); stroke --blueS-60, stroke-width 1.5.
- states: default only (no hover state in the mockup); keyboard focus per accessibility/focus-visibility. Updates when the view is panned/zoomed and while an item is dragged.
- behaviour: click on the map = center the main view on the clicked world point (zoom unchanged).
- accessibility: root is a native `button type="button"` (§5 D9) with i18n aria-label (mockup: "Vue d ensemble du tableau"); the SVG is `aria-hidden`.
- classes expected: `w-50 h-35 overflow-hidden rounded-(--radius) border border-(--neutral-10) bg-(--neutral-05)` + `shadow-sm`.

## C3 Zoom bar

- box: flex row; align-items center; gap --space-7 -> 4px (§5 D1); height 36px; padding 0 4px; background --bg-page; border 1px --border-divider; radius 8px; box-shadow --elev-1 -> `shadow-xs` (§5 D5).
- order: zoom out, value, zoom in, Fit all.
- buttons: width 28px; height 28px; radius 4px; color --fg-2 -> neutral-60 (§5 D3); background transparent. Hover: background --grey-05, color --fg-1. Native `button type="button"` (§5 D6).
- icons: zoom out `ri-subtract-line`, zoom in `ri-add-line` (as today), Fit all `ri-fullscreen-line` (§5 D7).
- value: min-width 48px; centered; font 600 14.5px/20px -> 600 14px/20px (§5 D2); color --fg-1; text `<round(zoom*100)> %` (mockup format: number, space, `%`).
- labels (aria-label, i18n fr/en/es): zoom out, zoom in, Fit all, and the existing zoom group label.
- classes expected (container): `flex h-9 items-center px-(--spacing-1) rounded-(--radius) border border-(--neutral-10) bg-(--neutral-05)` `gap-(--spacing-1) shadow-xs`; buttons `size-7 rounded-(--radius-tiny) text-(--neutral-60) hover:bg-(--neutral-05) hover:text-(--neutral-90)`; value `min-w-12 text-center font-semibold text-(length:--font-size-normal) leading-(--line-height-small) text-(--neutral-90)`.

## 5. Lib <-> design arbitrations

- D1 C3 gap `var(--space-7)`: variable absent from the design `_ds` (and NOT the lib `--spacing-7` = 28px) -> project 4px spacing `gap-(--spacing-1)` (0quater, intent).
- D2 C3 value font-size 14.5px (half pixel) -> nearest token 14px `text-(length:--font-size-normal)`, accepted gap (0quater + clarify Q1).
- D3 --fg-2 (neutral-70) absent from the installed lib -> nearest existing `--neutral-60` (clarify Q1).
- D4 --grey-30 (neutral-30) absent from the installed lib -> nearest existing `--neutral-10` (clarify Q1).
- D5 --elev-1 / --elev-2 have no lib token -> Tailwind theme `shadow-xs` (C3) / `shadow-sm` (C2), accepted gap (0quater).
- D6 zoom buttons: lib `IconButton` is 40x40, radius 8px, neutral-90, hover neutral-10, no className prop, so (a) is impossible -> (b) native `<button type="button">` styled to the pixel, icon via lib `Icon` (0quater). Septeo-library-first gap accepted.
- D7 Fit all icon: mockup glyph `⤢` -> `ri-fullscreen-line` (0quater).
- D8 percentage: keep the existing behaviour (click resets the zoom) inside a native button styled as the C3 value (no border, no background) (clarify Q1).
- D9 minimap click target: standard accessibility/semantic-elements forbids a clickable non-native element -> the SVG sits inside a native `<button type="button">` (C2 box) with the i18n aria-label; the clicked point is computed from the click position in the button (clarify Q2).

## 6. Expected verification

- C1: dock wrapper classes in `boardCanvas.tsx`; minimap above zoom bar in DOM order.
- C2: classes of C2 on the minimap root; SVG `width="200" height="140"`; viewport rect `fillOpacity` 0.4 and `strokeWidth` 1.5; computed style on the authenticated tab of the main repo (never a second Vite port).
- C3: container and button classes in `zoomControls.tsx`; icon class names; value text `125 %` after one zoom in.
