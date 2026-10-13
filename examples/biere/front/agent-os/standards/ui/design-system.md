---
name: design-system
description: Mousse art direction as checkable rules — six-colour palette through semantic tokens only (accent hop green, secondary leather brown, highlight amber reserved for key interactions, paper background, cream surfaces, ink text and lines), 60/30/10, 2px ink borders, hard 4px shadows, 12-16px radii, flat fills, Shrikhand display + Plus Jakarta Sans 600, light theme only, compiled examples with the real HeroUI components
metadata:
  type: project
  checks:
    - re: "#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\\("
      files: "^src/.*\\.(tsx|ts)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "couleur en dur dans le code (utiliser un jeton : bg-accent, bg-secondary, bg-highlight, bg-surface, text-foreground...)"
    - re: "#[0-9a-fA-F]{3,8}\\b"
      files: "^src/.*\\.css$"
      skip: "src/styles/mousseTheme\\.css$"
      msg: "couleur en dur hors de src/styles/mousseTheme.css (seul fichier qui porte les hex de la palette)"
    - re: "\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|divide|placeholder|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\\d{2,3})?\\b"
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "palette Tailwind (hors DA) : utiliser les jetons semantiques"
    - re: "\\b(?:bg|text|border|ring|outline|fill|stroke|shadow|decoration)-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|color:|var\\(--mousse-)"
      files: "^src/.*\\.(tsx|ts)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "couleur arbitraire entre crochets : utiliser un jeton"
    - re: "\\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner)\\b|\\bdrop-shadow\\b|\\bdrop-shadow-|(?<![\\w-])(?:backdrop-)?blur(?:-(?:xs|sm|md|lg|xl|2xl|3xl|none))?(?![\\w-])"
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "ombre floue ou flou : la DA n'a que l'ombre dure shadow-mousse"
    - re: "\\bbg-(?:linear|radial|conic|gradient)-|(?:linear|radial|conic)-gradient\\("
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "degrade interdit : aplats uniquement"
    - re: "\\brounded-\\["
      files: "^src/.*\\.tsx$"
      skip: "(__tests__/|\\.(test|spec)\\.|components/elements/mascot/)"
      msg: "rayon arbitraire : rounded-mousse, rounded-control ou rounded-full"
    - re: "(?<![\\w-])dark:|\\buseTheme\\b"
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "pas de mode sombre : le theme clair est verrouille"
    - re: "style=\\{\\{[^}]*(?:color|background|boxShadow|borderColor|fontFamily)"
      files: "^src/.*\\.tsx$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "style en ligne pour une couleur, une ombre ou une police : utiliser les jetons"
---

# Mousse design system

Source: Thomas's art direction (palette, rules, mascot states) built on the mascot — a hop
cone with a beer-foam hat, backpack, notebook and magnifying glass, drawn in a **vintage
rubber-hose cartoon** style. Everything below is already wired in the theme; a feature only
has to use the tokens and the HeroUI components. When a rule here and an older standard
disagree, this one wins — and the older one is the bug.

| File | Holds |
|---|---|
| `src/styles/mousseTheme.css` | the six hex values (`--mousse-*`), the HeroUI variables mapped to them, the project tokens (`--secondary`, `--highlight`, `--mousse-border`, `--mousse-shadow`, `--mousse-radius`, `--mousse-control-radius`), the fonts, the mascot keyframes, the `border-mousse` / `border-t-mousse` / `sparkle-shape` utilities |
| `src/styles/mousseComponents.css` | the global restyle of HeroUI components (border, hard shadow, radius, pressed state) — the **only** place that targets HeroUI BEM classes |
| `src/index.css` | imports only (Tailwind, `@heroui/styles`, `@fontsource/*`, the two files above) and the `body` defaults |

## 1. Palette — tokens, never values

| Role | DA name | Primitive | Semantic token → utilities | Where |
|---|---|---|---|---|
| Background (60 %) | Papier Craft `#F0EAE1` | `--mousse-paper` | `--background` → `bg-background` | the page behind everything; never a card |
| Surfaces (60 %) | Crème / Écume `#F4F1EA` | `--mousse-cream` | `--surface`, `--overlay`, `--field-background` → `bg-surface`, `bg-overlay`, `bg-field`; also `text-accent-foreground`, `text-secondary-foreground` | cards, panels, tab bar, popovers, fields; text on green or brown |
| Primary (30 %) | Vert Houblon `#2D6A4F` | `--mousse-hop` | `--accent` (also `--success`, `--focus`, `--link`) → `bg-accent text-accent-foreground`, `text-accent`, `bg-success` | main CTA (`Button variant="primary"`), active tab, "Découverte" / "Capturé" chips, links, focus ring |
| Secondary (30 %) | Brun Cuir `#4A2E1B` | `--mousse-leather` | `--secondary` → `bg-secondary text-secondary-foreground` (`bg-secondary-hover`) | secondary buttons, secondary cards (`Card variant="secondary"`), categories, secondary navigation |
| Highlight (10 %) | Jaune Ambré `#E9A825` | `--mousse-amber` | `--highlight` (also `--warning`) → `bg-highlight text-highlight-foreground` | **key interactions only**, see §2 |
| Ink | Noir Encre `#1D1C1A` | `--mousse-ink` | `--foreground`, `--border` → `text-foreground`, `border-border`; `--muted` (ink 72 % on paper) → `text-muted` | all text, every line, icons, hard shadows |

