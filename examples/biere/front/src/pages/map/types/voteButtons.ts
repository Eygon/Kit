import type { VenueBeer } from "@/types/models/venue/venueBeer";

export type VoteButtonsProps = Readonly<{
  venueId: number;
  venueBeer: VenueBeer;
}>;
