---
name: icons-and-labels
description: Icons come from @gravity-ui/icons and always carry aria-hidden="true"; icon-only controls need an aria-label (Button isIconOnly) or sr-only text, always via t()
metadata:
  type: project
---

# Icons & Accessible Names

Icons come from `@gravity-ui/icons` (the set HeroUI's own docs use), one default import
per icon so the bundle only ships what is used:

```tsx
import MapPin from "@gravity-ui/icons/MapPin";
```

An icon is an `<svg>` with no text: it **always** gets `aria-hidden="true"` — screen
readers never announce it, and a `title` inside it is not a label.

Any icon that carries meaning needs a text equivalent on its control:

- Icon-only HeroUI `Button` → `isIconOnly` + `aria-label={t(...)}`
- Icon next to visible text (a tab: icon + label) → the text is the name, the icon stays hidden
- Icon inside a component that takes no `aria-label` (a `Chip`) → adjacent
  `<span className="sr-only">{t(...)}</span>`

```tsx
<Button isIconOnly size="lg" variant="ghost" aria-label={t("common.close")} onPress={onClose}>
  <Xmark aria-hidden="true" />
</Button>

<NavLink to={RoutePathEnum.MAP}>
  <MapPin aria-hidden="true" className="size-6" />
  <span>{t("nav.map")}</span>
</NavLink>

<Chip color="success">
  <Check aria-hidden="true" />
  <span className="sr-only">{t("pages.journal.tasted")}</span>
</Chip>
```

- Size icons with `size-*` and colour them with a token (`text-muted`), they inherit
  `currentColor`.
- Always translate the name with `t()` — never hardcode text.
- Never name a decorative icon that just duplicates a visible label.
- Most common bug: a meaningful icon-only control with no `aria-label` / `sr-only` →
  invisible to screen readers.
