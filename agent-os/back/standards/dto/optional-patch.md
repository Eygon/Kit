---
name: optional-patch
description: Optional<T> distinguishes "field not sent" from "field set to null" in PATCH DTOs
metadata:
  type: project
---

# Optional<T> for PATCH Payloads

`Optional<T>` (in `MySepteo.Api.Primitives`) distinguishes "field not sent" from "field explicitly set to null" in PATCH requests.

```csharp
// DTO
public class FooUpdateDto
{
    public Optional<string?> Name { get; set; }  // not sent = Undefined, sent null = HasValue(null)
    public Optional<int?> CategoryId { get; set; }
}

// Service usage
if (dto.Name.HasValue)
    entity.Name = dto.Name.Value;
```

- Use `Optional<T>` ONLY on PATCH input DTOs, never on GET response DTOs
- A custom `OptionalJsonConverterFactory` handles deserialization automatically
- `Optional<T>.HasValue` is `false` when the field is absent from the JSON payload
