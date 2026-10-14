import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";

export const getErrorTranslationKey = (error: unknown): string => {
  if (!(error instanceof HttpError)) return "errors.generic";
  switch (error.status) {
    case HttpStatusCodeEnum.BAD_REQUEST:
      return "errors.badRequest";
    case HttpStatusCodeEnum.UNAUTHORIZED:
      return "errors.unauthorized";
    case HttpStatusCodeEnum.FORBIDDEN:
      return "errors.forbidden";
    case HttpStatusCodeEnum.NOT_FOUND:
      return "errors.notFound";
    case HttpStatusCodeEnum.CONFLICT:
      return "errors.conflict";
    case HttpStatusCodeEnum.PAYLOAD_TOO_LARGE:
      return "errors.payloadTooLarge";
    case HttpStatusCodeEnum.TOO_MANY_REQUESTS:
      return "errors.tooManyRequests";
    default:
      return "errors.generic";
  }
};
