---
name: controller-patterns
description: Controller base class inheritance, [FromServices] per-action injection, [Authorize(Policy)] mandatory
metadata:
  type: project
---

# Controller Patterns

## Inheritance

All controllers MUST inherit `MySepteo.Api.Controllers.V1.Controller`, never `ControllerBase` directly.

```csharp
public sealed class FooController : Controller  // ✓
public class FooController : ControllerBase     // ✗
```

Concrete controllers are `sealed`; only the abstract `Controller` base is unsealed ([[sealed-by-default]]).

The base class provides: `[ApiVersion]`, `[Route]`, `[ApiController]`, `CreatedWithCompanyName()`, `ReadTokenAsync()`, `ReadCompanyUserIdAsync()`.

## Service injection via [FromServices]

Inject services per-action with `[FromServices]`, not via constructor. This keeps constructors small and avoids instantiating unused services.

```csharp
[HttpGet("{id:int}")]
public async Task<ActionResult<UserDto>> Get([FromRoute] int id, [FromServices] IUserService userService)
    => Ok(await userService.GetById(id));
```

Actions return `Task<ActionResult<T>>`, never a bare `Task<TDto>` ([[controller-return-type]]).

## Authorization

Every non-public route MUST declare `[Authorize(Policy = "...")]`. Never leave a route unprotected by default.

```csharp
[HttpPost]
[Authorize(Policy = Policies.TicketCreate)]
public async Task<ActionResult<TicketDto>> Post([FromBody] TicketCreationDto dto, [FromServices] ITicketService svc)
    => Ok(await svc.Add(dto));
```

Policy constants live in `MySepteo.Api.Constants.Policies`.

See [[controller-return-type]], [[binding-conventions]].
