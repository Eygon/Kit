import { describe, expect, it } from "vitest";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BadgeKindEnum } from "@/modules/profile/enums/badge-kind.enum";
import { toBadgeDto } from "@/modules/profile/mappers/badge.mapper";

describe("toBadgeDto", () => {
  it("uses the kind as id and unlocks a badge that has a date", () => {
    expect(
      toBadgeDto({
        kind: BadgeKindEnum.EXPLORER,
        family: null,
        current: 10,
        target: 10,
        unlockedAt: "2026-03-14T18:30:00.000Z",
        comingSoon: false,
      }),
    ).toStrictEqual({
      id: "explorer",
      kind: "explorer",
      family: null,
      unlocked: true,
      unlockedAt: "2026-03-14T18:30:00.000Z",
      current: 10,
      target: 10,
      comingSoon: false,
    });
  });

  it("prefixes the family to the id of a specialist badge", () => {
    expect(
      toBadgeDto({
        kind: BadgeKindEnum.SPECIALIST,
        family: BeerFamilyEnum.PORTER,
        current: 1,
        target: 2,
        unlockedAt: null,
        comingSoon: false,
      }),
    ).toStrictEqual({
      id: "specialist-porter",
      kind: "specialist",
      family: "porter",
      unlocked: false,
      unlockedAt: null,
      current: 1,
      target: 2,
      comingSoon: false,
    });
  });

  it("keeps the coming soon flag of a locked badge", () => {
    expect(
      toBadgeDto({
        kind: BadgeKindEnum.CARTOGRAPHER,
        family: null,
        current: 0,
        target: 1,
        unlockedAt: null,
        comingSoon: true,
      }),
    ).toStrictEqual({
      id: "cartographer",
      kind: "cartographer",
      family: null,
      unlocked: false,
      unlockedAt: null,
      current: 0,
      target: 1,
      comingSoon: true,
    });
  });
});
