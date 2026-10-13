---
name: modal-dialog
description: Every overlay is a HeroUI Drawer (bottom sheet, default on mobile) or Modal/AlertDialog built on React Aria Dialog — focus trap, Escape, scroll lock and labelling come for free; Heading inside Dialog names it; no hand-rolled div role=dialog or native <dialog>
metadata:
  type: project
---

# Modal Dialogs & Sheets

Every overlay reuses a HeroUI overlay — for visual consistency, and because it carries the
accessibility wiring (React Aria `Dialog` inside a `Modal` overlay):

- focus moved into the dialog and trapped, restored to the trigger on close
- `Escape` closes it, the page behind is inert and does not scroll
- the `*.Heading` (a React Aria `Heading` with `slot="title"`) labels the dialog — no
  `useId` / `aria-labelledby` wiring by hand

On a phone the default is a **bottom sheet** — `Drawer` with `placement="bottom"`
(see `ui/mobile-first`). `Modal` is for a short centred dialog, `AlertDialog` for a
destructive confirmation.

```tsx
<Drawer>
  <Button size="lg" variant="secondary">{t("pages.encyclopedia.filters")}</Button>
  <Drawer.Backdrop>
    <Drawer.Content placement="bottom">
      <Drawer.Dialog>
        <Drawer.Handle />
        <Drawer.Header>
          <Drawer.Heading>{t("pages.encyclopedia.filters")}</Drawer.Heading>
        </Drawer.Header>
        <Drawer.Body>...</Drawer.Body>
        <Drawer.Footer>
          <Button size="lg" slot="close">{t("common.close")}</Button>
        </Drawer.Footer>
      </Drawer.Dialog>
    </Drawer.Content>
  </Drawer.Backdrop>
</Drawer>
```

- The first child of `Drawer` / `Modal` (a React Aria `DialogTrigger`) is the pressable
  trigger; for a controlled overlay pass `isOpen` + `onOpenChange` to the root instead.
- Close from inside with a `Button slot="close"` or `*.CloseTrigger` — never by toggling a
  `hidden` class.
- Don't hand-roll a `<div role="dialog">` or a native `<dialog>` — you would re-wire focus
  trap, `Escape`, scroll lock and labelling yourself.
- A full-width modal on a phone is a drawer: don't stretch `Modal` with `size="full"` to fake one.
