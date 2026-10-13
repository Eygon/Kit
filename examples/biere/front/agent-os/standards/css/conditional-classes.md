---
name: conditional-classes
description: Compose conditional/variant Tailwind classes with template literals only (no clsx/cn/cva/tv, even though @heroui/react re-exports cn and tv) — repeated strings to a const, multi-state logic to pure getXClasses helpers
metadata:
  type: project
---

# Conditional Classes

No `clsx` / `cn` / `cva` / `twMerge` / `tv` in application code — template literals only.
`@heroui/react` re-exports `cn` and `tv` (tailwind-variants) for its own components; they
are not an invitation: a component variant is a HeroUI prop (`variant`, `size`, `color`),
and our own conditional classes are plain strings.

Move conditional / variant class logic out of JSX into a `const` or a pure helper in the
component's `utils/` (see `file-placement`):

```ts
const TAB_BAR_ITEM_BASE_CLASSES =
  "flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-control border-mousse px-0.5 py-1 text-[.6875rem] font-bold tracking-tight no-highlight transition-[background-color,box-shadow] focus-visible:focus-ring";

export const getTabBarItemClasses = (isActive: boolean): string =>
  `${TAB_BAR_ITEM_BASE_CLASSES} ${isActive ? "border-border bg-accent text-accent-foreground shadow-mousse" : "border-transparent text-foreground"}`;
```

```tsx
<NavLink to={to} end className={({ isActive }) => getTabBarItemClasses(isActive)} />
```

- Repeated class string → module-level `const`
- Multi-state / variant choice → pure `getXClasses(...)` returning the string, typed `: string`
- `className` template interpolates helpers — keep branching logic out of the JSX
- Single toggle fallback: `${isDisabled ? "opacity-60" : ""}`
- A state that drops the DA border keeps its width with `border-transparent` (as above), so
  the box does not jump; the classes themselves come from `ui/design-system`
- HeroUI's React Aria render props (`className={({ isSelected }) => ...}`) take the same helpers
