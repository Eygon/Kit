import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequest } from "@/common/security/authenticated-request";
import { CurrentUserGuard } from "@/common/security/current-user.guard";

const contextFor = (request: Partial<AuthenticatedRequest>): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const guardWith = (isPublic: boolean | undefined): CurrentUserGuard => {
  const reflector = new Reflector();
  vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(isPublic);
  return new CurrentUserGuard(reflector);
};

describe("CurrentUserGuard", () => {
  it("lets a public route through without any header", () => {
    expect(guardWith(true).canActivate(contextFor({ headers: {} }))).toBe(true);
  });

  it("stores the parsed user id on the request", () => {
    const request: Partial<AuthenticatedRequest> = { headers: { "x-user-id": "3" } };

    expect(guardWith(undefined).canActivate(contextFor(request))).toBe(true);
    expect(request.currentUserId).toBe(3);
  });

  it.each([{}, { "x-user-id": "abc" }, { "x-user-id": "0" }, { "x-user-id": "-4" }])(
    "throws 401 for headers %j",
    (headers) => {
      expect(() => guardWith(false).canActivate(contextFor({ headers }))).toThrow(UnauthorizedException);
    },
  );
});
