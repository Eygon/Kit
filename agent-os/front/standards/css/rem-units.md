---
name: rem-units
description: Every arbitrary Tailwind length — including ones nested inside a compound value (shadow-[inset_Npx_...], grid-cols-[Npx_1fr], a library width prop) — is rem, never px; base 1rem = 16px, token or default scale step first
metadata:
  type: project
---

# rem over px

A page written in `px` arbitrary values ignores the user's base font size: bump
it in the OS or the browser and a `px` value stays exactly the same pixel count,
while everything set in `rem` scales with it. That is an accessibility defect
(WCAG 1.4.4, resize text), not a style preference.

## Order of preference

1. A design-system token, if one exists — see `tailwind-tokens`.
2. Tailwind's default scale (`p-4`, `gap-2`, `text-sm`, `h-9`…) — already `rem`-based.
3. An arbitrary `rem` value in brackets, only when neither of the above matches.

Never introduce an arbitrary `px` value when a token or a scale step already
covers it.

## Converting

Base **1rem = 16px** — divide by 16, drop the leading zero:

```
1px  → .0625rem      12px → .75rem        22px → 1.375rem
4px  → .25rem        14px → .875rem       30px → 1.875rem
11px → .6875rem       18px → 1.125rem      400px → 25rem
```

```tsx
// ❌
<div className="h-[30px] rounded-[4px] text-[12.5px] leading-[17px]">

// ✅
<div className="h-[1.875rem] rounded-[.25rem] text-[.78125rem] leading-[1.0625rem]">
```

## Nested values

A `px` hiding inside a compound arbitrary value is still a `px` — a plain grep
for `px]` misses it. Convert every length inside the brackets:

```tsx
// ❌
shadow-[inset_3px_0_0_var(--success-50)]
grid-cols-[88px_repeat(3,1fr)]
translate-y-[18px]

// ✅
shadow-[inset_.1875rem_0_0_var(--success-50)]
grid-cols-[5.5rem_repeat(3,1fr)]
translate-y-[1.125rem]
```

## Component props that take a raw CSS length

A Septeo library prop typed as a plain string (`width="400px"` on `SidePanel`,
`Modal`…) renders straight to inline CSS — it takes `rem` exactly like a
Tailwind class does. Convert it the same way: `width="400px"` → `width="25rem"`.

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
"deliberately kept". For code you are not otherwise touching, convert file by
file as you touch it, the same way `enums` handles its legacy casing.
