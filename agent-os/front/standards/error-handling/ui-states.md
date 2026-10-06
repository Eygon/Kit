---
name: ui-states
description: A failed query (isError) renders SectionError (role=alert) / null / AccessDenied; no React ErrorBoundary by design
metadata:
  type: project
---

# Error UI States

A failed query (`isError` from TanStack Query) renders one of three managed states — never a thrown render:

- **`SectionError`** — inline, translated block with `role="alert"` when a section fails but the rest of the screen stays usable.
- **`null`** — when the failure should render nothing and let surrounding logic decide (e.g. a route guard).
- **`AccessDenied`** — dedicated component for an authorization refusal; not a generic error state.

```tsx
const { data, isLoading, isError } = useAccessibleScreensQuery(profileId);

if (isError) return null;            // guard: defer to other logic
if (isLoading) return <div>{t("common.information.loading")}</div>;
// ... or, for a failed section:
if (isError) return <SectionError />; // role="alert", translated
```

- No React `ErrorBoundary` — deliberate. Async failures are surfaced through `isError` states + the `DisplayError` toast; render crashes are not hidden behind a boundary.
- Error copy renders through `t(...)` like all UI text.
