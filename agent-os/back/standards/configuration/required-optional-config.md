---
name: required-optional-config
description: Config classes signal mandatory keys with `required`, optional keys with T? and inline defaults — the same type-driven signal as input DTOs
metadata:
  type: project
---

# Required vs Optional Config

A config property's type states whether the key is mandatory — the same signal as DTOs ([[nullable-as-required]]).

```csharp
public sealed class ConfigSmtp : IConfig
{
    public static string Section => "Smtp";
    public required string Server { get; set; }     // mandatory
    public int Port { get; set; } = 587;            // optional, with default
    public string? Domain { get; set; }             // optional, no default
}
```

- Mandatory key → `required` (non-nullable).
- Optional key → `T?`, or a value type with an inline default.
- Don't re-check presence in code when the type already says it.

See [[nullable-as-required]], [[iconfig-binding]].
