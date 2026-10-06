---
name: mutation-cache-updates
description: setQueryData for locally-known fields, invalidateQueries for server-derived data; optimistic 4-callback recipe vs plain invalidate-on-success
metadata:
  type: project
---

# Mutation Cache Updates

Mutation hooks call `useQueryClient` and build the affected key once (`const detailKey = ...keys.detailById(currentCompany, id)`).

## setQueryData vs invalidateQueries

| Use | When |
|-----|------|
| `setQueryData` | The new value is known locally (title, state, keywords) — write it directly, zero round-trip |
| `invalidateQueries` | Data is derived / recomputed server-side and can't be rebuilt locally (history, audit) |

Both can fire in one mutation: write the known field, invalidate the derived ones.

```ts
onSuccess: (_data, title) => {
    queryClient.setQueryData<SupportRequestDetail | null>(detailKey, (current) =>
        current ? { ...current, title } : current
    );
    void queryClient.invalidateQueries({
        queryKey: supportRequestKeys.history(currentCompany, supportRequestId)
    });
}
```

## Two mutation shapes

**Plain invalidate-on-success** — default. `onSuccess` writes/invalidates, no rollback.

**Optimistic (4 callbacks)** — for immediate-feedback actions (toggle, add tag):

```ts
onMutate: async (value) => {
    await queryClient.cancelQueries({ queryKey: detailKey });
    const previous = queryClient.getQueryData<SupportRequestDetail | null>(detailKey);
    queryClient.setQueryData(detailKey, (current) => /* optimistic write */);
    return { previous };                                  // context
},
onError: (_e, _v, context) => {
    if (context?.previous !== undefined) queryClient.setQueryData(detailKey, context.previous);
},
onSuccess: (serverData, value) => { /* reconcile with response + septeoToast.success */ },
onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: detailKey, exact: true });
    void queryClient.invalidateQueries({ queryKey: supportRequestKeys.history(currentCompany, id) });
}
```

- `onMutate` snapshots `previous` and returns it as context; `onError` rolls back with it.
- Always `void` the `invalidateQueries` promise.
- Success toasts (`septeoToast.success`) live in the hook; error toasts come from the service's `DisplayError` (see service-error-handling).
