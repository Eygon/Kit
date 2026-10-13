---
name: error-handling
description: Reads swallow + DisplayError + safe fallback; writes DisplayError + rethrow; toast exactly once (HeroUI toast.danger inside DisplayError); HttpStatusCodeEnum
metadata:
  type: project
---

# API Error Handling

Every service method wraps its call in `try/catch` and calls `DisplayError(error)`
in the catch. `DisplayError` toasts exactly once: it maps the `HttpError` status to an
i18n key (`getErrorTranslationKey`, generic message otherwise) and calls HeroUI's
`toast.danger(...)`. Toast there and nowhere else.

Read methods (get/list/search) — swallow, return a safe fallback:

```ts
} catch (error) {
  DisplayError(error);
}
return [];        // or null for a single resource
```

Write methods (create/update/patch/remove/upload) — toast, then rethrow:

```ts
} catch (error) {
  DisplayError(error);
  throw error;   // drives the mutation's error state — does NOT re-toast
}
```

- Never re-toast in the hook / `onError` / component — the service already did. The
  rethrow exists only so the mutation knows it failed.
- A read failure must never break the screen → always a safe fallback.
- `httpClient` throws an `HttpError` (`status`, `message`) for any non-2xx answer; a network
  failure or an abort reaches the catch as a plain `Error` / `DOMException` and gets the
  generic message.
- A screen that needs its own wording for a status passes a resolver:
  `DisplayError(error, getImportErrorTranslationKey)` — still one toast.
- Status checks use `HttpStatusCodeEnum` (e.g. `NO_CONTENT`), never a raw number — see `http-status`.
- The backend error body is `{ "message": string }` (see `error-handling/error-contract`) —
  it is for logs, never shown as is.
