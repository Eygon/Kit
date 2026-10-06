---
name: conditional-classes
description: Compose conditional/variant Tailwind classes with template literals only (no clsx/cn/cva) — repeated strings to a const, multi-state logic to pure getXClasses helpers
metadata:
  type: project
---

# Conditional Classes

No `clsx` / `cn` / `cva` / `twMerge` — template literals only.
Native syntax covers the need; a styling lib violates the no-new-libraries rule.

Move conditional / variant class logic out of JSX into a `const` or a pure helper:

```tsx
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary-60)";

const getCircleClasses = (isCurrent: boolean, isDone: boolean): string => {
  if (isCurrent) return "border-(--secondary-60) bg-(--secondary-60) text-(--neutral-00)";
  if (isDone) return "border-(--success-60) bg-(--success-60) text-(--neutral-00)";
  return "border-(--neutral-10) bg-(--neutral-00) text-(--neutral-70)";
};

<span className={`grid h-7 w-7 rounded-full border-2 ${getCircleClasses(isCurrent, isDone)}`} />
```

- Repeated class string → module-level `const`
- Multi-state / variant choice → pure `getXClasses(...)` returning the string, typed `: string`
- `className` template interpolates helpers — keep branching logic out of the JSX
- Single toggle fallback: `${cond ? "opacity-60" : ""}`
