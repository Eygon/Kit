import type { BadgeDto } from "@/types/dtos/badge/badgeDto";
import { isBadgeKind } from "@/types/enums/badge/badgeKindEnum";
import { isBeerFamily } from "@/types/enums/beer/beerFamilyEnum";
import type { Badge } from "@/types/models/badge/badge";

export const badgeDtosToModels = (dtos: BadgeDto[]): Badge[] =>
  dtos.flatMap((dto) =>
    isBadgeKind(dto.kind)
      ? [
          {
            id: dto.id,
            kind: dto.kind,
            family: isBeerFamily(dto.family) ? dto.family : null,
            unlocked: dto.unlocked,
            unlockedAt: dto.unlockedAt,
            current: dto.current,
            target: dto.target,
            comingSoon: dto.comingSoon,
          },
        ]
      : [],
  );
