import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";
import { ERROR_MESSAGE_SEPARATOR } from "@/common/exceptions/exception-messages.constants";

const collectMessages = (error: ValidationError): string[] => [
  ...Object.values(error.constraints ?? {}),
  ...(error.children ?? []).flatMap(collectMessages),
];

export const createValidationException = (errors: ValidationError[]): BadRequestException =>
  new BadRequestException(errors.flatMap(collectMessages).join(ERROR_MESSAGE_SEPARATOR));
