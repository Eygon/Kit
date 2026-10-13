---
name: semantic-elements
description: Every interactive element is a real control (HeroUI Button/Link, router NavLink, native <a>) with aria-current for the active item — never a clickable <div onClick>
metadata:
  type: project
---

# Semantic Interactive Elements

Every clickable / interactive thing is a real control — never a `<div onClick>`.

```tsx
<Button onPress={onSelect}>...</Button>                     // action (HeroUI, a native <button>)
<NavLink to={RoutePathEnum.JOURNAL}>...</NavLink>            // in-app navigation (aria-current="page" when active)
<Link href={breweryUrl} target="_blank">...</Link>           // external link (HeroUI)
<ul><li><TabBarItem ... /></li></ul>                         // a list of items
```

- Action → HeroUI `Button` (a native `<button type="button">` driven by React Aria `onPress`)
- In-app navigation → react-router `NavLink` / `Link`, never a button that calls
  `navigate()` on press; `NavLink` sets `aria-current="page"` on the active route by itself
- External navigation → HeroUI `Link` or `<a href>`
- A clickable `<div>`/`<span>` has no keyboard, focus, or role — don't put `onClick` on one
- Lists use `<ul>`/`<ol>`/`<li>`; landmarks use `<header>`, `<main>`, `<nav aria-label>`
- Reach for ARIA roles only when no native element or HeroUI component fits

See also `focus-visibility`, `icons-and-labels`, `heroui-library-first`.
