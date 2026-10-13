---
name: heroui-library-first
description: Reach for the HeroUI v3 (@heroui/react) component before hand-rolling one — Button, Card, Chip, Tabs, TextField/Input, Select, Slider, Modal, Drawer, toast, Avatar, Skeleton, Switch, Checkbox are the library's job; the Mousse theme already restyles them (pick the variant, never restyle); a bare styled element is only for what HeroUI does not cover
metadata:
  type: project
  checks:
    - re: "<(?:button|input|select|textarea|table|dialog)\\b"
      files: "^src/.*\\.tsx$"
      skip: "(__tests__/|\\.(test|spec)\\.)"
      msg: "controle natif la ou HeroUI en fournit un (justifier ou utiliser @heroui/react)"
---

# HeroUI Library First

Before writing a control, check whether `@heroui/react` (v3, built on React Aria) already
ships it. A hand-rolled equivalent drifts from the theme on the next release and
re-implements the focus, press, disabled, keyboard and screen-reader behaviour that React
Aria already handles.

**Never guess the API.** HeroUI v3 is not v2 (no `HeroUIProvider`, no `onClick`-first
buttons, no `@heroui/theme`): read the installed types before using a component —
`node_modules/@heroui/react/dist/components/<component>/<component>.d.ts` for the props,
`node_modules/@heroui/styles/dist/components/<component>/<component>.styles.d.ts` for the
`variant` / `size` / `color` values.

```tsx
// ❌ a styled <button> that duplicates HeroUI's Button
<button
  type="button"
  onClick={refresh}
  className="inline-flex h-11 items-center gap-2 rounded-3xl bg-accent px-4 text-accent-foreground"
>
  <ArrowRotateRight aria-hidden="true" className="size-4" />
  {t("pages.journal.refresh")}
</button>

// ✅
<Button variant="primary" size="lg" onPress={refresh}>
  <ArrowRotateRight aria-hidden="true" />
  {t("pages.journal.refresh")}
</Button>
```

## How HeroUI v3 is shaped

- **No provider.** Components work as soon as `src/index.css` imports `tailwindcss` then
  `@heroui/styles` (then the Mousse theme files, see `ui/design-system`). The only mounted
  piece is `<Toast.Provider />` (the toast region, once, in `app.tsx`). HeroUI's
  `useTheme()` is **not** used: the light theme is locked by `index.html` and
  `src/styles/mousseTheme.css`.
- **Compound components.** `Card.Header`, `Select.Trigger`, `Modal.Dialog`… — the root is
  also callable as `Card` (same as `Card.Root`). Import the root only:
  `import { Card } from "@heroui/react"`.
- **React Aria events.** Pressable controls take `onPress`, not `onClick`. Selection
  controls use `value` / `onChange` (`Select`, `Tabs` use `selectedKey` /
  `onSelectionChange`), switches and checkboxes use `isSelected` / `onChange`. Booleans are
  `isDisabled`, `isRequired`, `isInvalid`, `isIconOnly`…
- **Collections use `id`, not `value`.** `ListBox.Item id={beer.id} textValue={beer.name}`;
  the `onChange` of a `Select` hands back a `Key | null` (`import type { Key } from "@heroui/react"`)
  that the caller narrows (see `typing/boundary-narrowing`).

## What the library owns

