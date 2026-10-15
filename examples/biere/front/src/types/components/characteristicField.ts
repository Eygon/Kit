import type { CharacteristicFormValue } from "@/types/components/characteristicFormValue";
import type { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";

export type CharacteristicFieldProps = Readonly<{
  characteristic: BeerCharacteristicEnum;
  value: CharacteristicFormValue;
  onChange: (value: CharacteristicFormValue) => void;
  isRequired: boolean;
  errorMessage: string | null;
}>;
