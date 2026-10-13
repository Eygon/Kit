---
name: mutation-cache-updates
description: setQueryData for locally-known fields, invalidateQueries for server-derived data; optimistic 4-callback recipe vs plain invalidate-on-success; success toasts via HeroUI toast.success in the hook, error toasts only from DisplayError
metadata:
  type: project
---

# Mutation Cache Updates

Mutation hooks call `useQueryClient` and build the affected key once
(`const detailKey = beerKeys.detail(beerId)`).

## setQueryData vs invalidateQueries

| Use | When |
|-----|------|
| `setQueryData` | The new value is known locally (a rating, a note, a favourite flag) — write it directly, zero round-trip |
| `invalidateQueries` | Data is derived / recomputed server-side and can't be rebuilt locally (average rating, counts, history) |

Both can fire in one mutation: write the known field, invalidate the derived ones.

```ts
onSuccess: (_data, rating) => {
  queryClient.setQueryData<Beer | null>(detailKey, (current) => (current ? { ...current, myRating: rating } : current));
  void queryClient.invalidateQueries({ queryKey: beerKeys.ratings(beerId) });
},
```

Changing the demo user (`useCurrentUser`) invalidates **every** query: all data is
per-user through the `X-User-Id` header.

## Two mutation shapes

**Plain invalidate-on-success** — default. `onSuccess` writes/invalidates, no rollback.

**Optimistic (4 callbacks)** — for immediate-feedback actions (favourite toggle, rating):

```ts
onMutate: async (isFavorite) => {
  await queryClient.cancelQueries({ queryKey: detailKey });
  const previous = queryClient.getQueryData<Beer | null>(detailKey);
  queryClient.setQueryData<Beer | null>(detailKey, (current) => (current ? { ...current, isFavorite } : current));
  return { previous };
},
onError: (_error, _isFavorite, context) => {
  if (context?.previous !== undefined) queryClient.setQueryData(detailKey, context.previous);
},
onSuccess: () => {
  toast.success(i18n.t("pages.encyclopedia.favoriteSaved"));
},
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: detailKey, exact: true });
},
```

- `onMutate` snapshots `previous` and returns it as context; `onError` rolls back with it.
- Always `void` the `invalidateQueries` promise.
- Success toasts (`toast.success` from `@heroui/react`) live in the hook; error toasts come
  only from the service's `DisplayError` (see `api/error-handling`) — never `toast.danger`
  in `onError`.
