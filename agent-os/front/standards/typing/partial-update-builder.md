---
name: partial-update-builder
description: Build partial-update (PATCH) payloads with buildXDto — assign a key only when !== undefined; coerce cleared optional inputs to null
metadata:
  type: project
---

# Partial Update DTO Builder (PATCH)

Build partial-update payloads with `buildXDto(values: Partial<FormValues>): UpdateXDto`. Start from `{}` and assign a key **only when the value is `!== undefined`**.

```ts
export const buildAccountContactInfoDto = (
  values: Partial<AccountContactInfoFormValues>
): UpdateAccountContactInfoDto => {
  const dto: UpdateAccountContactInfoDto = {};
  if (values.entityName !== undefined) dto.entityName = values.entityName;   // required → as-is
  if (values.cityId !== undefined) dto.cityId = values.cityId;               // id → as-is
  if (values.email !== undefined) dto.email = values.email || null;          // optional → "" becomes null
  if (values.residence !== undefined) dto.residence = values.residence || null;
  return dto;
};
```

- **Omit absent fields** — the backend PATCH only updates keys present in the payload; an absent key is left unchanged. Essential for multi-step / multi-tab forms.
- **Optional/nullable fields:** coerce with `values.x || null` — a cleared input arrives as `""`, sent as `null` to clear it backend-side
- **Required fields / ids:** assign as-is, no coercion (`""` is not a "clear me" value there)
