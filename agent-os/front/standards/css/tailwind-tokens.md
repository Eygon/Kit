---
name: tailwind-tokens
description: Tailwind v4 CSS-first config; consume Septeo design-system tokens via CSS-var arbitrary values (text-(--neutral-95), text-(length:--font-size-small), rounded-(--radius)) — never the Tailwind palette
metadata:
  type: project
---

# Tailwind Design Tokens

Tailwind v4 — CSS-first config in `src/index.css`, no `tailwind.config.js`.

Consume Septeo design-system tokens as CSS variables in arbitrary-value syntax.
Never use the Tailwind palette (`text-blue-500`) or hardcoded values.

```tsx
text-(--neutral-95)   bg-(--neutral-00)   border-(--primary-60)   outline-(--primary-60)
text-(length:--font-size-small)            // non-color tokens need the length: prefix
rounded-(--radius)    shadow-(--float-shadow)
```

- A token always exists for **color, font-size, radius, shadow** → always use it, never hardcode
- `(length:--var)` prefix is required for non-color tokens; colors omit it
- Native Tailwind utilities (`flex`, `grid`, `gap-*`, `p-*`, `w-*`) only where no token applies
- Septeo components take tokens via props as strings: `backgroundColor="var(--primary-10)"`
- Tokens ship from `@septeo/septeo-ui-components`, not project-defined — keeps theming aligned
