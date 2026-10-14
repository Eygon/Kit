import type { DiscoveryCountDto } from "@/modules/tastings/dtos/discovery-count.dto";

export interface RawDiscoveryCountRow {
  readonly userId: number | string;
  readonly discoveredCount: number | string;
}

export const toDiscoveryCountDto = (row: RawDiscoveryCountRow): DiscoveryCountDto => ({
  userId: Number(row.userId),
  discoveredCount: Number(row.discoveredCount),
});
