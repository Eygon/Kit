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
| `elements` | `src/components/elements/` | Single-purpose, no logic (button, icon, badge) |
| `widgets` | `src/components/widgets/` | Composed of elements, reusable across features |
| `modules` | `src/components/modules/` | Complex logic, may use hooks and sub-components |
| `layouts` | `src/components/layouts/` | Page scaffolding only |

Page-specific components follow the same levels under `src/pages/<page>/components/`.

## File Structure

Every component lives in its own folder named after it — NEVER a bare `.tsx`
at the root of `elements/`, `widgets/`, `modules/`, `layouts/`, or any
`components/` folder. No exceptions, even for trivial components (separator,
logo, badge).

```
components/elements/badge/
  badge.tsx
components/widgets/selectableButtons/
  selectableButtons.tsx
```

Wrong — flat file at the folder root:
```
components/elements/badge.tsx              ❌
components/widgets/backofficeSidebar.tsx   ❌
```

The folder is the home for everything the component owns at its scope
(`utils/`, `types/`, sub-components). One folder per component keeps related
files co-located and the level folders scannable.

## Props & Export

```tsx
// src/types/components/selectableButtons.ts  (shared)  — or pages/<feature>/types/selectableButtons.ts
export type SelectableButtonsProps = Readonly<{
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>;

// selectableButtons.tsx — holds ONLY the component
import type { SelectableButtonsProps } from "@prjTypes/components/selectableButtons";

export const SelectableButtons = ({ label, onChange }: SelectableButtonsProps) => { ... };
```

- The component file holds ONLY the component (one component, one export per file).
  Secondary components, types, and non-trivial helpers each move to their own file — only
  the loading skeleton and a co-located `.scss` may stay. See the canonical `file-decomposition`.
- Props type named `ComponentNameProps` (`interface` or a `Readonly<{...}>` alias) lives in a
  types file at the component's scope, NOT inline — `src/types/components/<component>.ts` for a
  shared component, `pages/<feature>/types/<component>.ts` for a feature one. Import it. See `file-placement`.
- Helper functions go in a `utils/` file at scope, not inline in the component.
- Named export (`export const ComponentName`) is the prevailing convention and the default
  choice; legacy `export default` is acceptable in existing files — don't rewrite just to switch.
- No display logic mixed with async/state: extract hooks for side effects, async flows, or
  non-trivial state. Do NOT extract a hook for trivial state (a lone boolean toggle) — keep
  it inline or reuse a shared primitive. See `react/hooks`.

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
