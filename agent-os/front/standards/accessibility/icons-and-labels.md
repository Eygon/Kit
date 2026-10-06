---
name: icons-and-labels
description: <Icon> is always aria-hidden; icon-only controls need an aria-label (owned) or sr-only text (third-party), always via t()
metadata:
  type: project
---

# Icons & Accessible Names

`<Icon>` always renders `aria-hidden="true"` — screen readers never announce it.

Any icon that carries meaning needs a text equivalent on its control:

- Icon-only `<button>`/`<a>` you own → `aria-label={t(...)}`
- Icon inside a third-party component (e.g. `<Chip>` icon slot) → adjacent `<span className="sr-only">{t(...)}</span>`

```tsx
<button type="button" onClick={onClose} aria-label={t("common.actions.close")}>
    <Icon name="ri-close-line" size="md" />
</button>

<Chip icon={<><Icon name="ri-close-line" size="xs" />
    <span className="sr-only">{t("removeKeyword", { keyword })}</span></>}>
```

- Always translate the name with `t()` — never hardcode text
- Never name a decorative icon that just duplicates a visible label
- Most common bug: a meaningful icon-only control with no `aria-label`/`sr-only` → invisible to screen readers
