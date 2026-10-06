---
name: controller-return-type
description: Actions return Task<ActionResult<T>> for explicit status control — never a bare Task<TDto>
metadata:
  type: project
---

# Controller Return Type

Action signatures return `Task<ActionResult<T>>`, never a bare `Task<TDto>` / `Task<TDto?>`.

```csharp
public async Task<ActionResult<FooDto>> Get(...)   // ✓
public async Task<FooDto?> Get(...)                // ✗ (legacy)
```

- Gives explicit control over the status code (`Ok` / `NoContent` / `NotFound` / `BadRequest` / `Forbid`) instead of relying on the framework's null→204.
- Legacy bare-DTO actions still exist; convert them when touched.
