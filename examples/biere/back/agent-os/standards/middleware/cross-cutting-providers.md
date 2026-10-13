---
name: cross-cutting-providers
description: Cross-cutting HTTP behaviour is a Nest guard / pipe / interceptor / filter in src/common/<kind>/, @Injectable, singleton, registered globally in AppModule via APP_* tokens or locally with @UseGuards/@UseInterceptors — not raw Express middleware
metadata:
  type: project
---

# Cross-Cutting Providers

The .NET `XxxMiddleware` + `UseXxxMiddleware` pair becomes a **Nest enhancer**:

| Need | Enhancer | Example in the repo |
|---|---|---|
| Allow / refuse the request | Guard (`CanActivate`) | `CurrentUserGuard` |
| Validate / transform input | Pipe | `createValidationPipe()`, `ParseIntPipe` |
| Shape errors | Exception filter | `HttpExceptionFilter` |
| Wrap the handler (timing, upload) | Interceptor | `FileInterceptor("photo", MEMORY_UPLOAD_OPTIONS)` |
| Read request metadata in a handler | Param decorator | `@CurrentUserId()` |
| Tag a route | Metadata decorator | `@Public()` |

```ts
@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = parseUserId(request.headers[USER_ID_HEADER]);
    if (userId === null) {
      throw new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE);
    }
    request.currentUserId = userId;
    return true;
  }
}
```

- Files live in `src/common/<guards|pipes|filters|interceptors|security|…>/`, named
  `<name>.guard.ts`, `<name>.filter.ts`, `<name>.decorator.ts`, `<name>.interceptor.ts`.
- An enhancer is a singleton: inject only singletons in its constructor, never store
  request data in a field ([[request-state]]).
- Short-circuit by **throwing** a Nest exception, never by writing the response.
- Keep the decision logic in a pure function next to it (`parseUserId`) so it is unit
  tested without Nest.
- No `app.use(expressMiddleware)` for application logic; Express middleware is reserved
  for what Nest already wires (body parser, CORS).

See [[request-pipeline]], [[dependency-injection]].
