import type { CharacteristicFormValue } from "@/types/components/characteristicFormValue";

export type CorrectionFormValues = {
  value: CharacteristicFormValue;
  reason: string;
};

export type CorrectionFormErrorKeys = Partial<Record<keyof CorrectionFormValues, string>>;
