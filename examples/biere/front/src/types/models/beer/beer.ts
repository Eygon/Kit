import type { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import type { CriterionAverage } from "@/types/models/beer/criterionAverage";
import type { LevelRange } from "@/types/models/beer/levelRange";
import type { RatingBucket } from "@/types/models/beer/ratingBucket";

export interface Beer {
  id: number;
  name: string;
  breweryName: string;
  country: string;
  styleId: number;
  styleName: string;
  family: BeerFamilyEnum | null;
  abv: number;
  aromas: BeerAromaEnum[];
  formats: BeerFormatEnum[];
  description: string;
  drunk: boolean;
  checkinCount: number;
  inWishlist: boolean;
  bitternessLevel: number | null;
  colorLevel: number | null;
  styleColorRange: LevelRange | null;
  averageRating: number | null;
  reviewCount: number;
  ratingDistribution: RatingBucket[];
  criteria: CriterionAverage[];
}
