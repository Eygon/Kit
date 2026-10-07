# Design contract: Keyboard shortcuts help

## 1. Source

- URL: https://claude.ai/design/p/c7d21f5a-8b3e-4e19-9a6d-3f0e2b8c1d47?file=Raccourcis.html
- projectId: c7d21f5a-8b3e-4e19-9a6d-3f0e2b8c1d47 ("Tableau — Aide raccourcis", canEdit false, read only)
- File: Raccourcis.html
- Variant: single variant (no TWEAK_DEFAULTS / EDITMODE block; `shortcuts-help.jsx` says "une seule variante")
- Date: 2026-10-07
- Imported files: `Raccourcis.html`, `shortcuts-help.jsx`, `styles.css`, `_ds/colors_and_type.css` (read to resolve unmapped variables; the `_ds` has no identifying folder name, so it is treated as "differs" from the a730067f reference of design-tokens.md)
- No file truncated (all far below 256 KiB).
- reference.png: not produced — claude-in-chrome unavailable in this session.
- Mock data of the mockup (row labels, key lists) are format examples only; the real list comes from the shortcut registry (spec FR-002).

## 2. Scope

Reproduced:
- C1 dialog container (through the library `Modal`, accepted gap §5 D1)
- C2 shortcut group (group heading + rows)
- C3 shortcut row (action label + keys)
- C4 key cap (`kbd`)
- C5 header keyboard button (entry point described in the `Raccourcis.html` comment: `ri-keyboard-line`, in the board header, left of the presence avatars; not drawn in the mockup)

Excluded:
- App shell (sidebar, page header layout other than the added button).
- Mockup row "Dupliquer Ctrl+D" (no such shortcut in the app, §5 D3).
- Mockup group "Navigation" rows (Zoom avant Ctrl+, Zoom arrière Ctrl-, Tout afficher Maj+1): no keyboard handler exists in the app; a group with no wired shortcut is not rendered (§5 D4).
- Shortcut customisation, new shortcuts.

## 3. Token mapping

Base table copied from `_shared/design-tokens.md`, then corrected against this `_ds` (`_ds/colors_and_type.css`) and the installed library (`node_modules/@septeo/septeo-ui-components/dist/septeo.css`). Targets checked in the installed css; a target absent there is flagged.

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
| grey-01 (#FFFFFF) | neutral-00 |

### Semantic variables (as used by this design)

| design | value in this _ds | project target | control hex (installed) |
|---|---|---|---|
| --fg-1 | #111827 | --neutral-90 | #1c2030 |
| --fg-3 | #9CA3AF (= grey-50; differs from base table fg-3 -> neutral-60) | --neutral-60 (the grey-50 counterpart is not installed, §5 D5) | #6b7385 |
| --bg-page | #F9FAFB | --neutral-05 (dialog background is the lib Modal's, §5 D1) | #f6f7f9 |
| --border-divider | #E5E7EB (grey-10) | --neutral-10 | #eceef2 |
| --grey-05 | #F3F4F6 | --neutral-05 | #f6f7f9 |
| --orange-40 | NOT DEFINED in the _ds nor in the project | --neutral-90 (project primary text, §5 D2) | #1c2030 |
| --radius-s | 4px | --radius-tiny | 4px |
| --radius-l | 16px | lib Modal radius `--radius` (§5 D1) | 8px |
| --elev-2 | 0 2px 8px rgba(17,24,39,.10) | lib Modal (§5 D1) | n/a |

### Sizes (one line per distinct value, target in code)

| design value | where | target in code |
|---|---|---|
| font-size 12px | C2 heading, C4 key | `text-(length:--font-size-small)` |
| font-size 14px | C3 label | `text-(length:--font-size-normal)` |
| line-height 16px | C2 heading | `leading-4` (no installed line-height token at 16px) |
| line-height 20px | C3 label | `leading-(--line-height-small)` |
| line-height 22px | C4 key | `leading-5.5` |
| height 36px | C3 row | `h-9` |
| height 24px | C4 key | `h-6` |
| min-width 24px | C4 key | `min-w-6` |
| padding 0 6px | C4 key | `px-1.5` |
| gap 4px | C3 keys | `gap-(--spacing-1)` |
| margin-top 20px | C2 group after group | `mt-(--spacing-5)` |
| radius 4px | C4 key | `rounded-(--radius-tiny)` |
| width 560px, padding 24px, radius 16px, title 16px/24px, title margin 16px | C1 | lib Modal as is (§5 D1) |

Project syntax: parentheses, never brackets; no hex literal; no `[Npx]`.

## C1 Dialog container

- Element: library `Modal` (`open: boolean`, `title: string`, `onClose: () => void`, `children?: ReactNode`; no `className`/width prop in `index.d.ts`).
- Title: `Modal title` = i18n "Raccourcis clavier" / "Keyboard shortcuts" / "Atajos de teclado". Rendered by the lib `h2`.
- Close button: the lib Modal's own ghost `Button` (`ri-close-line`) -> `onClose`.
- Box (width 560px, padding 24px, radius --radius-l, shadow --elev-2, bg --bg-page): NOT reproduced, lib values kept (§5 D1).
- Behaviours: closes on Escape key, on the lib close button, and on a pointer press outside the dialog element. The lib Modal renders `<dialog open>` without `showModal()`: it handles neither Escape nor outside click, the feature does.
- Content order: groups in the order Edition, Navigation, Help; a group with no wired shortcut is not rendered.

## C2 Shortcut group

- Wrapper: `section`; consecutive groups: margin-top 20px -> `mt-(--spacing-5)` on every group after the first.
- Heading `h3`: font 600 12px/16px -> `font-semibold text-(length:--font-size-small) leading-4`; color --fg-3 -> `text-(--neutral-60)`; `uppercase`.
- Labels (i18n): Edition / Navigation / Aide (fr), Editing / Navigation / Help (en), Edición / Navegación / Ayuda (es).

## C3 Shortcut row

- Box: `flex items-center justify-between h-9 border-b border-(--neutral-10)` (height 36px, border-bottom 1px --border-divider).
- Label: font 400 14px/20px -> `text-(length:--font-size-normal) leading-(--line-height-small) text-(--neutral-90)`.
- Keys container: `flex gap-(--spacing-1)` (gap 4px).
- Content: one row per wired shortcut binding; rows shown in this run: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z), Delete selection (Delete), Show this help (?). Labels fr/en/es from i18n (Annuler / Undo / Deshacer, Rétablir / Redo / Rehacer, Supprimer la sélection / Delete selection / Eliminar la selección, Afficher cette aide / Show this help / Mostrar esta ayuda).
- States: static, no hover/selected state in the mockup.

