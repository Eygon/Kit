---
name: post-commit-side-effects
description: Any non-transactional side-effect after a successful commit (email, notification, external call) is best-effort — try/catch + log, never fail the persisted write
metadata:
  type: project
---

# Post-Commit Side-Effects

A non-transactional side-effect after a successful commit (email, notification, external/GED call) is **best-effort**: it may fail without failing the already-persisted operation.

```csharp
try
{
    await _notificationService.SendAsync(...);
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    Logger.LogError(ex, "[FooService] Deferred side-effect failed for {Id}.", id);
}
```

- Run side-effects **after** the commit, not inside the transaction.
- Wrap in `try/catch`, log the error, still return success.
- Exclude `OperationCanceledException` from the catch — never swallow cancellation.
- Extract heavier side-effect flows into a dedicated `*SideEffectService`.

See [[domain-exceptions]].
