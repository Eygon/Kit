import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";

describe("HttpStatusCodeEnum", () => {
  it("maps the statuses the backend emits", () => {
    expect([
      HttpStatusCodeEnum.OK,
      HttpStatusCodeEnum.CREATED,
      HttpStatusCodeEnum.NO_CONTENT,
      HttpStatusCodeEnum.BAD_REQUEST,
      HttpStatusCodeEnum.UNAUTHORIZED,
      HttpStatusCodeEnum.FORBIDDEN,
      HttpStatusCodeEnum.NOT_FOUND,
      HttpStatusCodeEnum.CONFLICT,
      HttpStatusCodeEnum.PAYLOAD_TOO_LARGE,
      HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
    ]).toEqual([200, 201, 204, 400, 401, 403, 404, 409, 413, 500]);
  });
});
