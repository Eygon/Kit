import type { CollectionSummary } from "@/types/models/collection/collectionSummary";

export type CollectionsSectionProps = Readonly<{
  userId: number;
  ownerName?: string;
  collections: readonly CollectionSummary[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
}>;
