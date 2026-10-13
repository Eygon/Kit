---
name: ui-states
description: Every query-backed section renders four managed states — loading (HeroUI Skeleton), error (Alert status=danger role=alert, with retry), empty (EmptyStatePanel, the mascot on HeroUI EmptyState) and data; null when a guard should defer; no React ErrorBoundary by design
metadata:
  type: project
---

# UI States

A section backed by a query renders one of four managed states — never a thrown render,
never a blank screen:

| State | Render |
|---|---|
| Loading (`isPending`) | HeroUI `Skeleton` blocks with the shape of the content (a list of cards → N card skeletons) |
| Error (`isError`) | HeroUI `Alert status="danger" role="alert"` with a translated title and a retry `Button` calling `refetch` |
| Empty (data is `[]` / `null`) | `EmptyStatePanel` (`src/components/elements/emptyStatePanel`, built on HeroUI `EmptyState`): a decorative `Mascot` in the mood of the situation (`ui/mascot`), title, description via `t()` |
| Data | the content |

```tsx
const { data: beers = [], isPending, isError, refetch } = useBeersQuery();

if (isPending) return <BeerListSkeleton />;
if (isError)
  return (
    <Alert status="danger" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("errors.generic")}</Alert.Title>
      </Alert.Content>
      <Button size="lg" variant="danger-soft" onPress={() => void refetch()}>
        {t("common.retry")}
      </Button>
    </Alert>
  );
if (beers.length === 0)
  return (
    <EmptyStatePanel
      mood={MascotMoodEnum.SEARCHING}
      title={t("pages.encyclopedia.emptyTitle")}
      description={t("pages.encyclopedia.emptyDescription")}
    />
  );
return <BeerList beers={beers} />;
```

- Because services swallow read errors and return a fallback (`api/error-handling`), most
  failed reads arrive as **empty** with a toast already shown; the `isError` branch covers
  what reaches the query (a mapper throw, a rethrowing read).
- **`null`** when the failure should render nothing and let surrounding logic decide (a
  guard, an optional badge).
- No React `ErrorBoundary` — deliberate. Async failures surface through these states and
  the `DisplayError` toast; render crashes are not hidden behind a boundary.
- All copy renders through `t(...)`; the skeleton keeps the final layout so nothing jumps
  when data arrives (mobile: no layout shift under the thumb).
