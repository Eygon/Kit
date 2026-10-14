import { describe, expectTypeOf, it } from "vitest";
import type { MonthlyCountDto } from "@/modules/profile/dtos/monthly-count.dto";

describe("MonthlyCountDto", () => {
  it("exposes the Paris month key and its check-in count as readonly", () => {
    expectTypeOf<MonthlyCountDto>().toEqualTypeOf<{
      readonly month: string;
      readonly count: number;
    }>();
  });
});
