---
name: service-composition
description: A service depends on other domains' services (interfaces), never their repositories; inherit Service<TRepo> only when the service owns a repository
metadata:
  type: project
---

# Service Composition

Cross-domain access goes through the owning domain's **service**, never its repository.

```csharp
public sealed class AccountOverviewService : Service<IAccountRepository>, IAccountOverviewService
{
    public AccountOverviewService(
        IAccountRepository repository,                       // own repo → base class
        IAccountStakeholdersValidationService stakeholders,  // other domains → their services
        IAccountNotificationService notification,
        ILogger<AccountOverviewService> logger) : base(repository, logger) { /* … */ }
}
```

- A service injects its **own** repository (via `Service<TRepo>`) plus other domains' **service interfaces** — never another domain's repository.
- Inherit `Service<TRepo>` only when the service owns a repository. A pure validation/orchestration service (no repository) implements just its interface:

```csharp
public sealed class AccountIdentifierValidationService : IAccountIdentifierValidationService { /* … */ }
```

See [[layer-base-classes]], [[service-repository-responsibilities]].
