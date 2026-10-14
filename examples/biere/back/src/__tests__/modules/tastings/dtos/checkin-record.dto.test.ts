import { describe, expectTypeOf, it } from "vitest";
import type { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";

describe("CheckinRecordDto", () => {
  it("exposes every check-in field as readonly, with nullable venue, rating, price and photo", () => {
    expectTypeOf<CheckinRecordDto>().toEqualTypeOf<{
      readonly id: number;
      readonly userId: number;
      readonly beerId: number;
      readonly drankAt: string;
      readonly place: string;
      readonly venueId: number | null;
      readonly rating: number | null;
      readonly aromas: readonly BeerAromaEnum[];
      readonly format: BeerFormatEnum;
      readonly price: number | null;
      readonly comment: string;
      readonly photoId: string | null;
    }>();
  });
});
