---
name: mapper-preloaded-relations
description: Mappers read only relations the repository query loaded (relations / leftJoinAndSelect); no lazy relations, no eager: true, no query inside a mapper
metadata:
  type: project
---

# Mappers Rely on Pre-Loaded Relations

The repository owns the loading; the mapper only reads.

```ts
const entities = await this.tastings.find({
  where: { beerId },
  relations: { author: true },
  order: { id: "ASC" },
});
return entities.map(toTastingDto);
```

- Load what the mapper needs with `relations: { x: true }` or
  `leftJoinAndSelect` in the same query ([[repository-pattern]]).
- Never `lazy: true` (`Promise<T>` relations) and never `eager: true`: the first hides an
  N+1 behind an `await` in a mapper, the second loads data every query pays for.
- A mapper that needs a relation types its input with the relation present
  (`author: User | null`), so forgetting the join is a type error, not a silent `null`.

See [[mapper-composition]].
