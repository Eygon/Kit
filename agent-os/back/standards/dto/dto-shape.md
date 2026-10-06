---
name: dto-shape
description: DTOs are public sealed record (unsealed only when a base of a hierarchy); { get; init; } by default and { get; set; } only where binding needs it; XML-doc'd properties; collections default to []
metadata:
  type: project
---

# DTO Shape

DTOs are `public sealed record` ([[sealed-by-default]]).

```csharp
/// <summary>Request body to create a foo.</summary>
public sealed record CreateFooDto
{
    /// <summary>Identifier of the parent dossier.</summary>
    public int DossierId { get; init; }

    /// <summary>Foo line items. At least one is required.</summary>
    public List<FooItemDto> Items { get; init; } = [];
}
```

- `sealed` by default. Drop `sealed` **only** when the DTO is the deliberate **base** of an inheritance hierarchy (e.g. `BibleDto` ← `EventDto` ← `TicketDto`, filled by [[mapper-base-fill]]). If a DTO needs to *become* a parent, confirm the intent with the author before un-sealing it ([[sealed-by-default]]).
- `{ get; init; }` by default; use `{ get; set; }` only where deserialization / model binding requires it (`Optional<T>` properties, request DTOs the binder writes to).
- Document properties with XML `<summary>` — it feeds the Swagger schema.
- Initialize collection properties to `[]`.

See [[optional-patch]], [[sealed-by-default]], [[mapper-base-fill]].
