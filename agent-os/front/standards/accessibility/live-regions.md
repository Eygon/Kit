---
name: live-regions
description: role=alert for errors, aria-live=polite for status, aria-busy on in-flight controls; announced text via t()
metadata:
  type: project
---

# Live Regions & Announcements

Announce dynamic changes to screen readers — don't rely on visual-only feedback.

- **Errors / blocking states** → `role="alert"` (interrupts)
- **Non-urgent status** (state change, loading) → `aria-live="polite"`, often on an `sr-only` span
- **In-flight control** → `aria-busy={isPending}` on the control being mutated

```tsx
{errorMessage && <p role="alert" className="text-(--error-60)">{errorMessage}</p>}

<span aria-live="polite" className="sr-only">
    {currentState ? t("currentStepAnnounce", { label: currentState.label }) : ""}
</span>

<input aria-busy={isAddPending} onKeyDown={handleKeyDown} />
```

- Announced text goes through `t()`
- One live region per concern; keep it in the DOM (toggle its text, not its presence)
