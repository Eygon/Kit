---
name: routing
description: react-router v7 in declarative mode — BrowserRouter in main.tsx, one <Routes> in app.tsx, paths from RoutePathEnum (French URL segments kept verbatim), catch-all redirect, top-level sections = bottom tab bar entries, NavLink for navigation, nested <Routes> for sub-screens, lazy() only for heavy pages
metadata:
  type: project
---

# Routing

`react-router` v7 in **declarative mode** (no data router, no loaders/actions: data
fetching is TanStack Query's job). Import from `react-router` — `react-router-dom` is not
installed.

## Where routes live

- `src/main.tsx` mounts `<BrowserRouter>` once, inside the query and i18n providers.
- `src/app.tsx` holds the single top-level `<Routes>`, inside the layout (`<main>` + the
  bottom tab bar + the toast region):

```tsx
<Routes>
  <Route path={RoutePathEnum.ENCYCLOPEDIA} element={<EncyclopediaPage />} />
  <Route path={RoutePathEnum.MAP} element={<MapPage />} />
  <Route path={RoutePathEnum.JOURNAL} element={<JournalPage />} />
  <Route path={RoutePathEnum.PROFILE} element={<ProfilePage />} />
  <Route path="*" element={<Navigate to={RoutePathEnum.ENCYCLOPEDIA} replace />} />
</Routes>
```

- A page is `src/pages/<page>/<page>.tsx`, exported as `XPage`, and is the route element.

## Path constants

Paths come from `RoutePathEnum` (`src/types/enums/routing/routePathEnum.ts`). Never
hardcode a path string in a `Route`, a `NavLink` or a `navigate()`. URL segments are a
public contract and stay French and verbatim (`/carte`, `/profil`, see `naming-language`);
the identifiers stay English (`MAP`, `MapPage`).

A parameterised path is a member plus a builder co-located in the enum file:

```ts
export enum RoutePathEnum {
  BEER_DETAIL = "/bieres/:beerId",
}

export const buildBeerDetailPath = (beerId: number): string =>
  RoutePathEnum.BEER_DETAIL.replace(":beerId", beerId.toString());
```

Read params with `useParams()` and narrow them (`Number(beerId)` + guard, see
`typing/boundary-narrowing`).

## Top-level sections = tab bar entries

A top-level section is one `RoutePathEnum` member, one `<Route>` and one entry in
`TAB_BAR_ENTRIES` (`src/constants/tabBarConstants.ts`, icon + `labelKey`). There are four
today; a fifth tab is a product decision, not a refactor (see `ui/mobile-first`). Detail
screens (a beer, a tasting) are routes **without** a tab — the tab of their section stays
the current one only if its `NavLink` drops `end` for that section.

## Navigation

- Links: `NavLink` / `Link` from `react-router` (see `accessibility/semantic-elements`);
  `NavLink` sets `aria-current="page"` and gives `isActive` to its `className` function.
- Imperative navigation after a mutation: `useNavigate()` with a path from the enum.
- Unknown paths redirect to the encyclopedia (`path="*"` + `<Navigate replace />`); no
  404 page until the product asks for one.

## Nested routing

A page hosting several sub-screens that share its layout declares its own `<Routes>`
behind a `/*` on the parent route:

```tsx
<Route path={`${RoutePathEnum.JOURNAL}/*`} element={<JournalPage />} />

<Routes>
  <Route index element={<TastingList />} />
  <Route path=":tastingId" element={<TastingDetail />} />
</Routes>
```

## Code splitting

Pages are imported eagerly today. Wrap a page in `lazy(() => import(...))` under a
`<Suspense fallback={<PageSkeleton />}>` only when it pulls a heavy dependency (a map
library) — measure with `npm run build` first.

## Tests

`renderWithProviders(ui, { initialPath })` wraps the tree in a `MemoryRouter`; assert the
heading of the rendered page and the `aria-current` of the tab.
