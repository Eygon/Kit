import type { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { BadgeDto } from "@/modules/profile/dtos/badge.dto";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";
import { SPECIALIST_ID_PREFIX } from "@/modules/profile/profile.constants";

interface BadgeSource {
  readonly kind: BadgeKindEnum;
  readonly family: BeerFamilyEnum | null;
  readonly current: number;
  readonly target: number;
  readonly unlockedAt: string | null;
  readonly comingSoon: boolean;
}

export const toBadgeDto = (source: BadgeSource): BadgeDto => ({
  id: source.kind === BadgeKindEnum.SPECIALIST ? `${SPECIALIST_ID_PREFIX}${source.family}` : source.kind,
  kind: source.kind,
  family: source.family,
  unlocked: source.unlockedAt !== null,
  unlockedAt: source.unlockedAt,
  current: source.current,
  target: source.target,
  comingSoon: source.comingSoon,
});
