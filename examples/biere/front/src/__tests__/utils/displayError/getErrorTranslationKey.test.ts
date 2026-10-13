import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { getErrorTranslationKey } from "@/utils/displayError/getErrorTranslationKey";

describe("getErrorTranslationKey", () => {
  it.each([
    [HttpStatusCodeEnum.BAD_REQUEST, "errors.badRequest"],
    [HttpStatusCodeEnum.UNAUTHORIZED, "errors.unauthorized"],
    [HttpStatusCodeEnum.FORBIDDEN, "errors.forbidden"],
    [HttpStatusCodeEnum.NOT_FOUND, "errors.notFound"],
    [HttpStatusCodeEnum.CONFLICT, "errors.conflict"],
    [HttpStatusCodeEnum.PAYLOAD_TOO_LARGE, "errors.payloadTooLarge"],
    [HttpStatusCodeEnum.INTERNAL_SERVER_ERROR, "errors.generic"],
  ])("maps the status %s to %s", (status, key) => {
    expect(getErrorTranslationKey(new HttpError(status, "failure"))).toBe(key);
  });

  it("falls back to the generic key for an error that is not an HttpError", () => {
    expect(getErrorTranslationKey(new Error("boom"))).toBe("errors.generic");
  });
});
