---
name: public-routes
description: Every route is protected by default; a route or controller opts out with @Public() — reserved for health and future truly anonymous endpoints, never to work around a failing test
metadata:
  type: project
---

# Public Routes

Protection is the default; anonymity is explicit.

```ts
@Public()
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  getHealth(): HealthDto {
    return { status: HealthStatusEnum.OK };
  }
}
```

- `@Public()` (`src/common/security/public.decorator.ts`) sets the `IS_PUBLIC_KEY`
  metadata; `CurrentUserGuard` reads it on the handler first, then on the class
  (`Reflector.getAllAndOverride`).
- Today only `GET /api/v1/health` is public.
- A public handler must not use `@CurrentUserId()`: with no guard run there is no id, and
  the decorator throws 401 by design.
- Adding `@Public()` to a route that reads or writes user data is a security change —
  state it in the spec and the PR.

See [[header-identity]].
