import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";

export interface BadgeDto {
  readonly id: string;
  readonly kind: BadgeKindEnum;
  readonly family: BeerFamilyEnum | null;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
  readonly current: number;
  readonly target: number;
  readonly comingSoon: boolean;
}
