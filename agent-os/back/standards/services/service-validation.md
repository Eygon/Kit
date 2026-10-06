---
name: service-validation
description: Business rules DataAnnotations can't express are enforced in the service via guard checks throwing domain exceptions; no-op PATCH short-circuited via HasAnySuppliedValue
metadata:
  type: project
---

# Service-Layer Validation

DataAnnotations validate shape; the **service** enforces rules the type system can't express (cross-field, DB-dependent, permission-based) by throwing domain exceptions.

```csharp
public async Task ValidateAsync(int accountId, UpdateAccountIdentifiersDto dto, bool isMultiOffice)
{
    if (!dto.HasAnySuppliedValue) return;          // no-op PATCH → nothing to validate

    if (dto.Siret.HasValue && !_siret.IsValid(dto.Siret.Value, country))
        throw new BadRequestException("The SIRET does not match the expected format.");
}
```

- Throw domain exceptions ([[domain-exceptions]]) — `BadRequestException`, `ForbiddenException`, `ResourceNotFoundException`.
- Reuse the shared `DtoValidation` helpers (`ValidateRequiredNullableField`, `ValidatePositiveIntField`, `ValidateMaxLengthField`) for common guards.
- Short-circuit a no-op PATCH early via `HasAnySuppliedValue` ([[dto-cross-field-validation]]).

See [[domain-exceptions]], [[optional-validation-attributes]].