| Need | Component (`@heroui/react`) |
|---|---|
| Any button, including icon-only | `Button` (`variant`: `primary` `secondary` `tertiary` `outline` `ghost` `danger` `danger-soft`; `size`: `sm` `md` `lg`; `isIconOnly`; `onPress`) — which variant for which action: `ui/design-system` §5 |
| Group of buttons, toggle buttons | `ButtonGroup`, `ToggleButton`, `ToggleButtonGroup`, `CloseButton` |
| Card / tile | `Card` (`.Header` `.Title` `.Description` `.Content` `.Footer`; `variant`: `default` `secondary` `tertiary` `transparent`) |
| Chip, tag, badge | `Chip` (+ `Chip.Label`; `color`, `variant`, `size`), `TagGroup` / `Tag`, `Badge` |
| Tabs inside a screen (tab panels) | `Tabs` (`.ListContainer` `.List` `.Tab` `.Indicator` `.Panel`) — not the app's bottom navigation (see `ui/mobile-first`) |
| Text field | `TextField` + `Label` + `Input` (or `TextArea`) + `Description` + `FieldError` |
| Search, number, date, time, OTP | `SearchField`, `NumberField`, `DateField` / `DatePicker` / `DateRangePicker`, `TimeField`, `InputOTP` |
| Dropdown / select | `Select` (`.Trigger` `.Value` `.Indicator` `.Popover`) + `ListBox` / `ListBox.Item` / `ListBox.ItemIndicator`; filtering → `ComboBox` / `Autocomplete` |
| Action menu | `Dropdown`, `Menu` / `MenuItem` |
| Slider, rating range | `Slider` (`.Output` `.Track` `.Fill` `.Thumb` `.Marks`) |
| On/off, checkbox, radio | `Switch` (`.Content` `.Control` `.Thumb`), `Checkbox` / `CheckboxGroup`, `RadioGroup` / `Radio` |
| Bottom sheet, side panel | `Drawer` (`.Backdrop` `.Content placement` `.Dialog` `.Handle` `.Header` `.Heading` `.Body` `.Footer` `.CloseTrigger`) |
| Centered dialog, confirmation | `Modal` (`.Backdrop` `.Container` `.Dialog`…), `AlertDialog` |
| Toast | `toast.success / .danger / .info / .warning` (+ `<Toast.Provider />` mounted once) |
| Inline status message | `Alert` (`status`: `default` `accent` `success` `warning` `danger`; `.Indicator` `.Content` `.Title` `.Description`) |
| Avatar | `Avatar` (`.Image` `.Fallback`), `AvatarGroup` |
| Loading placeholder, spinner, progress | `Skeleton`, `Spinner`, `ProgressBar`, `ProgressCircle`, `Meter` |
| Empty result | `EmptyStatePanel` (`src/components/elements/emptyStatePanel`, HeroUI `EmptyState` + the mascot — see `ui/mascot`) |
| Popover, tooltip | `Popover`, `Tooltip` |
| Separator, scroll shadow, kbd, link | `Separator`, `ScrollShadow`, `Kbd`, `Link` |
| Form wrapper | `Form`, `Fieldset` |
| Pagination, table, accordion | `Pagination`, `Table`, `Accordion`, `Disclosure` |

The list is not exhaustive — look under `node_modules/@heroui/react/dist/components/`
before concluding a control is missing. HeroUI ships almost no icons (a dozen chevrons and
status glyphs): icons come from `@gravity-ui/icons` (see `accessibility/icons-and-labels`).

## When a bare element is right

- The library has no equivalent (the app's bottom tab bar is router `NavLink`s; a layout
  `<div>`; a map canvas).
- The element is not a control: text, a swatch, a container.
- The HeroUI component cannot express a requirement from `ui/design-system`, **and** that
  gap is stated in the PR.

In those cases `accessibility/semantic-elements` still applies: a native `<button>` /
`<a>` / `<input>`, never a clickable `<div>`.

## Styling a HeroUI component

The art direction (`ui/design-system`) is applied to HeroUI **globally**, the way HeroUI v3
themes are built: the CSS variables (`--accent`, `--surface`, `--border`, `--radius`,
`--surface-shadow`…) are remapped in `src/styles/mousseTheme.css`, and the component
customisations a theme carries (ink border, hard shadow, radius, pressed state) live in
`src/styles/mousseComponents.css`, inside `@layer components`, after HeroUI's own layer.
That file is the **only** place allowed to target HeroUI's BEM classes (`.button--primary`,
`.card`, `.select__popover`); a feature never does.

In a feature:

1. pick the `variant` / `size` / `color` the DA maps to the need (`ui/design-system` §5);
2. add layout utilities through `className` (`w-full`, `gap-2`, `min-h-11`) — project
   utilities are emitted after HeroUI's component layer, so they win without `!`;
3. the one sanctioned colour override is the key interaction:
   `<Button variant="primary" className="bg-highlight text-highlight-foreground">`.

Never re-add a border, a shadow or a radius the theme already gives, never copy the
library's markup into the project to restyle it. A component that still shows HeroUI's
default look (blue, soft shadow) is a theme gap fixed in `mousseComponents.css`.
