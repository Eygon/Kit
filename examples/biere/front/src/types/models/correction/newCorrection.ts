import type { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";

export interface NewCorrection {
  characteristic: BeerCharacteristicEnum;
  value: CharacteristicValue;
  reason: string;
}
