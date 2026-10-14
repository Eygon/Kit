import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";

export const isConflictError = (error: unknown): boolean =>
  error instanceof HttpError && error.status === HttpStatusCodeEnum.CONFLICT;
