---
name: dto-cross-field-validation
description: PATCH DTOs expose a HasAnySuppliedValue aggregate; a class-level ValidationAttribute rejects a no-op (all-absent) payload
metadata:
  type: project
---

# Cross-Field PATCH Validation

When a PATCH must reject a no-op payload (nothing supplied), expose a `HasAnySuppliedValue` aggregate and enforce it with a class-level `ValidationAttribute`.

```csharp
// Section DTO — aggregates .HasValue across every Optional<T> field
public sealed record UpdateAccountIdentityDto
{
    [OptionalStringLength(3, 100)] public Optional<string> Name { get; set; }
    // … other Optional<T> fields …
    public bool HasAnySuppliedValue => Name.HasValue /* || … all fields */;
}

// Aggregate DTO — class-level attribute enforces "at least one section supplied"
[RequiredOverviewSection]
public sealed record UpdateAccountOverviewDto
{
    public UpdateAccountIdentityDto? Identity { get; init; }
    // … other sections …
}
```

- The custom attribute targets `AttributeTargets.Class`, returns a `ValidationResult` when nothing was supplied → 400.
- Use only where a no-op PATCH should be rejected; not every PATCH DTO needs it.

See [[optional-patch]], [[optional-validation-attributes]].
