---
name: forms
description: Form & validation pattern — react-hook-form + zod, co-located schema/mappers, controller field wrappers, multi-step
metadata:
  type: project
---

# Forms & Validation

Stack: `react-hook-form` + `zod` via `@hookform/resolvers/zod`.
Always `useForm({ resolver: zodResolver(schema), mode: "onChange" })` + `<FormProvider>`.

## Schema + mappers

Co-located in `types/<entity>FormSchema.ts`. Form values are ALWAYS separate from the
model — never bind a model directly to react-hook-form.

```ts
export const favoriteReasonFormSchema = z.object({ name: z.string().min(1), ... });
export type FavoriteReasonFormValues = z.infer<typeof favoriteReasonFormSchema>;

export const emptyFavoriteReasonForm: FavoriteReasonFormValues = { name: "", ... };

export const favoriteReasonToFormValues = (model: FavoriteReason): FavoriteReasonFormValues => ({ ... });
export const formValuesToFavoriteReason = (values: FavoriteReasonFormValues, ...): FavoriteReason => ({ ... });
```

- `<entity>FormSchema` (the `z.object`), `<Entity>FormValues = z.infer<...>`.
- `empty<Entity>Form` constant for create defaults.
- Bidirectional mappers: `<entity>ToFormValues` (edit) and `formValuesTo<Entity>` (submit).

## Field wrappers

One thin wrapper per input, built on `useController` + `ComponentWithLabel` + Septeo input
(`Field`, `DropdownSingle`, `Checkbox`). Scope is case-by-case: prefer per-entity wrappers
typed on `Path<FormValues>` for strong `name` safety; a generic wrapper is fine when typing
isn't a concern.

```tsx
const { field, fieldState } = useController<FavoriteReasonFormValues>({ name });

<ComponentWithLabel text={label} htmlFor={name}
  labelStatus={required ? "required" : "none"} hasError={fieldState.error !== undefined}>
  <Field htmlFor={name} name={name} value={value}
    error={fieldState.error?.message}
    onChange={(e) => field.onChange(e.target.value)} />
</ComponentWithLabel>
```

- Read/write via `field.value` / `field.onChange` only.
- Surface errors with `error={fieldState.error?.message}` + `hasError`.
- Error messages in the schema are i18n keys, resolved with `t(...)`.

## Form wiring

- `useForm({ resolver: zodResolver(schema), mode: "onChange" })` — onChange always.
- Wrap fields in `<FormProvider {...methods}>`; fields read context via `useController`.
  Never prop-drill `register`.
- Submit maps form values back to the model before calling `onSubmit`:

```tsx
const submit = handleSubmit((values) => onSubmit(formValuesToFavoriteReason(values, ...)));
```

## Multi-step

When the UX is a navigable step wizard, split the schema per step and recombine:

```ts
export const formShape = { ...identificationStepShape, ...motiveStepShape };
export const Schema = z.object(formShape).superRefine(identificationStepRefine);
export const stepFields: Record<Step, Field[]> = {
  [Step.IDENTIFICATION]: Object.keys(identificationStepShape) as Field[],
  ...
};
```

- Per-step validation: `methods.trigger(stepFields[step])` (or `shape[field].safeParse(...)`).
- A dedicated `<Entity>FormProvider` wraps `<FormProvider>` and persists values to Redux
  across panel close/reopen.
