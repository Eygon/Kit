---
name: sealed-by-default
description: Classes and records are sealed by default across every layer (Controllers, DTO, DAL, Services, Repositories); drop sealed only for a deliberate base type, and confirm the intent with the author when a type becomes a parent
metadata:
  type: project
---

# Sealed by Default

Every concrete class and record is `sealed` by default — Controllers, DTOs, DAL models, Services, Repositories, Mappers. Inheritance is opt-in, not accidental.

```csharp
public sealed class AccountsController : Controller { /* … */ }                // concrete controller
public sealed record AccountDto { /* … */ }                                   // leaf DTO
public sealed class AccountService : Service<IAccountRepository>, IAccountService { /* … */ }
public sealed class AccountRepository : Repository<AccountContext>, IAccountRepository { /* … */ }
```

- A type is **not** sealed only when it is the deliberate **base** of an inheritance hierarchy — it carries shared fields/behaviour, derived types specialize. Examples: the abstract `Controller` base every controller inherits ([[controller-patterns]]), `BibleDto` ← `EventDto` ← `TicketDto` (DTOs), `Document` ← `TicketReport` (DAL/TPH, see [[tph-discriminators]]), the framework base classes `Service<TRepo>` / `Repository<TContext>` ([[layer-base-classes]]).
- ⚠️ When a previously-sealed type needs to **become a parent**, removing `sealed` is a design decision — **confirm the intent with the author** first; don't un-seal mechanically to make a quick inheritance compile.
- A leaf type left un-sealed (or `sealed` dropped without a base/derived pair) is a smell — flag it.

Applies across layers: Controllers ([[controller-patterns]]), DTOs ([[dto-shape]]), DAL models ([[ef-entity-type-configuration]], [[tph-discriminators]]), Services and Repositories ([[layer-base-classes]]).
