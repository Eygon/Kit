---
name: url-builders
description: Centralized endpoint builders in src/utils/apiURL/apiURL.ts on API_BASE_URL (VITE_API_URL, default http://localhost:5090) + /api/v1; no inline URLs; placeholder + replace path params
metadata:
  type: project
---

# API URL Builders

Every endpoint is a builder function in `src/utils/apiURL/apiURL.ts` — never an inline URL
string in a service. The file is created with the first endpoint; until then it does not
exist (see `no-dead-files`).

```ts
import { API_BASE_URL } from "@/config/apiConfig";

export const API_V1 = () => `${API_BASE_URL}/api/v1`;

export const USERS = () => `${API_V1()}/users`;

export const CURRENT_USER = () => `${USERS()}/me`;

export const BEERS = () => `${API_V1()}/beers`;

export const BEER_BY_ID = () => `${BEERS()}/{beerId}`;
```

- The base is `API_BASE_URL` from `src/config/apiConfig.ts`: `VITE_API_URL` when set
  (`.env.local`, CI), `http://localhost:5090` otherwise — handled once, there. Never read
  `import.meta.env` elsewhere.
- Every route is under the backend's global `/api/v1` prefix (`API_V1()`).
- Compose builders from a domain root (`BEER_BY_ID` reuses `BEERS`).
- No tenant segment and no user id in the path: the identity travels in the `X-User-Id`
  header set by `httpClient` (`/users/me`, not `/users/{currentUserId}`).

Path params are `{placeholder}` literals, substituted in the service:

```ts
httpClient.get<BeerDto>(BEER_BY_ID().replace("{beerId}", beerId.toString()));
```

When one param recurs across a service, wrap the substitution in a local helper:

```ts
const withBeerId = (url: string, beerId: number): string => url.replace("{beerId}", beerId.toString());
```

Query strings are built with `URLSearchParams`, never by concatenation:

```ts
`${BEERS()}?${new URLSearchParams({ search, page: page.toString() })}`
```
