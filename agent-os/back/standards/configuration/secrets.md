---
name: secrets
description: Secret-bearing config properties are bound from configuration; real values come from environment variables (container/K8s), never hardcoded or committed to appsettings
metadata:
  type: project
---

# Secrets

Secrets are config properties bound from configuration — the real values come from **environment variables** (Kubernetes secrets → container env), overriding appsettings. Never hardcode a secret or commit it.

```csharp
public sealed class ConfigConnectionStrings : IConfig
{
    public string? DbPassword { get; set; }   // value injected via env, not in source
}
```

- Secret values (`DbPassword`, `Smtp.Password`, `JwtSecret`, …) come from env vars per environment; committed `appsettings*.json` holds non-secret defaults / placeholders only.
- Bind through a `ConfigXxx : IConfig` property ([[iconfig-binding]]); read via `IOptions<T>`.
- Never inline a secret or credential in code ([[no-hardcoded-values]]).
- ⚠️ Known deviation: the trusted client-id allow-list is hardcoded in `AuthorizationExtensions` ([[policy-evaluation]]) — move it to configuration.

See [[no-hardcoded-values]], [[iconfig-binding]], [[policy-evaluation]].
