import type { Request } from "express";
import { describe, expectTypeOf, it } from "vitest";
import type { AuthenticatedRequest } from "@/common/security/authenticated-request";

describe("AuthenticatedRequest", () => {
  it("is an express request carrying the optional resolved user id", () => {
    expectTypeOf<AuthenticatedRequest>().toExtend<Request>();
    expectTypeOf<AuthenticatedRequest["currentUserId"]>().toEqualTypeOf<number | undefined>();
  });
});
