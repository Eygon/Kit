---
name: file-decomposition
description: One component per .tsx file; props/types, secondary components, and non-trivial helpers each move to their own file at scope — only the loading skeleton may stay
metadata:
  type: project
---

# File Decomposition

One declaration per file. A `.tsx` file holds exactly ONE React component (one main
component returning JSX, one primary export).

## Split out of the `.tsx`

| In the file | Move it to |
|---|---|
| Props type / any type | `types/<comp>.ts` at scope — `src/types/components/<comp>.ts` if shared (see `file-placement`) |
| A second React component | its own `<comp>.tsx` in its own folder |
| Non-trivial helper / pure function | `utils/<helper>.ts` at scope (`tabBarItem/utils/getTabBarItemClasses.ts`) |
| A constant list (tabs, options) | `xxxConstants.ts` (see `constants`) or the enum's file (see `enums`) |

Which folder is governed by `file-placement` (narrowest scope of consumption).

```tsx
// ❌ tabBarItem.tsx — type + helper + component in one file
type TabBarItemProps = { to: RoutePathEnum; label: string };
const getClasses = (isActive: boolean) => ...;
export const TabBarItem = (props: TabBarItemProps) => ...;

// ✅ src/types/components/tabBarItem.ts — type only
export type TabBarItemProps = Readonly<{ to: RoutePathEnum; label: string; icon: SvgIcon }>;
// ✅ src/components/elements/tabBarItem/utils/getTabBarItemClasses.ts — helper only
export const getTabBarItemClasses = (isActive: boolean): string => ...;
// ✅ src/components/elements/tabBarItem/tabBarItem.tsx — component only
import type { TabBarItemProps } from "@/types/components/tabBarItem";
export const TabBarItem = ({ to, label, icon: Icon }: TabBarItemProps) => ...;
```

- Props type **always** lives in its own file — never inline, even for one field — in `types/` at scope (`src/types/components/` if shared), per `file-placement`. A `type` or `interface` declared in a `.tsx` is flagged by the mechanical check.
- One folder per component: `tabBarItem/tabBarItem.tsx`.
- No barrel `index.ts` in `components/` — import the file directly.
- A trivial event handler (`handleChange` narrowing a HeroUI `Key`) may stay inside the component.

## Allowed to co-locate

- **Skeleton** — a component's loading skeleton (HeroUI `Skeleton` blocks) may stay in its file.

Everything else — cells, wrappers, sibling components — gets its own file.
