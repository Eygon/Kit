import type { Checkin } from "@/types/models/checkin/checkin";

export interface CreatedCheckin {
  checkin: Checkin;
  isFirstDiscovery: boolean;
}
