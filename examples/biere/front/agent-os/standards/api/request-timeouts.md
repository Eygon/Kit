---
name: request-timeouts
description: fetch has no default timeout — bound a call with AbortSignal.timeout(X_TIMEOUT_MS) passed as { signal } to httpClient whenever a hung request would strand UI state; size it against the backend's own ceiling (read in the back, never guessed); TanStack's query signal for cancellation
metadata:
  type: project
---

# Request Timeouts

`httpClient` wraps `fetch`, which never times out on its own: a request on a dead
connection waits forever. Nothing in the client bounds a call unless the caller passes a
`signal`. A server-side timeout does not save the client either — a dead connection never
reports back.

Bound a call when a request that never settles would leave UI state unable to resolve
itself: a drawer locked on "saving", a spinner that never clears, a photo upload stuck
mid-progress.

```ts
import { PHOTO_UPLOAD_TIMEOUT_MS } from "@/api/photos/photoConstants";

const response = await httpClient.postForm<PhotoDto>(TASTING_PHOTOS().replace("{tastingId}", id.toString()), formData, {
  signal: AbortSignal.timeout(PHOTO_UPLOAD_TIMEOUT_MS),
});
```

- Timeout from a named `_MS` constant, never a raw literal (see `constants`)
- Declare it with the service or domain that owns the wait (`src/api/<domain>/`), not in a
  page's `utils/` imported by a top-level service — that import direction is what
  `file-placement` forbids
- The bound covers **every** await in the blocking region, not only the obvious one
- A query cancelled by TanStack (unmount, key change) passes its own `signal` through the
  query function; combine both with `AbortSignal.any([signal, AbortSignal.timeout(X_MS)])`
  when a query also needs a bound

## Sizing a bound

Comfortably above the observed round-trip — its **tail**, not its typical case — and
calibrated against the server's own ceiling, which is read in the backend
(`/home/user/biere/back`, see `.sk/repos.json`), never guessed. Today the NestJS backend
sets no request timeout of its own and caps uploads at 5 MB (multer), so a bound is sized
on the slowest realistic upload on a mobile connection, not on a server number.

Two traps. Sizing on the typical case discards the tail: a bound that looks generous
against a 2s round-trip on wifi fails a 5 MB photo on 4G. And one constant shared by two
operations lets the slower one dictate the other's bound — size each call from its own
evidence.

## Which side gives up first is a decision

Whoever abandons first owns the diagnosis. A server that gives up first still **answers**
(a 504 the user can be told about). A client that gives up first aborts blind and strands
work the server may still be doing. A client bound above a server ceiling only guards
against a connection that never reports back; below it, the client steals the answer.
A bound that fires reaches the catch as a `DOMException` (`TimeoutError`) and gets the
generic message from `DisplayError` — map it to its own key with a resolver when the
screen must say "took too long" (see `api/error-handling`).

## When no bound is needed

Abandoning must already be handled — the dismiss control stays live throughout **and**
late writes are discarded. A drawer that stays closable while loading, whose query is
cancelled on unmount, needs none. Don't add one reflexively.

## Never tighten a bound for perceived speed

A shorter timeout converts slow successes into failures. Bound for termination; explain
the wait in the UI instead — a `Skeleton`, a progress label, not a smaller number.

## When a bound fires

A timed-out **write** may have committed server-side, so reporting a plain failure
invites a duplicating retry — invalidate the affected query and let the refetched state
decide before offering a retry (see `react/mutation-cache-updates`). A **read** always
reports, timeouts included (see `api/error-handling`).
