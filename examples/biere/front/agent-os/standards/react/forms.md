---
name: forms
description: Form & validation pattern — HeroUI Form + TextField/Label/Input/Description/FieldError (React Aria validation, no react-hook-form/zod), form values separate from the model, co-located mappers, server 400 mapped to validationErrors, validationBehavior="aria"
metadata:
  type: project
---

# Forms & Validation

Stack: HeroUI v3 fields on React Aria — `Form`, `TextField` + `Label` + `Input` /
`TextArea` + `Description` + `FieldError`, `NumberField`, `Select`, `Checkbox`, `Switch`,
`Slider`. React Aria owns validation (`isRequired`, `minLength`, `validate`) and the
accessible wiring (label ↔ input, `aria-invalid`, error description). No
`react-hook-form`, no `zod`: they are not installed and the no-new-libraries rule applies.

## Form values + mappers

Form values are ALWAYS separate from the model — never bind a model directly to fields.
Co-located in `types/<entity>FormValues.ts` and `utils/` at the feature's scope:

```ts
export type TastingFormValues = { beerName: string; rating: number; notes: string };

export const EMPTY_TASTING_FORM: TastingFormValues = { beerName: "", rating: 3, notes: "" };

export const tastingToFormValues = (tasting: Tasting): TastingFormValues => ({ ... });
export const formValuesToNewTasting = (values: TastingFormValues): NewTasting => ({ ... });
```

- `<Entity>FormValues` type, `EMPTY_<ENTITY>_FORM` constant for create defaults.
- Bidirectional mappers: `<entity>ToFormValues` (edit) and `formValuesTo<Entity>` (submit).

## Fields

Controlled fields, one state object for the form (see `react/hooks`), every label and
message through `t()`:

```tsx
<Form validationBehavior="aria" validationErrors={serverErrors} onSubmit={handleSubmit} className="flex flex-col gap-4">
  <TextField
    isRequired
    name="beerName"
    value={values.beerName}
    onChange={(beerName) => updateValue("beerName", beerName)}
    validate={(value) => (value.trim().length < 2 ? t("pages.journal.form.beerNameTooShort") : null)}
  >
    <Label>{t("pages.journal.form.beerName")}</Label>
    <Input className="min-h-11" />
    <Description>{t("pages.journal.form.beerNameHint")}</Description>
    <FieldError />
  </TextField>
  <Button type="submit" size="lg" fullWidth isPending={isSaving}>
    {t("pages.journal.form.save")}
  </Button>
</Form>
```

- `validationBehavior="aria"`: errors render in `FieldError` and the form stays submittable
  for screen readers, instead of the browser's native bubbles.
- `isRequired`'s default message comes from React Aria in the browser language — when the
  copy matters, use `validate` returning a `t()` string.
- `onChange` of a HeroUI text field hands the **string** (not an event); number fields hand
  a `number`, selects a `Key | null` (narrow it, see `typing/boundary-narrowing`).
- Inputs get `min-h-11` and the submit `size="lg"` on mobile (see `ui/mobile-first`).

## Submit

```tsx
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  void createTasting(formValuesToNewTasting(values));
};
```

- Map form values back to the model before calling the mutation.
- A backend 400 (validation) is shown on the fields: map it to
  `validationErrors={{ beerName: t("...") }}` on the `Form`, keyed by field `name`. The
  toast from `DisplayError` still fires once (see `api/error-handling`).

## Multi-step

A wizard keeps one `FormValues` object in its orchestrator hook (`useTastingWizard`); each
step renders its fields and validates them before `goNext` (React Aria `validate` per
field, plus a pure `isStepValid(step, values)` helper in `utils/`). Values survive closing
a drawer only if the orchestrator lives above it.
