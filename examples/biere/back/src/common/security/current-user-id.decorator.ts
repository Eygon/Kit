import { createParamDecorator, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import type { AuthenticatedRequest } from "@/common/security/authenticated-request";

export const readCurrentUserId = (_data: unknown, context: ExecutionContext): number => {
  const { currentUserId } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (currentUserId === undefined) {
    throw new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE);
  }
  return currentUserId;
};

export const CurrentUserId = createParamDecorator(readCurrentUserId);
