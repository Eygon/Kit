---
name: multipart-upload
description: File uploads post a FormData with httpClient.postForm — no hand-set Content-Type (the browser adds the boundary), one file per request, field named "file", 5 MB backend cap checked client-side first
metadata:
  type: project
---

# Multipart File Upload

A `File` (a beer label photo, a tasting picture) reaches the backend as `FormData` posted
with `httpClient.postForm`.

```ts
static async uploadPhoto(tastingId: number, file: File): Promise<Photo> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isCover", String(true));
    const response = await httpClient.postForm<PhotoDto>(withTastingId(TASTING_PHOTOS(), tastingId), formData, {
      signal: AbortSignal.timeout(PHOTO_UPLOAD_TIMEOUT_MS),
    });
    if (response.data === null) throw new HttpError(response.status, "Empty upload response");
    return photoDtoToModel(response.data);
  } catch (error) {
    DisplayError(error);
    throw error;
  }
}
```

Everything in `api/service-structure` still applies — service class, URL from a builder,
DTO→model mapping, `api/error-handling` (an upload is a write: toast then rethrow),
mandatory `queryFunctions` pass-through. Multipart changes only the body and the headers.

## Headers

- `httpClient` sets `Content-Type: application/json` only for a non-`FormData` body;
  with `postForm` it sets none and the browser writes `multipart/form-data; boundary=…`
- Never set `Content-Type: multipart/form-data` by hand — a value without the boundary
  makes the backend reject the parts (mechanical check)
- `X-User-Id` and `Accept` are still set by `httpClient` — never rebuild headers

## Body

- The file part is named `file` (the backend's multer field) and appended first
- Non-file fields go in the same `FormData`, always as strings — `String(value)` for
  booleans and numbers, never a nested JSON part
- The multipart body is not a DTO: `append` each field from the model, no `xToDto` builder

## Size

The backend keeps files in memory and refuses anything above **5 MB** with a 413
(`errors.payloadTooLarge`). Check `file.size` against a `PHOTO_MAX_SIZE_BYTES` constant
before posting, so the user is told immediately instead of after a full upload on mobile
data.

## Timeout

An upload's request is bounded like any other — the `signal` in the recipe above.
Whether a bound is required, and what it must cover, is `api/request-timeouts`.

## One file per request

Multi-file screens loop over single-file requests — never one request carrying N
file parts. Sequencing, the selection cap and per-file status live in a hook
(`useTastingPhotosUpload`), which sends files one after another while each stays
independently retryable.

## Tests

Assert the call shape, not the body — `FormData` contents are not worth snapshotting:

```ts
expect(mockPostForm).toHaveBeenCalledWith(
  expect.stringMatching(/\/photos$/),
  expect.any(FormData),
  expect.objectContaining({ signal: expect.any(AbortSignal) }),
);
```
