import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";

export type WishlistSectionProps = Readonly<{
  items: WishlistItem[];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onRemove: (beerId: number) => void;
  pendingBeerId: number | null;
}>;
