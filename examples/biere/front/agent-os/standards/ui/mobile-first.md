---
name: mobile-first
description: Design at 390x844 first then widen with md:/lg:; touch targets >= 44px (2.75rem), no hover-only interaction, bottom tab bar for top-level navigation, drawers/bottom sheets over wide modals, min-h-dvh + safe-area insets, no horizontal overflow at 360px, long unbroken text truncated or wrapped
metadata:
  type: project
  checks:
    - re: "\\b(?:min-h-screen|h-screen)\\b|100vh"
      files: "^src/.*\\.(tsx|ts|css)$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "hauteur en vh / h-screen (utiliser min-h-dvh / h-dvh)"
    - re: "hover:(?:opacity-100|visible|block|flex|grid|inline-flex|inline-block|pointer-events-auto)\\b"
      files: "^src/.*\\.tsx$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "contenu revele seulement au survol (inaccessible au toucher)"
---

# Mobile First

Mousse is used standing at a bar, phone in one hand. Every screen is designed and checked
at **390x844** first, then widened. This standard covers layout and touch; the look
(palette, ink borders, hard shadows, fonts) is `ui/design-system`. Unprefixed utilities are the phone layout; `md:`
(48rem, tablet) and `lg:` (64rem, desktop) only *add* room — never the other way round.

```tsx
// ✅ phone first, widened
<main className="mx-auto w-full max-w-xl px-4 md:max-w-3xl md:px-6 lg:max-w-5xl" />
<ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" />

// ❌ desktop first, squeezed back down
<ul className="grid grid-cols-3 gap-6 max-md:grid-cols-1" />
```

## Touch targets: at least 44px

Anything tappable is at least `2.75rem` (`h-11` / `min-h-11` / `size-11`) in both
directions. HeroUI's defaults are smaller on phones — check before relying on them:

| Control | Default height | For a touch target |
|---|---|---|
| `Button` `size="md"` | 2.5rem (2.25rem from `md:`) | `size="lg"` (2.75rem) or `className="min-h-11"` |
| `Button` `isIconOnly` | 2.5rem square | `size="lg"` |
| `Select.Trigger`, `ListBox.Item` | `min-h-9` | `className="min-h-11"` |
| bottom tab (`NavLink`) | — | `min-h-14 min-w-11` |

Leave at least `gap-2` between two adjacent targets.

## No hover-only interaction

There is no hover on a touch screen. A hover may *decorate* (colour, underline, shadow),
it never *reveals* or *triggers*: an action shown only on `hover:` / `group-hover:`, or a
`Tooltip` carrying information found nowhere else, does not exist on a phone. Show the
action, put it in a `Dropdown` / `Drawer`, or make the tooltip text visible.

## Navigation: the bottom tab bar

Top-level navigation is the fixed bottom tab bar (`components/widgets/bottomTabBar`):
four `NavLink`s, icon + `t()` label, active tab marked by `aria-current="page"` (set by
`NavLink`). Its look follows the DA: cream `bg-surface` under a 2px ink `border-t-mousse`,
the active tab filled `bg-accent` with an ink border and `shadow-mousse`, inactive tabs
flat in ink — never amber (`ui/design-system` §2). A new top-level section is a new entry in
`TAB_BAR_ENTRIES` and a route (see `react/routing`), never a hamburger menu. HeroUI `Tabs`
is for switching panels *inside* a screen, not for routes.

## Sheets and drawers rather than wide modals

On a phone a centred modal is cramped and far from the thumb. Secondary flows (filters,
"add a tasting", details) open in a `Drawer` with `placement="bottom"` and a `Drawer.Handle`;
`Modal` is kept for a short blocking confirmation (`AlertDialog`). See
`accessibility/modal-dialog`.

## Viewport height and safe areas

- Full-height layouts use `min-h-dvh` / `h-dvh`, never `h-screen` / `100vh` (the mobile
  browser bars make `100vh` taller than the visible area).
- `index.html` sets `viewport-fit=cover`; anything touching an edge pads with
  `env(safe-area-inset-*)`: the tab bar `pb-[env(safe-area-inset-bottom)]`, the page
  `pt-[max(1.5rem,env(safe-area-inset-top))]`.
- Content scrolls under the fixed bar without being hidden: `<main>` reserves the bar's
  height plus the inset, `pb-[calc(6rem+env(safe-area-inset-bottom))]`. A new fixed
  element (a floating action button) sits above that bar, `bottom-[calc(5rem+env(safe-area-inset-bottom))]`.

## No horizontal overflow at 360px

The page never scrolls sideways at 360px wide (the smallest phones). Fixed widths are
`max-w-*` + `w-full`, never `w-[24rem]`; images are `max-w-full`; flex rows that can grow
use `min-w-0` on the shrinking child and `flex-wrap` when they hold chips or buttons. The
DA's hard shadow sticks out 4px to the bottom-right of its box: a full-width element with
`shadow-mousse` stays inside the page padding (`px-4`), never flush with the edge, and its
parent is not `overflow-hidden`.

## Long text

Beer, brewery and place names can be long and unbroken ("Brasserie-Artisanale-du-Mont-Blanc"):
every user or API text either wraps (`break-words`, `[overflow-wrap:anywhere]` for URLs) or
truncates on one line (`truncate`, inside a `min-w-0` parent) — truncated text keeps its
full value reachable (the detail screen, or `title`). Tab labels truncate.

## Checking it

Before DONE, open the screen at 390x844 and 360x740 (devtools or Playwright), then 820 and
1440 wide: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`),
targets >= 44px, nothing hidden behind the tab bar, the longest realistic label in place —
and run the visual checklist of `ui/design-system` §8 on the same screenshots.
