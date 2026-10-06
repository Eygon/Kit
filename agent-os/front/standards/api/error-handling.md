---
name: error-handling
description: Reads swallow + DisplayError + safe fallback; writes DisplayError + rethrow; toast exactly once; HttpStatusCode enum
metadata:
  type: project
---

# API Error Handling

Every service method wraps its call in `try/catch` and calls `DisplayError(error)`
in the catch. `DisplayError` toasts exactly once (resolves backend
`translationCode`, falls back to a generic message). Toast there and nowhere else.

Read methods (get/list/search) — swallow, return a safe fallback:

```ts
} catch (error) {
    DisplayError(error);
}
return [];        // or null, or { items: [], totalCount: 0 }
```

Write methods (create/update/patch/remove) — toast, then rethrow:

```ts
} catch (error) {
    DisplayError(error);
    throw error;   // drives the mutation's error state — does NOT re-toast
}
```

- Never re-toast in the hook / `onError` — the service already did. The rethrow
  exists only so the mutation knows it failed.
- A read failure must never break the screen → always a safe fallback.
- Status checks use the `HttpStatusCode` enum (e.g. `NO_CONTENT`), never a raw number — see `http-status`.
