---
name: partial-update-builder
description: Build partial-update (PATCH) payloads with buildXDto — assign a key only when !== undefined; coerce cleared optional inputs to null
metadata:
  type: project
---

# Partial Update DTO Builder (PATCH)

Build partial-update payloads with `buildXDto(values: Partial<FormValues>): UpdateXDto`. Start from `{}` and assign a key **only when the value is `!== undefined`**.

```ts
export const buildTastingDto = (values: Partial<TastingFormValues>): UpdateTastingDto => {
  const dto: UpdateTastingDto = {};
  if (values.rating !== undefined) dto.rating = values.rating;
  if (values.beerId !== undefined) dto.beerId = values.beerId;
  if (values.notes !== undefined) dto.notes = values.notes || null;
  if (values.placeName !== undefined) dto.placeName = values.placeName || null;
  return dto;
};
```

- **Omit absent fields** — the backend PATCH only updates keys present in the payload; an
  absent key is left unchanged (and the NestJS `ValidationPipe` with `forbidNonWhitelisted`
  rejects keys the DTO does not declare, so never send extras). Essential for multi-step forms.
- **Optional/nullable fields:** coerce with `values.x || null` — a cleared input arrives as `""`, sent as `null` to clear it backend-side
- **Required fields / ids:** assign as-is, no coercion (`""` or `0` is not a "clear me" value there)
