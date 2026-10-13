import { ValidationPipe } from "@nestjs/common";
import { createValidationException } from "@/common/exceptions/validation-exception.factory";

export const createValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: createValidationException,
  });
