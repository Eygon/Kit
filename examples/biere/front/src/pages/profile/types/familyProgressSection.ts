import type { Dex } from "@/types/models/dex/dex";

export type FamilyProgressSectionProps = Readonly<{
  dex: Dex | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}>;
