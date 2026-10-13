import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { FacetCount } from "@/types/models/beer/facetCount";

export type FamilyChipsProps = Readonly<{
  families: FacetCount<BeerFamilyEnum>[];
  selectedFamily: BeerFamilyEnum | null;
  onFamilyChange: (family: BeerFamilyEnum | null) => void;
}>;
