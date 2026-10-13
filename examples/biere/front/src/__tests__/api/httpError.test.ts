import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";

describe("HttpError", () => {
  it("carries the status and the message", () => {
    const error = new HttpError(HttpStatusCodeEnum.NOT_FOUND, "Not Found");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("HttpError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not Found");
  });
});
