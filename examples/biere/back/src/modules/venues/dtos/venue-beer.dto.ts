import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { AvailabilityStatusEnum } from "@/modules/venues/enums/availability-status.enum";

export interface VenueBeerDto {
  readonly beerId: number;
  readonly beerName: string;
  readonly breweryName: string;
  readonly styleName: string;
  readonly family: BeerFamilyEnum;
  readonly status: AvailabilityStatusEnum;
  readonly lastConfirmedAt: string | null;
  readonly recentVoterCount: number;
  readonly nextVoteAt: string | null;
  readonly drunk: boolean;
  readonly checkinCount: number;
  readonly lastCheckinAt: string | null;
}
