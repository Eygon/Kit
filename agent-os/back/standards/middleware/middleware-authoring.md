---
name: middleware-authoring
description: sealed XxxMiddleware with (RequestDelegate, ILogger) ctor; inject scoped deps into Invoke(...) not the ctor (middleware is singleton); paired UseXxxMiddleware extension
metadata:
  type: project
---

# Middleware Authoring

Custom middleware follows a fixed shape.

```csharp
public sealed class FooMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<FooMiddleware> _logger;

    public FooMiddleware(RequestDelegate next, ILogger<FooMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // Scoped services are parameters of Invoke — NOT the constructor
    public Task Invoke(HttpContext httpContext, ICurrentCompanyAccessor accessor)
        => _next(httpContext);
}

public static class FooMiddlewareExtensions
{
    public static IApplicationBuilder UseFooMiddleware(this IApplicationBuilder builder)
        => builder.UseMiddleware<FooMiddleware>();
}
```

- Inject **scoped** services as `Invoke(...)` parameters, never via the constructor — middleware is instantiated once (singleton); ctor-injecting a scoped service is a captive dependency.
- Only `RequestDelegate` + singletons (e.g. `ILogger`) belong in the constructor.
- Pair each middleware with a `UseXxxMiddleware(this IApplicationBuilder)` extension; wire it in `Program.cs` ([[pipeline-ordering]]).
- To short-circuit, write the response (`application/problem+json`) and return without calling `_next`.

See [[pipeline-ordering]].
