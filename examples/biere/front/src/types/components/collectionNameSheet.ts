import type { CollectionNameSheetModeEnum } from "@/types/enums/collection/collectionNameSheetModeEnum";
import type { CollectionSummary } from "@/types/models/collection/collectionSummary";

export type CollectionNameSheetProps = Readonly<{
  mode?: CollectionNameSheetModeEnum;
  initialName?: string;
  customCollectionCount?: number;
  isPending: boolean;
  onSave: (name: string) => Promise<CollectionSummary | null>;
}>;
