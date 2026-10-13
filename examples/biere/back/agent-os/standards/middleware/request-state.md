---
name: request-state
description: Per-request data (the current user id) is written by the guard on the request object (AuthenticatedRequest.currentUserId) and read through @CurrentUserId(); never in a provider field, never Scope.REQUEST, never AsyncLocalStorage
metadata:
  type: project
---

# Per-Request State

Every provider is a **singleton** shared by all requests. A field written during one
request is visible to the next one — a cross-user data leak.

```ts
export interface AuthenticatedRequest extends Request {
  currentUserId?: number;
}

request.currentUserId = userId;
```

- The guard writes `currentUserId` on the request; `@CurrentUserId()` reads it and hands
  it to the controller, which passes it to the service as an argument
  ([[current-user-resolution]]).
- Never `private currentUserId` on a service, guard or repository.
- Never `@Injectable({ scope: Scope.REQUEST })`: it recreates the whole dependency chain
  per request and hides the data flow.
- Anything else request-scoped (locale, correlation id) follows the same path: a typed
  field on `AuthenticatedRequest`, a param decorator, an explicit argument.
