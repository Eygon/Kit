---
name: error-response
description: Every error body is exactly { "message": string } — produced by the global @Catch() HttpExceptionFilter for HttpExceptions (array messages joined with "; "), unknown routes, malformed JSON, multer limits; unexpected errors are logged and answered 500 { "message": "Internal error" }
metadata:
  type: project
---

# Error Response Contract

The front relies on one shape:

```json
{ "message": "Unable to identify the currently signed-in user." }
```

`HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`, registered as
`APP_FILTER`) catches **everything**:

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({ message: readMessage(exception) } satisfies ErrorResponse);
      return;
    }
    this.logger.error("Unhandled exception", exception instanceof Error ? exception.stack : String(exception));
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: INTERNAL_ERROR_MESSAGE } satisfies ErrorResponse);
  }
}
```

- `message` is always a **string**: a string response is used as is; an array (Nest pipes)
  is joined with `ERROR_MESSAGE_SEPARATOR` (`"; "`); otherwise the exception message.
- Validation errors: all constraints flattened and joined by `createValidationException`
  ([[dto-validation]]).
- Also covered, with the same shape: unknown route (`404 Cannot GET /api/v1/x`), malformed
  JSON (400), upload above 5 MB (`413 File too large`).
- A 500 never leaks the original message or stack to the client; it is logged with
  Nest's `Logger`.
- No extra field (`statusCode`, `error`, `timestamp`, `translationCode`) — adding one is
  a contract change for the front; agree on it first.
- Typed by `ErrorResponse` (`src/common/filters/error-response.ts`); API tests assert the
  exact body with `toEqual({ message })` ([[api-tests]]).
