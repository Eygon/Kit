import { describe, expectTypeOf, it } from "vitest";
import type { CountryCountDto } from "@/modules/profile/dtos/country-count.dto";

describe("CountryCountDto", () => {
  it("exposes the country code and its beer count as readonly", () => {
    expectTypeOf<CountryCountDto>().toEqualTypeOf<{
      readonly country: string;
      readonly count: number;
    }>();
  });
});
