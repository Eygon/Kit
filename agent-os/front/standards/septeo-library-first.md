---
name: septeo-library-first
description: Reach for the @septeo/septeo-ui-components control before hand-rolling one — Button, Switch, Table, Modal, dropdowns and inputs are the library's job; a bare styled <button> is only for what the library does not cover
metadata:
  type: project
---

# Septeo Library First

Before writing a control, check whether `@septeo/septeo-ui-components` already ships it.
A hand-rolled equivalent drifts from the design system on the next library release and
re-implements focus, disabled and a11y behaviour the library already handles.

```tsx
// ❌ a styled <button> that duplicates the library's Button
<button
    type="button"
    onClick={refresh}
    className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-(--neutral-30) bg-(--neutral-00) px-[11px] ..."
>
    <Icon name="ri-refresh-line" size="sm" />
    {t("pages.commercialConsole.toolbar.refresh")}
</button>

// ✅
<Button variant="secondary" size="md" onClick={refresh}>
    <Icon name="ri-refresh-line" size="sm" aria-hidden />
    {t("pages.commercialConsole.toolbar.refresh")}
</Button>
```

## What the library owns

| Need | Component |
|---|---|
| Any button, including icon-only | `Button` (`variant`, `size`, `notification`) |
| On/off toggle | `Switch`, `ToggleSwitch` |
| Checkbox, radio, selectable button | `Checkbox`, `RadioButton`, `SelectableButton` |
| Data grid | `Table` (see `react/data-tables`) |
| Modal | `Modal` (see `accessibility/modal-dialog`) |
| Search field | `DelayedFieldSearchbar` |
| Dropdown / multi-select | the `dropdowns` family, `DropdownSelect` |
| Labelled field wrapper | `ComponentWithLabel` |
| Side panel | `SidePanel` |
| Chip, badge, toast | `Chip`, `septeoToast` |

The list is not exhaustive — look under
`node_modules/@septeo/septeo-ui-components/dist/components/` before concluding a control
is missing.

## When a bare element is right

- The library has no equivalent (a grid cell's inline `<select>`, a custom tri-state
  checkbox, a layout `<div>`).
- The element is not a control: text, a swatch, a container.
- The library's component cannot express a pixel requirement from `design.md`, **and**
  that gap is stated in the PR.

In those cases `accessibility/semantic-elements` still applies: a native `<button>` /
`<a>` / `<input>`, never a clickable `<div>`.

## Styling a library component

Override through `className` with the `!` suffix and Septeo tokens — see
`css/tailwind-tokens` and `css/scss-escape-hatch`. Never copy the library's markup into
the project to restyle it.
