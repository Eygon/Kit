---
name: final-readonly-by-default
description: TypeScript has no sealed/final — so every injected dependency is private readonly, every DTO/config field readonly, constants as const / readonly T[]; classes are never extended except a deliberate base, confirmed with the author
metadata:
  type: project
---

# Final / Readonly by Default

TypeScript has no `sealed`. The .NET rule "sealed by default" becomes **"nothing is
mutable or extensible unless it has to be"**.

```ts
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
}

export interface UserDto {
  readonly id: number;
  readonly displayName: string;
  readonly avatarColor: string;
}

export const DEFAULT_CORS_ORIGINS: readonly string[] = ["http://localhost:5173", "http://localhost:5174"];
```

| Kind | Rule |
|---|---|
| Injected dependency | `private readonly` constructor parameter (enforced by `@typescript-eslint/prefer-readonly`) |
| Private field set once (`logger`) | `private readonly logger = new Logger(Xxx.name)` |
| Read DTO / config interface | every property `readonly` ([[dto-shape]], [[typed-config]]) |
| Write DTO class | every property `readonly` + `!` (required) or `?` (optional) — the ValidationPipe instantiates it, nobody mutates it |
| Constant collection | `readonly T[]`, `Readonly<Record<…>>` or `as const` ([[constants]]) |
| Entity | `readonly id!: number`; the other columns stay mutable — TypeORM writes them ([[entities]]) |
| Local variable | `const`; `let` only when it is reassigned (`prefer-const`) |

## Inheritance is opt-in

- No `extends` between controllers, services, repositories, DTOs or entities. Nest wires
  everything by constructor injection, so there is no base class to inherit
  ([[module-structure]]).
- The only legitimate `extends` are framework contracts (`interface AuthenticatedRequest extends Request`)
  and a deliberate base of a real hierarchy. Introducing one is a design decision —
  **confirm the intent with the author** first; never add `extends` to reuse two lines.
- Reuse goes through composition: a pure function, a mapper, an injected service.
