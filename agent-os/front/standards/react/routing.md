---
name: routing
description: Config-driven routing — RouteConfig[] + createRoute, per-domain files, lazy/Suspense; authorization per active profile via screenCode only (tabsPermissions/userPermissions declared but NOT enforced), RouteGuard resolution order, nested page routing
metadata:
  type: project
---

# Routing

Centralized, config-driven. Routes are data (`RouteConfig[]`), not scattered JSX.

## Config & factory

```ts
// routes/configs/routes/<domain>.ts
export const accountRoutes: RouteConfig[] = [
  createRoute(`${accountRouteDefault}/:accountId`,
    lazy(() => import("@pages/account/accountHome")),
    { tabsPermissions: [PermissionEnum.AccountAccess] }),
];
```

- One file per domain in `routes/configs/routes/`, exporting `<domain>Routes: RouteConfig[]`.
- Build each route with `createRoute(path, component, restrictions?)` — never a raw object.
- Aggregate all domains in `routes/configs/routes/index.ts` → `appRoutesConfig`.
- `AppRoutes` maps the config to `<Route>`; every `component` is `lazy(() => import(...))`
  rendered under a single `<Suspense>`.
- All top-level routes go through this. Exception: purely technical routes
  (login, notFound, redirects) may be inline JSX in `AppRoutes`.

## Path constants

Paths derive from `<domain>RouteDefault` in `@utils/routes/routesConstants`. Never hardcode
a path string.

```ts
createRoute(`${backofficeRouteDefault}/*`, ...);   // "/backoffice/*"
createRoute(`${accountRouteDefault}/:accountId/offer/:offerId`, ...);
```

## Authorization — what actually enforces access (per profile)

`RouteGuard` wraps every route in `AppRoutes`. Restriction is declarative on the
route — the page never checks access itself.

```ts
// Restrict a route to profiles whose backend screens include this code:
createRoute(`${offersValidationRouteDefault}/*`,
  lazy(() => import("@pages/offersValidation/offersValidation")),
  { screenCode: ScreenCode.OFFERS_VALIDATION });
```

- Authorization is **per active profile**: `useAccessibleScreensQuery(activeProfile.id)`
  fetches the screen codes the backend grants that profile. `screenCode` not in the
  list → `<AccessDenied/>`. This is the ONLY restriction the guard enforces.
- ⚠️ `tabsPermissions`, `userPermissions`, `requiresMultiOffice`, `requiresNotReadOnly`,
  `requiresApplication` are declared on routes but **NOT enforced by RouteGuard**.
  To actually gate a route by profile, use `screenCode` — nothing else blocks.

### RouteGuard resolution order

1. MSAL `inProgress !== None` → loader.
2. Restricted mode (`useRestrictedMode`, true when debug off) → redirect every route
   to `/offersValidation`.
3. Profile or screens still resolving → loader (avoids a premature `AccessDenied`).
4. `screenCode` absent from accessible screens → `<AccessDenied/>`.

## Nested page routing

A page hosting several sub-screens that share its layout declares its own `<Routes>`
(an `index` route + routes mapped from a catalog), behind a `/*` wildcard on the parent route.

```ts
createRoute(`${backofficeRouteDefault}/*`, lazy(() => import("@pages/backoffice/backoffice")));
```

```tsx
<Routes>
  <Route index element={<Hub .../>} />
  {accessibleScreens.map((s) => <Route key={s.viewModel} path={s.path} element={<s.component/>} />)}
</Routes>
```

- Use top-level vs nested case by case: nest when the page provides a shared layout/shell
  for multiple sub-screens; otherwise a flat top-level route.
