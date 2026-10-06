---
name: domain-exceptions
description: Services throw BadRequestException/ForbiddenException/ResourceNotFoundException; ExceptionHandlingMiddleware maps them to 400/403/404. Controllers don't catch.
metadata:
  type: project
---

# Domain Exceptions → HTTP Status

Services signal failure by throwing a domain exception; `ExceptionHandlingMiddleware` maps it to the HTTP status. Controllers do **not** catch them.

```csharp
if (account is null)
    throw new ResourceNotFoundException($"Account {accountId} not found.");
if (dto.Siret.HasValue && !IsValid(dto.Siret.Value))
    throw new BadRequestException("The SIRET does not match the expected format.");
```

| Exception (`MySepteo.Api.Exceptions`) | Status |
|---|---|
| `BadRequestException` | 400 |
| `ForbiddenException` | 403 |
| `ResourceNotFoundException` | 404 |
| anything else | 500 (message hidden in prod/preprod) |

- Only those three exceptions' messages reach the client; everything else returns `"Internal error"`. A raw `InvalidOperationException` leaks as an opaque 500 — throw a domain exception instead.
- `BadRequestException` carries an optional `TranslationCode`, returned in the error body.
- ⚠️ Known deviation: the `External*` services throw `InvalidOperationException` and their controller catches + string-matches it. Tolerated there; new code throws domain exceptions and lets the middleware map them.

See [[service-validation]].
