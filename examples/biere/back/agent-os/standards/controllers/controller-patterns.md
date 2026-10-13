---
name: controller-patterns
description: Controllers are thin — route + DTO binding + one service call + explicit @HttpCode; the service is constructor-injected; no business rule, no repository, no try/catch, no manual response object
metadata:
  type: project
---

# Controller Patterns

A controller method is three lines of intent: **bind** (DTO, params, current user), **call**
the service, **declare** the status.

```ts
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<UserDto[]> {
    return this.usersService.getUsers();
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  getMe(@CurrentUserId() userId: number): Promise<UserDto> {
    return this.usersService.getUser(userId);
  }
}
```

- `@Controller("<plural-feature>")`; the `api/v1` prefix comes from
  `app.setGlobalPrefix(API_PREFIX)` — never repeat it in a route.
- Inject the module's service in the constructor (`private readonly`). A controller
  never injects a repository, a TypeORM `Repository` or another module's controller.
- Return the service's promise directly. No `if`, no loop, no mapping in the controller:
  the service returns DTOs ([[repository-pattern]]).
- **No `try/catch`**: services throw Nest exceptions and the global filter shapes the body
  ([[exceptions]]).
- No `@Res()` / `response.status(...)`: the status comes from `@HttpCode` and the
  exceptions ([[http-status-codes]]).
- Every handler declares an explicit return type (`Promise<UserDto>`, `Promise<void>`).
- Protection is global; only `@Public()` changes it ([[public-routes]]).

See [[binding-conventions]], [[current-user-resolution]].
