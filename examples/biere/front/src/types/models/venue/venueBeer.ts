import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { AvailabilityStatusEnum } from "@/types/enums/venue/availabilityStatusEnum";

export interface VenueBeer {
  beerId: number;
  beerName: string;
  breweryName: string;
  styleName: string;
  family: BeerFamilyEnum | null;
  status: AvailabilityStatusEnum;
  lastConfirmedAt: Date | null;
  recentVoterCount: number;
  nextVoteAt: Date | null;
  drunk: boolean;
  checkinCount: number;
  lastCheckinAt: Date | null;
}
