---
name: binding-conventions
description: Binding sources always explicit ([FromRoute]/[FromBody]/[FromQuery]/[FromServices]); integer id route params use the :int constraint
metadata:
  type: project
---

# Binding Conventions

Binding sources are always explicit; integer id route params carry the `:int` constraint.

```csharp
[HttpGet("{id:int}")]
public async Task<ActionResult<FooDto>> Get(
    [FromRoute] int id,
    [FromBody] FooDto dto,            // when applicable
    [FromQuery] string? filter,       // when applicable
    [FromServices] IFooService svc)
```

- Always annotate: `[FromRoute]`, `[FromBody]`, `[FromQuery]`, `[FromServices]` — never rely on inference.
- Integer id route params use `{id:int}`.
- `[Range(1, int.MaxValue)]` on a **route-param** id is optional (author discretion) — the `:int` constraint already rejects non-numeric values. A **required id field inside a body DTO** is made mandatory by the `required` modifier; there too `[Range(1, int.MaxValue)]` is an optional value constraint, not a requirement ([[nullable-as-required]]).

See [[nullable-as-required]].
