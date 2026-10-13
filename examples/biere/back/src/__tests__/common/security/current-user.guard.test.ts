import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import type { AuthenticatedRequest } from "@/common/security/authenticated-request";
import { CurrentUserGuard } from "@/common/security/current-user.guard";
import type { UsersService } from "@/modules/users/users.service";

const contextFor = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe("CurrentUserGuard", () => {
  const usersService = { isKnownUser: vi.fn() };

  const guardWith = (isPublic: boolean | undefined): CurrentUserGuard => {
    const reflector = new Reflector();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(isPublic);
    return new CurrentUserGuard(reflector, usersService as unknown as UsersService);
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lets a public route through without any header and without asking the users service", async () => {
    expect(await guardWith(true).canActivate(contextFor({ headers: {} }))).toBe(true);
    expect(usersService.isKnownUser).not.toHaveBeenCalled();
  });

  it("stores the parsed user id on the request when the user is known", async () => {
    usersService.isKnownUser.mockResolvedValue(true);
    const request: Partial<AuthenticatedRequest> = { headers: { "x-user-id": "3" } };

    expect(await guardWith(undefined).canActivate(contextFor(request))).toBe(true);
    expect(request.currentUserId).toBe(3);
    expect(usersService.isKnownUser).toHaveBeenCalledWith(3);
  });

  it.each([{}, { "x-user-id": "abc" }, { "x-user-id": "0" }, { "x-user-id": "-4" }])(
    "throws 401 for headers %j without asking the users service",
    async (headers) => {
      await expect(guardWith(false).canActivate(contextFor({ headers }))).rejects.toThrow(
        new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE),
      );
      expect(usersService.isKnownUser).not.toHaveBeenCalled();
    },
  );

  it("throws 401 with the canonical message for a well-formed but unknown user and leaves the request untouched", async () => {
    usersService.isKnownUser.mockResolvedValue(false);
    const request: Partial<AuthenticatedRequest> = { headers: { "x-user-id": "99" } };

    await expect(guardWith(undefined).canActivate(contextFor(request))).rejects.toThrow(
      new UnauthorizedException(UNIDENTIFIED_USER_MESSAGE),
    );
    expect(usersService.isKnownUser).toHaveBeenCalledWith(99);
    expect(request.currentUserId).toBeUndefined();
  });
});
