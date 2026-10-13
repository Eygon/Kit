import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import type { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import type { BeerStatusEnum } from "@/types/enums/beer/beerStatusEnum";

export interface BeerQuery {
  search: string;
  family: BeerFamilyEnum | null;
  styleIds: number[];
  countries: string[];
  formats: BeerFormatEnum[];
  abvMin: number | null;
  abvMax: number | null;
  status: BeerStatusEnum | null;
  sort: BeerSortEnum;
}
