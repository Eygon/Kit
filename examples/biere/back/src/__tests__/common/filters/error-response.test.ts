import { describe, expectTypeOf, it } from "vitest";
import type { ErrorResponse } from "@/common/filters/error-response";

describe("ErrorResponse", () => {
  it("carries a single readonly message string", () => {
    expectTypeOf<ErrorResponse>().toEqualTypeOf<{ readonly message: string }>();
  });
});
