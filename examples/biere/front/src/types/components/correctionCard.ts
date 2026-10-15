import type { Correction } from "@/types/models/correction/correction";

export type CorrectionCardProps = Readonly<{
  correction: Correction;
  isBeerShown?: boolean;
}>;
