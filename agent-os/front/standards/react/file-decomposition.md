---
name: file-decomposition
description: One component per .tsx file; props/types, secondary components, and non-trivial helpers each move to their own file at scope — only the loading skeleton and co-located .scss may stay
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
| A second React component | its own `<comp>.tsx` (own folder if non-trivial) |
| Non-trivial helper / pure function | `utils/` (or `<comp>.utils.ts`) at scope |

Which folder is governed by `file-placement` (narrowest scope of consumption).

```tsx
// ❌ folderBadge.tsx — type + helper + component in one file
type FolderBadgeProps = { variant: "open" | "closed" };
const toLabel = (v: string) => ...;
export const FolderBadge = (props: FolderBadgeProps) => ...;

// ✅ types/folderBadge.ts — type only (at scope; src/types/components/ if shared)
export type FolderBadgeProps = { variant: "open" | "closed" };
// ✅ folderBadge.tsx — component only
import type { FolderBadgeProps } from "@prjTypes/components/folderBadge";
export const FolderBadge = (props: FolderBadgeProps) => ...;
```

- Props type **always** lives in its own file — never inline, even for one field — in `types/` at scope (`src/types/components/` if shared), per `file-placement`.
- One folder per component: `folderBadge/folderBadge.tsx` (+ optional co-located `folderBadge.scss`).
- No barrel `index.ts` in `components/` — import the file directly.

## Allowed to co-locate

- **Skeleton** — a component's loading skeleton may stay in its file.
- **`.scss`** — co-located styles beside the `.tsx` (not a component).

Everything else — cells, wrappers, sibling components — gets its own file.
