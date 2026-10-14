import { describe, expectTypeOf, it } from "vitest";
import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import type { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";

describe("BadgeDto", () => {
  it("exposes every badge field as readonly, with a nullable family and unlock date", () => {
    expectTypeOf<BadgeDto>().toEqualTypeOf<{
      readonly id: string;
      readonly kind: BadgeKindEnum;
      readonly family: BeerFamilyEnum | null;
      readonly unlocked: boolean;
      readonly unlockedAt: string | null;
      readonly current: number;
      readonly target: number;
      readonly comingSoon: boolean;
    }>();
  });
});
