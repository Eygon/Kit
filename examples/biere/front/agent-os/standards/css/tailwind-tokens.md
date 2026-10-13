---
name: tailwind-tokens
description: Tailwind v4 CSS-first config; colours, radii, shadows and fonts come from the HeroUI v3 theme variables remapped to the Mousse palette, plus the project tokens, exposed as Tailwind utilities (bg-surface, text-muted, bg-accent, bg-secondary, bg-highlight, border-mousse, rounded-mousse, shadow-mousse, font-display) — never the Tailwind palette, never a hard-coded colour, no dark mode
metadata:
  type: project
---

# Tailwind + HeroUI Design Tokens

Tailwind v4 — CSS-first config in `src/index.css`, no `tailwind.config.js`:

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@fontsource/shrikhand/400.css";
@import "@fontsource/plus-jakarta-sans/600.css";
@import "@fontsource/plus-jakarta-sans/700.css";
@import "./styles/mousseTheme.css";
@import "./styles/mousseComponents.css";
```

`@heroui/styles` declares the theme variables (`--background`, `--accent`, `--radius`…) and
maps them to Tailwind theme keys with `@theme inline` (`--color-accent: var(--accent)`),
so every token is a **native utility**: write `bg-accent`, not `bg-(--accent)`.
`src/styles/mousseTheme.css` remaps those variables to the Mousse palette and adds the
project tokens. **What each colour is for** (60/30/10, amber reserved) is
`ui/design-system`; this standard only says how to write it.

Never use the Tailwind palette (`text-blue-500`, `bg-zinc-100`) or a hard-coded value
(`#f59e0b`, `oklch(...)`, `rgb(...)`) — the palette is still compiled in by Tailwind, but
it ignores the brand. A colour that is not in the table below is a theme change in
`src/styles/mousseTheme.css` (and in `ui/design-system`), never a literal in a component.

## Colours (semantic)

| Role | Utilities |
|---|---|
| Page | `bg-background` `text-foreground` (`bg-background-secondary`, `bg-background-tertiary`) |
| Non-floating container (card, tab bar, empty state) | `bg-surface` `text-surface-foreground`, levels `bg-surface-secondary` `bg-surface-tertiary` |
| Floating container (popover, modal, menu, toast) | `bg-overlay` `text-overlay-foreground` |
| Secondary text, placeholder icons | `text-muted` |
| Neutral control fill | `bg-default` `text-default-foreground`, `bg-default-soft` |
| Brand / active / primary action (hop green) | `bg-accent` `text-accent-foreground`; soft: `bg-accent-soft` `text-accent-soft-foreground`; hover: `bg-accent-hover` |
| Secondary (leather brown, project token) | `bg-secondary` `text-secondary-foreground`, `bg-secondary-hover` |
| Key interaction, ratings, stats badges (amber, project token — reserved, see `ui/design-system`) | `bg-highlight` `text-highlight-foreground` |
| Status | `success` `warning` `danger` — each with `-foreground`, `-soft`, `-soft-foreground`, `-hover` (`text-danger`, `bg-danger-soft`) |
| Lines (ink) | `border-mousse` (2px, ink by default), `border-t-mousse`, `border-border`, `border-separator` / `bg-separator` (ink 30 %) |
| Form field | `bg-field` `text-field-foreground` `placeholder:text-field-placeholder` `border-field-border` |
| Focus | `ring-focus` / the `focus-ring` utility (see `accessibility/focus-visibility`) |
| Link, backdrop, segment | `text-link`, `bg-backdrop`, `bg-segment` |

```tsx
<nav className="border-t-mousse bg-surface text-foreground" />
<section className="rounded-mousse border-mousse bg-surface shadow-mousse" />
<span className="bg-accent-soft text-accent-soft-foreground" />
<p role="alert" className="text-danger" />
```

Opacity modifiers work on tokens (`bg-surface/90`) — the variable stays the source.

## Radius

The DA uses three radii only: `rounded-mousse` (1rem, cards, panels, sheets, popovers),
`rounded-control` (0.75rem, buttons, fields, tabs — HeroUI's `rounded-field` is the same
value) and `rounded-full`. HeroUI's `--radius` scale (`rounded-lg`, `rounded-xl`…) still
exists for its own components; do not reach for it in a feature, and never
`rounded-[0.6rem]`.

## Shadows

One shadow: `shadow-mousse`, a hard `4px 4px 0` ink offset (`shadow-mousse-pressed` for a
pushed state). HeroUI's `shadow-surface` and `shadow-overlay` are remapped to it and
`shadow-field` to none, so HeroUI components follow. Never a Tailwind `shadow-sm` …
`shadow-2xl`, `drop-shadow-*` or `blur-*` (see `ui/design-system`).

## Typography and spacing

Fonts: `font-display` (Shrikhand, titles, counters, badges) and `font-sans` (Plus Jakarta
Sans, everything else — the default, weight 600 from `body`). HeroUI defines no font-size
or spacing tokens: use the Tailwind scale (`text-sm`, `text-2xl`, `gap-4`, `px-4`), never
an arbitrary value when a step exists (see `css/rem-units`). `--spacing` (0.25rem) is the
base of the scale.

## No dark mode

The app is light only for now. `index.html` carries `class="light" data-theme="light"`,
`mousseTheme.css` maps the palette on `.light` and `.dark` alike, and nothing calls
HeroUI's `useTheme()`. Never write a `dark:` variant.

## Customising the theme

Override the variable, not the utility, in `src/styles/mousseTheme.css` — the hex values
exist there only, as `--mousse-*` primitives, and the HeroUI / project variables point at
them:

```css
:root,
.light,
.dark,
[data-theme="light"],
[data-theme="dark"] {
  --accent: var(--mousse-hop);
  --accent-foreground: var(--mousse-cream);
}
```

A new project token gets its Tailwind key in the `@theme inline` block of the same file
(`--color-highlight: var(--highlight)` → `bg-highlight`). The HeroUI variable list is in
`node_modules/@heroui/styles/dist/themes/default/variables.css` and the utility mapping in
`node_modules/@heroui/styles/dist/themes/shared/theme.css`.
