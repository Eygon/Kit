import { BadgeKindEnum } from "@/types/enums/badge/badgeKindEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { badgeDtosToModels } from "@/types/mappers/badge/badgeMapper";

const base = { unlocked: false, unlockedAt: null, current: 0, target: 1, comingSoon: false };

describe("badgeDtosToModels", () => {
  it("copies every field of a known badge and types its kind", () => {
    const [badge] = badgeDtosToModels([
      { id: "regular", kind: "regular", family: null, unlocked: true, unlockedAt: "2026-05-10T08:15:00.000Z", current: 3, target: 3, comingSoon: false },
    ]);

    expect(badge).toEqual({
      id: "regular",
      kind: BadgeKindEnum.REGULAR,
      family: null,
      unlocked: true,
      unlockedAt: "2026-05-10T08:15:00.000Z",
      current: 3,
      target: 3,
      comingSoon: false,
    });
  });

  it("keeps the order received and the coming soon flag", () => {
    const badges = badgeDtosToModels([
      { ...base, id: "cartographer", kind: "cartographer", family: null, comingSoon: true },
      { ...base, id: "firstSip", kind: "firstSip", family: null },
    ]);

    expect(badges.map((badge) => badge.kind)).toEqual([BadgeKindEnum.CARTOGRAPHER, BadgeKindEnum.FIRST_SIP]);
    expect(badges[0].comingSoon).toBe(true);
    expect(badges[1].comingSoon).toBe(false);
  });

  it("drops a badge whose kind the client does not know and keeps the others", () => {
    const badges = badgeDtosToModels([
      { ...base, id: "firstSip", kind: "firstSip", family: null },
      { ...base, id: "legend", kind: "legend", family: null },
      { ...base, id: "sentinel", kind: "sentinel", family: null },
    ]);

    expect(badges.map((badge) => badge.id)).toEqual(["firstSip", "sentinel"]);
  });

  it("types the family of a specialist badge", () => {
    const [badge] = badgeDtosToModels([{ ...base, id: "specialist-ipa", kind: "specialist", family: "ipa", target: 14 }]);

    expect(badge.family).toBe(BeerFamilyEnum.IPA);
  });

  it("turns a family the client does not know into null without dropping the badge", () => {
    const badges = badgeDtosToModels([{ ...base, id: "specialist-mead", kind: "specialist", family: "mead" }]);

    expect(badges).toHaveLength(1);
    expect(badges[0].family).toBeNull();
  });

  it("maps an empty list to an empty list", () => {
    expect(badgeDtosToModels([])).toEqual([]);
  });
});
