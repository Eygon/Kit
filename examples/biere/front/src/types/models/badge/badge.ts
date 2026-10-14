import type { BadgeKindEnum } from "@/types/enums/badge/badgeKindEnum";
import type { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";

export interface Badge {
  id: string;
  kind: BadgeKindEnum;
  family: BeerFamilyEnum | null;
  unlocked: boolean;
  unlockedAt: string | null;
  current: number;
  target: number;
  comingSoon: boolean;
}
