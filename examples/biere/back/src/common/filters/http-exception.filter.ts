import { Catch, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import { ERROR_MESSAGE_SEPARATOR, INTERNAL_ERROR_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import type { ErrorResponse } from "@/common/filters/error-response";

const readMessage = (exception: HttpException): string => {
  const body = exception.getResponse();
  if (typeof body === "string") {
    return body;
  }
  const message: unknown = (body as { message?: unknown }).message;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message.map(String).join(ERROR_MESSAGE_SEPARATOR);
  }
  return exception.message;
};

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
