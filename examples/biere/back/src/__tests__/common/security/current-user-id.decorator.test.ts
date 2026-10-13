import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { readCurrentUserId } from "@/common/security/current-user-id.decorator";

const contextFor = (currentUserId?: number): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => ({ currentUserId }) }) }) as unknown as ExecutionContext;

describe("readCurrentUserId", () => {
  it("returns the user id resolved by the guard", () => {
    expect(readCurrentUserId(undefined, contextFor(2))).toBe(2);
  });

  it("throws 401 when the guard did not run (public route)", () => {
    expect(() => readCurrentUserId(undefined, contextFor())).toThrow(UnauthorizedException);
  });
});
