---
name: entities
description: TypeORM entities are decorated classes in entities/<name>.entity.ts — @Entity({ name }) with a plural snake_case table, explicit column types, lengths from constants, nullable columns typed T | null, enums as simple-enum; registered with TypeOrmModule.forFeature in the owning module only
metadata:
  type: project
---

# TypeORM Entities

```ts
@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: USER_DISPLAY_NAME_MAX_LENGTH })
  displayName!: string;

  @Column({ type: "varchar", length: USER_AVATAR_COLOR_LENGTH })
  avatarColor!: string;
}
```

```ts
@Entity({ name: "beers" })
export class Beer {
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Column({ type: "varchar", length: BEER_NAME_MAX_LENGTH, unique: true })
  name!: string;

  @Column({ type: "simple-enum", enum: BeerStyleEnum })
  style!: BeerStyleEnum;

  @Column({ type: "real" })
  abv!: number;

  @Column({ type: "varchar", length: BEER_DESCRIPTION_MAX_LENGTH, nullable: true })
  description!: string | null;

  @Column({ type: "integer" })
  ownerId!: number;
}
```

- Mapping is done with TypeORM **decorators on the entity** — the TypeScript equivalent
  of the .NET `IEntityTypeConfiguration`. No `EntitySchema`, no mapping elsewhere.
- Table name explicit, plural: `@Entity({ name: "users" })`. Column names are the camelCase
  property names (no `name:` override unless an external schema imposes it).
- Every `@Column` declares its `type` (`varchar`, `integer`, `real`, `boolean`,
  `datetime`, `simple-enum`); string lengths come from the feature constants
  ([[no-hardcoded-values]]).
- A nullable column is `nullable: true` **and** typed `T | null` — never `T | undefined`.
  The mapper turns it into the DTO default ([[mapper-null-defaults]]).
- Enum column → `type: "simple-enum", enum: XxxEnum` with a string enum ([[enums]]).
- Fields use `!` (definite assignment): TypeORM fills them. `id` is `readonly`.
- An entity is registered in its own module: `TypeOrmModule.forFeature([Beer, Tasting])`.
  `autoLoadEntities` adds it to the connection ([[database-module]]).
- Entities never leave the repository: controllers and services see DTOs
  ([[repository-pattern]]).
- Relations (`@ManyToOne`…) are added only when a query needs to join; a plain foreign key
  column (`ownerId`) is enough otherwise. Never `eager: true`, never lazy relations
  ([[mapper-preloaded-relations]]).
