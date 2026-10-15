import type { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";

export type ProposeCorrectionSheetProps = Readonly<{
  beerId: number;
  characteristic: BeerCharacteristicEnum;
  currentValue: CharacteristicValue | null;
}>;