- Contrast (WCAG AA holds for every pair the tokens produce): ink on paper ≈ 15:1, ink on
  cream ≈ 16:1, cream on hop green ≈ 5.7:1, cream on leather ≈ 11:1, ink on amber ≈ 8:1,
  `text-muted` on paper ≈ 5.5:1. **Amber on paper or cream is ≈ 1.7:1: amber is a fill,
  never a text or icon colour** — on amber, write in ink (`text-highlight-foreground`).
- `danger` stays HeroUI's red: the DA has no red, errors still need one. Use it for errors
  and destructive actions only.
- A colour that is not in this table does not exist. Need one → change
  `src/styles/mousseTheme.css` **and** this table in the same commit. Never a hex, `rgb()`,
  `oklch()`, a Tailwind palette class (`bg-amber-400`, `text-green-700`), an arbitrary
  `bg-[...]` or an inline `style` colour in a component — the checks above flag them.
- The `--mousse-*` primitives are read by the theme files only. Components use the
  semantic utilities (`bg-accent`, not `bg-(--mousse-hop)`).

## 2. 60 / 30 / 10 — and amber is reserved

- **60 %** paper + cream: `bg-background` behind, `bg-surface` for containers. A screen is
  mostly these two.
- **30 %** hop green + leather brown: one green primary action per area, the active tab,
  status chips, secondary cards and buttons in brown. Large fills of green or brown are
  cards or headers, never the page background.
- **10 %** amber, **only** for:
  1. the key interaction of the screen — validate, "ajouter au Pokédex", favourite — at
     most **one amber button per screen**;
  2. ratings (stars, score fills) and XP / stats / level badges;
  3. the mascot's stand-in sparkles and badges (already in `Mascot`).

  Never for navigation (the tab bar is green), headings, borders, page or card
  backgrounds, decorative stripes, or a hover state.

## 3. Lines, shadows, radii — soft neo-brutalism

| Element | Rule | Utility / token |
|---|---|---|
| Border | 2px solid ink on every container lifted from the paper (card, panel, button, field, chip, popover, toast, tab) | `border-mousse` (width + style; colour = `--border`, ink); `border-t-mousse` for a single edge (the tab bar). Pair with `border-transparent` to keep the box size of an un-bordered state |
| Shadow | hard, offset, no blur: `4px 4px 0` ink | `shadow-mousse`; pressed: `shadow-mousse-pressed` + `translate-x-0.5 translate-y-0.5`. HeroUI `shadow-surface` / `shadow-overlay` are the same hard shadow; `shadow-field` is none |
| Radius | 16px for cards, panels, sheets, popovers; 12px for buttons, fields, tabs; full for pills, badges, avatars | `rounded-mousse`, `rounded-control`, `rounded-full` — nothing else |
| Fill | flat colour only | the tokens above; `-soft` tokens are flat translucent fills and stay allowed |

- **Forbidden:** blurred shadows (`shadow-sm` … `shadow-2xl`, `shadow-inner`,
  `drop-shadow-*`), `blur-*`, `backdrop-blur-*`, glassmorphism, gradients (`bg-linear-*`,
  `bg-radial-*`, `bg-conic-*`, `*-gradient()`), rounded values in brackets.
- The 2px border and the 4px shadow are the only `px` lengths of the app, and they live in
  `mousseTheme.css` as tokens (an ink line keeps its weight when the text grows); a
  component never writes them (see `css/rem-units`).
- A shadow needs room: keep at least `gap-2` / `p-1` around a `shadow-mousse` element, and
  never put one inside an `overflow-hidden` box that would clip its bottom-right edge.

## 4. Typography

| Use | Font | Utilities |
|---|---|---|
| Page title (`h1`) | Shrikhand (display, one weight) | `font-display text-3xl leading-tight` — `PageHeader` does it |
| Section / empty-state title (`h2`), counters, scores, badges | Shrikhand | `font-display text-xl` (counters `text-2xl`+, badges `text-sm`) |
| Everything else: body, labels, buttons, tabs | Plus Jakarta Sans | default `font-sans`, weight **600** (`body` is `font-semibold`); `font-bold` (700) for emphasis |

- Shrikhand was chosen over Chango and Bungee: its rounded, slanted brewery-sign letters
  match the rubber-hose line of the mascot, and it is narrower than Chango, so French
  titles still fit at 360px.
- Fonts come from `@fontsource/shrikhand` (400) and `@fontsource/plus-jakarta-sans` (600,
  700), imported in `src/index.css` — never a CDN `<link>`.
