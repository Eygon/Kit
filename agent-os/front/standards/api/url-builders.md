---
name: url-builders
description: Centralized company-scoped endpoint builders in apiURL; no inline URLs; debugMode base toggle; placeholder + replace path params
metadata:
  type: project
---

# API URL Builders

Every endpoint is a builder function in `@utils/api/apiURL` — never an inline
URL string in a service (`folderService.ts` is the anti-example, do not repeat).

```ts
export const ACCOUNTS = (company: string) =>
    `${debugMode ? API_BASE_URL_LOCAL : API_BASE_URL}/api/v1/${company}/Accounts`;

export const ACCOUNT_OFFERS = (company: string) => `${ACCOUNTS(company)}/{accountId}/Offers`;
```

- Base toggles on `debugMode` (LOCAL vs REMOTE) — handled once, here
- First segment is always the tenant: builder takes `company`, called with
  `getSelectedCompany()` at the service
- Compose builders from a domain root (`ACCOUNT_OFFERS` reuses `ACCOUNTS`)

Path params are `{placeholder}` literals, substituted in the service:

```ts
api.get(ACCOUNT_OFFERS(getSelectedCompany()).replace("{accountId}", accountId.toString()), request);
```

When one param recurs across a service, wrap the substitution in a local helper:

```ts
const withId = (url: string, supportRequestId: number): string =>
    url.replace("{supportRequestId}", supportRequestId.toString());
```