## C4 Key cap

- Element: native `kbd`.
- Box: `min-w-6 h-6 px-1.5 rounded-(--radius-tiny) bg-(--neutral-05) border border-(--neutral-10) text-center` (min-width 24px, height 24px, padding 0 6px, radius 4px, 1px border --border-divider, bg --grey-05).
- Typo: font 600 12px/22px -> `font-semibold text-(length:--font-size-small) leading-5.5`; color `text-(--neutral-90)` (§5 D2).
- Content: translated key names: Ctrl / Ctrl / Ctrl, Maj / Shift / Mayús, Suppr / Delete / Supr; letters and symbols verbatim (Z, ?).

## C5 Header keyboard button

- Element: library `IconButton` (`icon: string`, `label: string`, `onClick: () => void`, `active?: boolean`) with `icon="ri-keyboard-line"`, `label` = i18n of the dialog title.
- Placement: board page header, immediately left of `PresenceAvatars`, same right-hand group.
- Behaviour: click opens the dialog (C1).

## 5. Lib <-> design arbitrations

- D1 Dialog box (width 560px, padding 24px, radius 16px, shadow elev-2, bg-page, title typography and spacing): unreachable with the lib `Modal` (no width/className prop). Decision (c) accepted gap: lib Modal kept as is, no CSS override of the lib (0quater).
- D2 Key text color `--orange-40`: undefined in the design system. Decision: project primary text `--neutral-90`, no invented orange (0quater).
- D3 "Dupliquer Ctrl+D": shortcut absent from the app. Decision: neither displayed nor implemented (0quater).
- D4 Navigation rows (Ctrl+, Ctrl-, Maj+1): no keyboard handler exists (only ZoomControls buttons). Decision: not displayed, not implemented; the Navigation group renders only once a navigation shortcut is wired in the registry (0quater, recommended option).
- D5 Group heading color `--fg-3` = #9CA3AF (grey-50) in this _ds; its neutral counterpart at step 50 is not in the installed library. Decision: `--neutral-60` (base table mapping of --fg-3, installed) (clarify Q1).

## 6. Expected verification

- C1: JSX uses `Modal` from `@septeo/septeo-ui-components` with no extra wrapper styling the dialog box; tests: Escape, close button and outside pointer press each call `onClose`.
- C2: classes `mt-(--spacing-5)` (non-first group), heading `font-semibold text-(length:--font-size-small) leading-4 text-(--neutral-60) uppercase`.
- C3: classes `h-9 border-b border-(--neutral-10)`, label `text-(length:--font-size-normal) leading-(--line-height-small) text-(--neutral-90)`, keys `gap-(--spacing-1)`.
- C4: `kbd` with `min-w-6 h-6 px-1.5 rounded-(--radius-tiny) bg-(--neutral-05) border border-(--neutral-10) font-semibold text-(length:--font-size-small) leading-5.5 text-(--neutral-90)`; no `secondary-*`/orange token.
- C5: `IconButton icon="ri-keyboard-line"` rendered before `PresenceAvatars` in the board header.
- Computed style, if checked live: on the authenticated tab of the main repo only (never a second Vite port).
