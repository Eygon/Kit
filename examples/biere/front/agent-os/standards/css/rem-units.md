---
name: rem-units
description: Every arbitrary Tailwind length — including ones nested inside a compound value (shadow-[inset_Npx_...], grid-cols-[Npx_1fr], calc()) and HeroUI props that take a raw length (Toast.Provider width) — is rem, never px; base 1rem = 16px, token or default scale step first
metadata:
  type: project
---

# rem over px

A page written in `px` arbitrary values ignores the user's base font size: bump
it in the OS or the browser and a `px` value stays exactly the same pixel count,
while everything set in `rem` scales with it. That is an accessibility defect
(WCAG 1.4.4, resize text), not a style preference — and phone users enlarge text more
than anyone.

## Order of preference

1. A theme token, if one exists — see `tailwind-tokens` (`rounded-mousse`, `rounded-control`,
   `shadow-mousse`, `border-mousse`).
2. Tailwind's default scale (`p-4`, `gap-2`, `text-sm`, `h-11`, `min-h-14`…) — already `rem`-based.
3. An arbitrary `rem` value in brackets, only when neither of the above matches.

Never introduce an arbitrary `px` value when a token or a scale step already covers it.

## Converting

Base **1rem = 16px** — divide by 16, drop the leading zero:

```
1px  → .0625rem      12px → .75rem        44px → 2.75rem
4px  → .25rem        14px → .875rem       56px → 3.5rem
11px → .6875rem      18px → 1.125rem      390px → 24.375rem
```

```tsx
// ❌
<div className="h-[44px] rounded-[4px] text-[13px]">

// ✅
<div className="h-11 rounded-sm text-[.8125rem]">
```

## Nested values

A `px` hiding inside a compound arbitrary value is still a `px` — a plain grep
for `px]` misses it. Convert every length inside the brackets, `calc()` included:

```tsx
// ❌
shadow-[inset_3px_0_0_var(--accent)]
grid-cols-[88px_1fr]
pb-[calc(96px+env(safe-area-inset-bottom))]

// ✅
shadow-[inset_.1875rem_0_0_var(--accent)]
grid-cols-[5.5rem_1fr]
pb-[calc(6rem+env(safe-area-inset-bottom))]
```

`env(safe-area-inset-*)` is a device length you do not choose — keep it as is.

## Component props that take a raw CSS length

A HeroUI prop typed `number | string` treats a number as **pixels**
(`<Toast.Provider width={460} />`) — pass a `rem` string instead: `width="28.75rem"`. The
same goes for any inline `style` length.

## The DA line and shadow tokens

The art direction draws 2px ink lines and 4px hard shadows (`ui/design-system`). Those two
lengths are the only `px` of the app and they live once, as tokens, in
`src/styles/mousseTheme.css` (`--mousse-border: 2px`, `--mousse-shadow: 4px 4px 0 …`): an
ink line keeps its weight when the text is enlarged, like a printed border. A component
never writes them — it uses `border-mousse` / `shadow-mousse`, never `border-[2px]` or
`shadow-[4px_4px_0_…]` (nor their `rem` translation).

## Not a length: `rounded-[999px]`

A pixel value only used to force full roundness is not expressing a size —
replace it with the Tailwind utility that already means that:

```tsx
// ❌
rounded-[999px]

// ✅
rounded-full
```

## Scope

When a review flags `px` on a page, convert the whole page or feature in one
pass — a partially converted screen is worse than a consistent one, because a
future skim for stray `px` now has to distinguish "not yet done" from
"deliberately kept".
