---
name: pipeline-ordering
description: Custom middleware order — UseAuthentication/Authorization first, then ExceptionHandling → CurrentDbContext → AuthorizedCompany; company resolved before it is authorized
metadata:
  type: project
---

# Middleware Pipeline Ordering

The custom middlewares run in a fixed order; reordering breaks tenant routing or authorization.

```csharp
app.UseAuthentication();          // populates User claims
app.UseAuthorization();
app.MapControllers();
app.UseExceptionHandlingMiddleware();   // wraps the tenant middlewares
app.UseCurrentDbContextMiddleware();    // resolves {company} → connection string + accessor
app.UseAuthorizedCompanyMiddleware();   // checks the caller may access that company
```

- **After `UseAuthentication`** — both tenant middlewares read `User` claims.
- **CurrentDbContext before AuthorizedCompany** — the company must be resolved before access to it is checked.
- **ExceptionHandling wraps them** — domain exceptions thrown downstream map to HTTP ([[domain-exceptions]]).
- Registered after `MapControllers()`, they still run before endpoint execution — `WebApplication` appends the endpoint middleware last.

See [[middleware-authoring]], [[tenant-resolution]], [[domain-exceptions]].
