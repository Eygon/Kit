import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import type { AuthenticatedRequest } from "@/common/security/authenticated-request";
import { parseUserId } from "@/common/security/parse-user-id";
import { IS_PUBLIC_KEY, USER_ID_HEADER } from "@/common/security/security.constants";
import { UsersService } from "@/modules/users/users.service";

@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = parseUserId(request.headers[USER_ID_HEADER]);
    if (userId === null || !(await this.usersService.isKnownUser(userId))) {
      throw new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE);
    }
    request.currentUserId = userId;
    return true;
  }
}
