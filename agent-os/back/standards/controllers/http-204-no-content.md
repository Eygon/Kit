---
name: http-204-no-content
description: A GET that finds nothing returns HTTP 204 No Content — not 404, not 200 with an empty body
metadata:
  type: project
---

# HTTP 204 on Empty GET Result

When a `GET` finds nothing, return **HTTP 204 No Content**. (Source of truth — PR review.)

- Applies to **get-by-id** (entity not found → 204, not 404) and to **collection** endpoints (empty result → 204, not `200 Ok([])`).
- Declare both response types with `[ProducesResponseType]`.

```csharp
// Get by id
[HttpGet("{id:int}")]
[ProducesResponseType<FooDto>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<ActionResult<FooDto>> Get([FromRoute] int id, [FromServices] IFooService service)
{
    var result = await service.Get(id);
    return result is null ? NoContent() : Ok(result);
}

// Collection
[HttpGet]
[ProducesResponseType<List<FooDto>>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status204NoContent)]
public async Task<ActionResult<List<FooDto>>> GetAll([FromServices] IFooService service)
{
    var result = await service.GetAll();
    return result.Count == 0 ? NoContent() : Ok(result);
}
```
