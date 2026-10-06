---
name: nullable-as-required
description: Input DTO required-ness — optional via nullable type; mandatory via the `required` modifier (value-constraint DataAnnotations like [Range]/[MinLength] are allowed but not mandatory). External* DTOs are a known deviation.
metadata:
  type: project
---

# Nullable-as-Required (input DTOs)

Required-ness of an input field is expressed by the **type plus the `required` modifier**, not `[Required]`.

```csharp
public sealed record CreateFooDto
{
    // Required (the `required` modifier is what makes it mandatory;
    // the DataAnnotations below are optional value constraints)
    [Range(1, int.MaxValue)]            // optional — add only if 0 is invalid here
    public required int AccountId { get; set; }
    [MinLength(1)]                       // optional — add only if "" is invalid here
    public required string Reason { get; set; }

    // Optional
    public string? Description { get; set; }
    public int? QualificationId { get; set; }
}
```

- **Optional** = nullable type (`string?`, `T?`); no `required`, no `[Required]`.
- **Required** = the `required` modifier — that alone makes the field mandatory.
- Value-constraint DataAnnotations (`[Range(1, int.MaxValue)]` on ids, `[MinLength(1)]` on strings) **may** be added but are **not mandatory**: a required `int` (even an id) can legitimately be `0` in some flows, and a required `string` can legitimately be `string.Empty`. Add the annotation only when `0` / empty is actually invalid for that field.
- `required` does real work for value types — `int` can't signal "mandatory" through nullability.
- ⚠️ Known deviation: the `External*` request DTOs (e.g. `CreateExternalInvoiceRequest`) use `string?` + manual `BadRequest` checks in the controller. Tolerated for those external contracts; new DTOs should not copy it.

See [[dto-shape]], [[optional-validation-attributes]].
