---
name: request-timeouts
description: The shared axios instance has no default timeout — bound a call whenever a hung request would strand UI state, from a named constant sized against the backend's own ceiling; the client bound sits above that ceiling so the server answers first, and a fired bound reaches the user as its own case
metadata:
  type: project
---

# Request Timeouts

The shared `api` instance declares no `timeout` and the axios default is `0` — wait
forever. Its request interceptor only normalizes errors, and no `AbortController` is
wired anywhere, so nothing bounds a call but the call itself. A server-side timeout does
not save the client either — a dead connection never reports back.

Bound a call when a request that never settles would leave UI state unable to resolve
itself: a locked modal, a spinner that never clears, a row stuck mid-progress.

- Timeout from a named `_MS` constant, never a raw literal (see `constants`)
- Declare it at a scope the consumer can own. `BANKING_DOCUMENT_UPLOAD_TIMEOUT_MS` sits in a page's `utils/` and is imported by a top-level service — that import direction is what `file-placement` warns against; a new one belongs with the service or domain that owns the wait, the way `RIB_ANALYSIS_REQUEST_TIMEOUT_MS` sits in `api/documentAnalysis/`
- The bound covers **every** await in the blocking region, not only the obvious one

## Sizing a bound

Comfortably above the observed round-trip — its **tail**, not its typical case — and
calibrated against the server's own ceiling, which is read in the backend, never guessed:

| Call | Server ceiling | Client bound |
|---|---|---|
| RIB OCR extraction | 150s, explicit (`appsettings.json` → `DocumentRib.TimeoutSeconds`) | 180s — deliberately *above* the server ceiling, so the server answers first |
| Banking document attach | 30s, implicit (a DB write through the repository, EF Core default) | 60s — the server errors out first, so this only guards against silence |
| Commune autocomplete | 30s, implicit (EF Core default, never overridden) | 10s — an index seek capped at 200 rows answers sub-second |

Two traps. Sizing on the typical case discards the tail: 60s looked generous against an
assumed ~6s round-trip and was in fact 1.2× a real success. And one constant shared by two
operations lets the slower one dictate the other's bound — size each call from its own
evidence. Note an implicit ceiling as such: it moves the day someone calls
`SetCommandTimeout` or the provider changes its default.

## Which side gives up first is a decision

Whoever abandons first owns the diagnosis. A server that gives up first still **answers**:
the RIB extraction returns 504, and the consumer says *the analysis took too long* instead of
*the service is down*. A client that gives up first aborts blind and strands work the server
is still doing. So a client bound placed above the server's ceiling is not slack — it only
guards against a connection that never reports back, and both sides state the pairing in
their own comments so neither moves alone. Below that ceiling, the client steals the answer.

A bound that fires still has to reach the user as its own case: map the gateway timeout
explicitly, or the generic "server error" branch swallows it (see `error-handling/error-contract`).

## The blocking region is the whole chain

The banking upload modal locks itself shut across the attach and the save (`beforeClose`
returns false while either runs), so one unbounded call there strands the modal for good. It
deliberately stays closable across the analysis — the OCR **and** the city lookup inside
`prepareAnalysis` — which is what lets that chain carry a 180s bound without holding the user.
The rule does not change with the region: whatever a region locks, the lock lifts only once
its slowest await settles, so one unbounded call anywhere in it reopens the hole the other
bounds were meant to close.

## When no bound is needed

Abandoning must already be handled — the dismiss control stays live throughout **and**
late writes are discarded. The vendor bill import panel and mass-import modal qualify
(page-owned `SidePanel` `onToggle`, close button never disabled, generation ref dropping
late state writes) and set none. That is coherent; don't add one reflexively.

## Never tighten a bound for perceived speed

An AI document analysis is legitimately slow, and a shorter timeout converts successes
into failures. Bound for termination; explain the wait in the UI instead — phase labels
and a deferred hint, not a smaller number.

## When a bound fires

A timed-out **write** may have committed server-side, so reporting a plain failure
invites a duplicating retry — see the write hand-off in `api/error-handling`. A **read**
always reports, timeouts included (same standard).
