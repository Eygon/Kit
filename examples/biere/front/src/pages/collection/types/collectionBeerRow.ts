import type { CollectionBeer } from "@/types/models/collection/collectionBeer";

export type CollectionBeerRowProps = Readonly<{
  beer: CollectionBeer;
  onRemove?: () => void;
  isRemoving?: boolean;
}>;
