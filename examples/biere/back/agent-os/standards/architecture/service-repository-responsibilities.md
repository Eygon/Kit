---
name: service-repository-responsibilities
description: Business logic lives in the service; the repository only reads/writes through TypeORM — the one piece of logic it owns is building the query (find options / QueryBuilder) so SQLite does the filtering and ordering
metadata:
  type: project
---

# Service vs Repository Responsibilities

Business logic lives in the **service**. The **repository** only fetches or persists data.

- The repository does **not** orchestrate, enrich, apply business rules, throw HTTP
  exceptions or combine several data sources in memory. It returns DTOs, `null`, booleans
  or counts; the service decides ([[repository-pattern]]).
- **The one legitimate piece of logic in a repository is building the query** — `where`,
  `order`, conditional filters, a `QueryBuilder` — so SQLite filters and sorts instead of
  JavaScript.
- The service never imports from `typeorm` (no `Repository`, `DataSource`,
  `EntityManager`, `In`, `Like`…). Transactions are a repository method too
  ([[transactions]]).

```ts
@Injectable()
export class UsersRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async findById(id: number): Promise<UserDto | null> {
    const entity = await this.users.findOneBy({ id });
    return entity === null ? null : toUserDto(entity);
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUser(userId: number): Promise<UserDto> {
    const user = await this.usersRepository.findById(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found.`);
    }
    return user;
  }
}
```

Smell: a repository method that loops to set properties, calls another repository, or
throws `NotFoundException` holds logic that belongs in the service. A service method
that builds a `FindOptionsWhere` holds a query that belongs in the repository.
