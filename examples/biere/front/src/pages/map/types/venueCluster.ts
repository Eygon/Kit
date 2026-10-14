import type { Venue } from "@/types/models/venue/venue";

export type VenueCluster = Readonly<{ key: string; venues: Venue[]; latitude: number; longitude: number }>;
