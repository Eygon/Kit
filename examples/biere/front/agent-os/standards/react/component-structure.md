---
name: component-structure
description: Atomic design levels, file structure, props/export conventions, and feature-folder co-location by scope
metadata:
  type: project
---

# Component Structure

## Atomic Design Levels

| Level | Location | Rule |
|-------|----------|------|
| `elements` | `src/components/elements/` | Single-purpose, no data logic (`pageHeader`, `emptyStatePanel`, `mascot`, `tabBarItem`) |
| `widgets` | `src/components/widgets/` | Composed of elements, reusable across features (`bottomTabBar`) |
| `modules` | `src/components/modules/` | Complex logic, may use hooks and sub-components |
| `layouts` | `src/components/layouts/` | Page scaffolding only |

Page-specific components follow the same levels under `src/pages/<page>/components/`
(`src/pages/profile/components/widgets/demoUserSelect/`). A page component itself is
`src/pages/<page>/<page>.tsx`, exported as `XPage` (`MapPage` in `pages/map/map.tsx`).

HeroUI components are the atoms: an `element` wraps or composes them, it never re-styles a
native control to imitate one (see `heroui-library-first`), and it draws with the DA tokens
(`ui/design-system`). A sub-component used by one element only lives inside it:
`components/elements/mascot/components/mascotMoodStandIn/`.

## File Structure

Every component lives in its own folder named after it — NEVER a bare `.tsx`
at the root of `elements/`, `widgets/`, `modules/`, `layouts/`, or any
`components/` folder. No exceptions, even for trivial components.

```
components/elements/pageHeader/
  pageHeader.tsx
components/elements/tabBarItem/
  tabBarItem.tsx
  utils/getTabBarItemClasses.ts
```

Wrong — flat file at the folder root:
```
components/elements/pageHeader.tsx         ❌
components/widgets/bottomTabBar.tsx        ❌
```

The folder is the home for everything the component owns at its scope
(`utils/`, `types/`, sub-components). One folder per component keeps related
files co-located and the level folders scannable.

## Props & Export

```tsx
// src/types/components/pageHeader.ts  (shared)  — or pages/<feature>/types/<component>.ts
export type PageHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
}>;

// pageHeader.tsx — holds ONLY the component
import type { PageHeaderProps } from "@/types/components/pageHeader";

export const PageHeader = ({ title, subtitle }: PageHeaderProps) => (
  <header className="flex flex-col gap-1">
    <h1 className="text-2xl font-semibold break-words text-foreground">{title}</h1>
    {subtitle && <p className="text-sm break-words text-muted">{subtitle}</p>}
  </header>
);
```

- The component file holds ONLY the component (one component, one export per file).
  Secondary components, types, and non-trivial helpers each move to their own file — only
  the loading skeleton may stay. See the canonical `file-decomposition`.
- Props type named `ComponentNameProps` (a `Readonly<{...}>` alias or an `interface`) lives in
  a types file at the component's scope, NOT inline — `src/types/components/<component>.ts`
  for a shared component, `pages/<feature>/types/<component>.ts` for a feature one. See `file-placement`.
- Helper functions go in a `utils/` file at scope, not inline in the component.
- Named export (`export const ComponentName`), never `export default` for a component.
- Display strings arrive translated: the parent calls `t()` and passes strings, or the
  component calls `useTranslation()` itself — never a translation key as a prop to render
  raw.
- No display logic mixed with async/state: extract hooks for side effects, async flows, or
  non-trivial state. Do NOT extract a hook for trivial state (a lone boolean toggle) — keep
  it inline. See `react/hooks`.

## Feature folder

A page/feature folder mirrors the top-level structure for code it owns:

```
pages/<feature>/
  <feature>.tsx
  components/{elements,widgets,modules}/<comp>/<comp>.tsx
  hooks/
  types/
  providers/  providers/context/
  utils/
```

Where any file lives (this component, its hooks, types, mappers, utils) is governed by the
narrowest-scope rule — see the canonical `file-placement` standard.
