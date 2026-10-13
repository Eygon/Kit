import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

export type StyleFilterSectionProps = Readonly<{
  family: BeerFamilyEnum | null;
  styleIds: number[];
  onFamilyChange: (family: BeerFamilyEnum | null) => void;
  onStyleIdsChange: (styleIds: number[]) => void;
}>;
