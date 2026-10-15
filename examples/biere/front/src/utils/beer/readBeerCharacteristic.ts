import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { Beer } from "@/types/models/beer/beer";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";

const nonEmptyOrNull = (values: string[]): string[] | null => (values.length === 0 ? null : values);

export const readBeerCharacteristic = (beer: Beer, characteristic: BeerCharacteristicEnum): CharacteristicValue | null => {
  switch (characteristic) {
    case BeerCharacteristicEnum.ABV:
      return beer.abv;
    case BeerCharacteristicEnum.IBU:
      return beer.ibu;
    case BeerCharacteristicEnum.EBC:
      return beer.ebc;
    case BeerCharacteristicEnum.SWEETNESS:
      return beer.sweetness;
    case BeerCharacteristicEnum.ACIDITY:
      return beer.acidity;
    case BeerCharacteristicEnum.BODY:
      return beer.body;
    case BeerCharacteristicEnum.AROMAS:
      return nonEmptyOrNull(beer.aromas);
    case BeerCharacteristicEnum.FORMATS:
      return nonEmptyOrNull(beer.formats);
  }
};
