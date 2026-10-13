---
name: resource-access
description: There is no role/policy framework — authorization is a business rule in the service, checked AFTER existence (404 before 403) and BEFORE conflicts (409), throwing ForbiddenException with a sentence message
metadata:
  type: project
---

# Resource Access (403)

Identity (who) is the guard's job ([[header-identity]]). **Access** (may this user touch
this resource) is a business rule, so it lives in the service.

```ts
async deleteBeer(userId: number, id: number): Promise<void> {
  await this.getOwnedBeer(userId, id);
  await this.beersRepository.deleteWithTastings(id);
}

private async getOwnedBeer(userId: number, id: number): Promise<BeerDto> {
  const beer = await this.getBeer(id);
  if (beer.ownerId !== userId) {
    throw new ForbiddenException("Only the owner can change this beer.");
  }
  return beer;
}
```

- Order inside the service: **404 → 403 → 409**. Load first (unknown → 404), then check
  access (not allowed → 403), then check conflicts (duplicate → 409). Revealing that a
  resource exists before refusing access is accepted in this app ([[service-validation]]).
- No `@Roles()` / policy decorators, no CASL: a private helper (`getOwnedBeer`,
  `ensureMember`…) in the owning service, reused by every write method.
- Read access rules (who can see what) are applied in the repository query when they
  filter a list (`where: { ownerId: userId }`), in the service when they reject a single
  resource.
- Never trust an owner id sent by the client: the owner is `@CurrentUserId()`
  ([[current-user-resolution]]); `forbidNonWhitelisted` rejects an unexpected `ownerId`
  property ([[dto-validation]]).
