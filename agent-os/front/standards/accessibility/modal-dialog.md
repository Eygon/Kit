---
name: modal-dialog
description: Reuse the shared <Modal> built on native <dialog> + showModal(); aria-modal + aria-labelledby via useId; no hand-rolled div role=dialog
metadata:
  type: project
---

# Modal Dialogs

Reuse the shared `<Modal>` component for every modal — for visual consistency, and it carries the accessibility wiring.

It's built on the native `<dialog>` element opened with `showModal()`:

- `showModal()` (not `show()`) gives focus trap, ESC-to-close, top-layer and backdrop for free
- `aria-modal="true"` + `aria-labelledby={titleId}` where `titleId = useId()` and the `<h2>` carries that id
- Close via `dialog.close()`; the `onClose` prop fires on the dialog's native `close` event

```tsx
<dialog ref={dialogRef} onClose={onClose} aria-modal="true" aria-labelledby={titleId}>
    <h2 id={titleId}>{title}</h2>
    ...
</dialog>
```

- Don't hand-roll a `<div role="dialog">` — you'd re-wire focus trap and ESC yourself
- Don't use `dialog.show()` (non-modal: no backdrop, no focus trap)
