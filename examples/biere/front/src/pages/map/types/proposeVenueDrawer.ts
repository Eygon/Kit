import type { GeoPosition } from "@/types/models/venue/geoPosition";

export type ProposeVenueDrawerProps = Readonly<{
  position: GeoPosition | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: () => void;
}>;
