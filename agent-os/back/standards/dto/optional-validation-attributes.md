---
name: optional-validation-attributes
description: Validate Optional<T> properties with the [Optional*] attribute family — plain [Range]/[StringLength] silently skip Optional<T> and validate nothing
metadata:
  type: project
---

# Optional<T> Validation Attributes

`Optional<T>` properties use the dedicated `[Optional*]` attribute family. **Standard DataAnnotations silently skip `Optional<T>` and validate nothing.**

```csharp
[OptionalStringLength(3, 100)]      // not [StringLength]
public Optional<string> Name { get; set; }

[OptionalRange(1, int.MaxValue)]    // not [Range]
public Optional<int?> SegmentId { get; set; }
```

Available (in `MySepteo.Api.Primitives.Optional.Attributes`):
- `[OptionalStringLength(min, max)]` — also rejects empty/whitespace
- `[OptionalMaxLength(n)]`
- `[OptionalRange(min, max)]`
- `[OptionalDateRange(minYear, maxYear)]`
- `[OptionalRegularExpression(pattern)]`

- Each validates **only when the field is supplied** — absent passes; for nullable inner types (`Optional<int?>`) an explicit `null` also passes.
- ⚠️ A plain `[Range]`/`[StringLength]`/`[MaxLength]` on an `Optional<T>` compiles and runs but never fires — no validation, no error. Easy to miss in review.

See [[optional-patch]].
