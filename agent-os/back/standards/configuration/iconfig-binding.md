---
name: iconfig-binding
description: Strongly-typed config classes implement IConfig (static Section); Helper.AddConfigurations reflects & registers IOptions<ConfigXxx> automatically; consume via IOptions<T>
metadata:
  type: project
---

# Strongly-Typed Config Binding

Each config section is a `ConfigXxx` class implementing `IConfig`. `Helper.AddConfigurations()` discovers it by reflection and registers `IOptions<ConfigXxx>` — no manual `Configure<>` call.

```csharp
public sealed class ConfigSmtp : IConfig
{
    public static string Section => "Smtp";    // appsettings section name
    public required string Server { get; set; }
    public int Port { get; set; } = 587;
}

// Consume
public FooService(IOptions<ConfigSmtp> smtp) => _server = smtp.Value.Server;
```

- Implement `IConfig` and expose `static string Section` (the appsettings key) — `AddConfigurations` binds it automatically.
- Class name `ConfigXxx`, in `MySepteo.Api.Configuration`.
- Consume via injected `IOptions<ConfigXxx>`; never read `IConfiguration` directly in services.
- Required/optional keys → [[required-optional-config]].

See [[di-auto-registration]], [[required-optional-config]].
