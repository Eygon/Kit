---
name: error-contract
description: IErrorResponse shape — translationCode preferred over legacy French validation fields; type axios errors as AxiosError<IErrorResponse>, never any
metadata:
  type: project
---

# Backend Error Contract

Backend errors are typed as `IErrorResponse` (`@prjTypes/error/error`). The shape mixes a modern path and legacy fields:

```ts
interface IErrorResponse {
  translationCode?: string;        // modern — resolved via the /translations table
  ErreursDeValidation: IErreurValidation[]; // legacy validation array (French contract)
  HasErrors: boolean;
  MessageGlobal: string;
  Messages: string[];
  error?: string;                  // backend English string
  details?: string;
  type: string;                    // blob support
  text: () => string;
}
```

- **`translationCode` is the preferred path** — it resolves to localized copy. Legacy French fields (`ErreursDeValidation`, `MessageGlobal`, …) are kept for backend compat only; do not build new UX on them.
- Type axios errors as `AxiosError<IErrorResponse>` — always parameterize the generic, never `any`.
- Narrow `unknown → AxiosError<IErrorResponse>` only inside `DisplayError`; catch blocks elsewhere pass the raw `unknown` straight to `DisplayError`.
- Backend-contract field names stay verbatim (French `ErreursDeValidation`, etc.) — they mirror the API and are exempt from the english-only rule.
