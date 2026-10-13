---
name: testing-conventions
description: Vitest 5 (+ unplugin-swc for decorator metadata) with explicit imports; one test file per source file mirrored in src/__tests__/<path>.test.ts; Nest units built with Test.createTestingModule and { provide, useValue } vi.fn mocks; repositories and seeders run on in-memory SQLite; AAA, HttpStatus enum, no comments
metadata:
  type: project
---

# Testing Conventions

Stack: **Vitest 5** + **supertest**, SWC transform (`unplugin-swc`, `decoratorMetadata`)
so Nest DI works in tests. Coverage `@vitest/coverage-v8` (text summary + `lcov` in
`coverage/`).

```
src/modules/users/users.service.ts  →  src/__tests__/modules/users/users.service.test.ts
src/common/security/parse-user-id.ts →  src/__tests__/common/security/parse-user-id.test.ts
```

```ts
import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserDto } from "@/modules/users/dtos/user.dto";
import { UsersRepository } from "@/modules/users/users.repository";
import { UsersService } from "@/modules/users/users.service";

const ALICE: UserDto = { id: 1, displayName: "Alice", avatarColor: "#F59E0B" };

describe("UsersService", () => {
  const repository = { findAll: vi.fn(), findById: vi.fn() };
  let service: UsersService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repository }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it("throws 404 for an unknown user", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getUser(9)).rejects.toThrow(new NotFoundException("User 9 not found."));
  });
});
```

- **One test file per source file**, at the mirrored path, suffix `.test.ts` (same rule as
  the front). Type-only files get an `expectTypeOf` test. API tests live in
  `src/__tests__/api/` ([[api-tests]]); helpers in `src/__tests__/support/` (not tests).
- Run one file: `node node_modules/vitest/vitest.mjs run --coverage=false <file>`;
  everything: `npm test` (coverage on).
- Import `describe`/`it`/`expect`/`vi` from `vitest` explicitly (no globals).
- Services and controllers: `Test.createTestingModule` with the real class and its
  collaborators as `{ provide: X, useValue: { method: vi.fn() } }`; `vi.resetAllMocks()`
  in `beforeEach`.
- **Repositories and the seeder are tested against SQLite `:memory:`**
  (`inMemoryDatabase()`): it is the real engine, fast and isolated. *(The .NET reference
  forbade repository tests because it had no test database; this repo has one.)*
- Mappers, parsers, config loaders: plain function tests, no Nest.
- AAA layout separated by blank lines, no `// Arrange` comments ([[no-comments]]); the
  `it(...)` sentence says the behaviour.
- Statuses compared with `HttpStatus.X` ([[http-status]]); seed ids with the seed
  constants ([[seeding]]).
- `as unknown as T` only in tests, for partial doubles (`ExecutionContext`, `ArgumentsHost`).