- `html` sets `font-synthesis: none`: Shrikhand has no bold, so `font-bold` on
  `font-display` does nothing — do not add it. Weights below 600 are not loaded and render
  as 600; do not write `font-normal` / `font-light` on `font-sans` text.
- Display text is short (a title, a number, a badge). Never a paragraph, a label, a
  button, a form field or a tab in `font-display`, never below `text-sm`.

## 5. HeroUI components in the DA

`mousseComponents.css` already gives HeroUI components the ink border, the radius, the hard
shadow and a "pushed" pressed state. Pick the variant; do not restyle.

| Need | Use |
|---|---|
| Main action (green) | `<Button variant="primary" size="lg">` |
| Secondary action (brown) | `<Button variant="secondary" size="lg">` |
| Neutral action (cream) | `<Button variant="tertiary" size="lg">` or `variant="outline"` |
| Low-priority action (no border, no shadow) | `<Button variant="ghost" size="lg">` |
| Destructive | `<Button variant="danger" size="lg">` / `danger-soft` |
| **Key interaction (amber, once per screen)** | `<Button variant="primary" size="lg" className="bg-highlight text-highlight-foreground">` |
| Card | `<Card>` (cream), `<Card variant="secondary">` (brown, cream text), `<Card variant="transparent">` (no border, no shadow) |
| Status chip | `<Chip color="accent" variant="primary">` ("Capturé", "Découverte") |
| Empty result | `EmptyStatePanel` (mascot + message, see `ui/mascot`) — not a bare HeroUI `EmptyState` |
| Page title | `PageHeader` |

- Never add `border`, `shadow-*` or `rounded-*` to a HeroUI component that already has
  them; never copy a component's markup to restyle it.
- A new HeroUI component that shows up with HeroUI's default look (blue accent, soft
  shadow, 1px grey border) is a theme gap: add its BEM class to `mousseComponents.css`
  next to its siblings, and say so in the PR.

## 6. Light theme only

The app has no dark mode for now. `index.html` sets `class="light" data-theme="light"` and
`color-scheme: light`; `mousseTheme.css` maps the palette on `.light` **and** `.dark`, so
even a stray `.dark` class renders the light palette. Never call HeroUI's `useTheme`,
never write a `dark:` variant, never read `prefers-color-scheme`.

## 7. Examples

```tsx
import { Button, Card, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

export const BeerCaptureCard = ({ name, onCapture }: BeerCaptureCardProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Header>
        <Card.Title className="font-display text-xl break-words">{name}</Card.Title>
        <Card.Description>{t("pages.encyclopedia.capture.description")}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-row flex-wrap gap-2">
        <Chip color="accent" variant="primary">
          {t("pages.encyclopedia.capture.discovered")}
        </Chip>
      </Card.Content>
      <Card.Footer className="flex flex-wrap gap-3">
        <Button variant="primary" size="lg" className="bg-highlight text-highlight-foreground" onPress={onCapture}>
          {t("pages.encyclopedia.capture.action")}
        </Button>
        <Button variant="ghost" size="lg">
          {t("common.later")}
        </Button>
      </Card.Footer>
    </Card>
  );
};
```

```tsx
<span className="rounded-full border-mousse bg-highlight px-3 py-0.5 font-display text-sm text-highlight-foreground">
  {t("pages.profile.level", { count: level })}
</span>

<section className="flex flex-col gap-3 rounded-mousse border-mousse bg-secondary p-4 text-secondary-foreground shadow-mousse">
  <h2 className="font-display text-xl">{t("pages.journal.styles.title")}</h2>
</section>
```

| ❌ Breaks the DA | Why | ✅ Instead |
|---|---|---|
| `className="rounded-lg bg-white shadow-lg"` | surgical white, blurred shadow, 8px radius | `className="rounded-mousse border-mousse bg-surface shadow-mousse"` |
| `className="font-bold text-amber-500"` | Tailwind palette, amber as a text colour | `className="font-display text-xl text-foreground"` |
| `className="bg-gradient-to-r from-green-500 to-emerald-600"` | gradient, palette | `<Button variant="primary" size="lg">` |
| `className="bg-[#2D6A4F] dark:bg-zinc-900"` | hard-coded colour, dark mode | `className="bg-accent"` |
| `<nav className="bg-highlight">` | amber spent on navigation | the tab bar: `bg-surface`, active tab `bg-accent` |
| `<Button className="rounded-full shadow-none border-0">` | restyles what the theme already set | `<Button variant="ghost" size="lg">` |

`BeerCaptureCardProps` lives in its types file (`react/file-decomposition`); the keys exist
in `fr.json` and `en.json` (`react/i18n`).

## 8. Before DONE

Open the screen at 390x844 (then 360 and 1024) and look at it, not only at the tests:

- no HeroUI blue, no grey 1px border, no soft shadow left;
- one amber element at most, and it is the key interaction;
- every lifted element has its ink border and a hard shadow that is not clipped;
- titles in Shrikhand, everything else in Plus Jakarta Sans; nothing unreadable;
- no horizontal scroll at 360px (see `ui/mobile-first`).
