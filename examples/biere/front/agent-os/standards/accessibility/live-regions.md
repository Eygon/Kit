---
name: live-regions
description: role=alert for errors (HeroUI Alert does not set it), aria-live=polite for status, Button isPending / aria-busy on in-flight controls; toasts are announced by the HeroUI toast region; announced text via t()
metadata:
  type: project
---

# Live Regions & Announcements

Announce dynamic changes to screen readers — don't rely on visual-only feedback.

- **Errors / blocking states** → `role="alert"` (interrupts). HeroUI's `Alert` renders a
  plain `div`: pass `role="alert"` yourself.
- **Non-urgent status** (count updated, saved) → `aria-live="polite"`, often on an `sr-only` span
- **In-flight control** → HeroUI `Button isPending` (React Aria keeps it focusable, blocks
  presses and announces the pending state; add a `<Spinner size="sm" color="current" />`
  child for the visual); `aria-busy={isPending}` on anything else being mutated
- **Toasts** → `toast.success / .danger(...)` are announced by the `<Toast.Provider />`
  region (React Aria toast region); do not add a second live region for the same message

```tsx
<Alert status="danger" role="alert">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>{t("errors.generic")}</Alert.Title>
  </Alert.Content>
</Alert>

<span aria-live="polite" className="sr-only">
  {t("pages.journal.tastingCount", { count })}
</span>

<Button size="lg" isPending={isSaving} onPress={save}>
  {isSaving && <Spinner size="sm" color="current" />}
  {t("pages.journal.save")}
</Button>
```

- Announced text goes through `t()`
- One live region per concern; keep it in the DOM (toggle its text, not its presence)
