---
name: multipart-upload
description: File uploads post a FormData with withMultipart(request) — no hand-set Content-Type, one file per request, base64 JSON only where the endpoint contract demands it
metadata:
  type: project
---

# Multipart File Upload

A `File` reaches the backend as `FormData` posted with `withMultipart(request)`.

```ts
static async analyzeBankingRibDocument(file: File): Promise<BankingRibOcrResult> {
    const request = await generateRequestConfig();
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(DOCUMENT_ANALYSIS_RIB(getSelectedCompany()), formData, {
        ...withMultipart(request),
        timeout: BANKING_DOCUMENT_REQUEST_TIMEOUT_MS
    });
    return BankingRibOcrResultDtoToModel(response.data as BankingRibOcrResultDto);
}
```

Everything in `api/service-structure` still applies — service class, awaited
`generateRequestConfig()` first, URL from a builder, DTO→model mapping,
`api/error-handling`, mandatory `queryFunctions` pass-through. Multipart changes
only the body and the headers.

## Headers

- `generateRequestConfig()` always sets `Content-Type: application/json`; `withMultipart(config)` strips it so axios sets `multipart/form-data` with its own boundary
- Never set `Content-Type: multipart/form-data` by hand — a value without the boundary makes the backend reject the parts
- Spread the auth config, never rebuild headers: `{ ...withMultipart(request), timeout: ... }`

## Body

- The file part is named `file` and appended first
- Non-file fields go in the same `FormData`, always as strings — `String(value)` for booleans and numbers, never a nested JSON part
- The multipart body is not a DTO: `append` each field from the model (`VendorBillImportData`), no `xToDto` builder

## Timeout

An upload's request is bounded like any other — the `timeout` in the recipe above.
Whether a bound is required, and what it must cover, is `api/request-timeouts`.

## One file per request

Multi-file screens loop over single-file requests — never one request carrying N
file parts. Sequencing, the selection cap and per-file status live in a hook
(`useVendorBillMassImport`), which reads files one after another while each line
stays independently importable.

## When not multipart

An endpoint whose contract takes base64 keeps it — escalation request attachments
post `{ fileName, contentBase64 }` as JSON via `readFileAsBase64`. Follow the
endpoint contract, do not convert it.

## Tests

Assert the call shape, not the body — `FormData` contents are not worth
snapshotting:

```ts
expect(mockPost).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(FormData),
    expect.objectContaining({ timeout: BANKING_DOCUMENT_REQUEST_TIMEOUT_MS })
);
```
