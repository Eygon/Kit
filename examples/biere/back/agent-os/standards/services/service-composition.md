---
name: service-composition
description: A service uses its own repository plus other modules' exported services (import the module), never another module's repository or entity Repository; no circular module imports — extract a shared module instead
metadata:
  type: project
---

# Service Composition

```ts
@Injectable()
export class BeersService {
  private readonly logger = new Logger(BeersService.name);

  constructor(
    private readonly beersRepository: BeersRepository,
    private readonly usersService: UsersService,
  ) {}

  async getOwner(id: number): Promise<UserDto> {
    const beer = await this.getBeer(id);
    return this.usersService.getUser(beer.ownerId);
  }
}
```

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Beer, Tasting]), UsersModule],
  controllers: [BeersController],
  providers: [BeersService, BeersRepository],
  exports: [BeersService],
})
export class BeersModule {}
```

- Cross-module access goes through the **service** the other module exports — so its 404 /
  403 rules apply. `UsersModule` exports `UsersService` only.
- Never inject `UsersRepository` or `@InjectRepository(User)` outside `users/` (the
  seeder in `src/database/` is the single exception, [[seeding]]).
- Module imports form a tree. If two modules need each other, the shared part becomes its
  own module; `forwardRef` is not used.

See [[dependency-injection]], [[service-repository-responsibilities]].
