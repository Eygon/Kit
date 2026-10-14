import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { isConflictError } from "@/utils/httpError/isConflictError";

describe("isConflictError", () => {
  it("is true for an HttpError with the conflict status", () => {
    expect(
      isConflictError(new HttpError(HttpStatusCodeEnum.CONFLICT, "Conflict")),
    ).toBe(true);
  });

  it("is false for an HttpError with another status", () => {
    expect(
      isConflictError(new HttpError(HttpStatusCodeEnum.NOT_FOUND, "Not Found")),
    ).toBe(false);
  });

  it("is false for an error that is not an HttpError", () => {
    expect(isConflictError(new Error("Conflict"))).toBe(false);
    expect(isConflictError(HttpStatusCodeEnum.CONFLICT)).toBe(false);
  });
});
