import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { BADGE_KIND_CRITERION_KEYS, BADGE_KIND_LABEL_KEYS, BadgeKindEnum, isBadgeKind } from "@/types/enums/badge/badgeKindEnum";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

describe("BadgeKindEnum", () => {
  it("carries the ten contract values verbatim, in the contract order", () => {
    expect(Object.values(BadgeKindEnum)).toEqual([
      "firstSip",
      "explorer",
      "collector",
      "completionist",
      "globetrotter",
      "specialist",
      "photographer",
      "regular",
      "sentinel",
      "cartographer",
    ]);
  });

  it("accepts every contract kind and rejects anything else", () => {
    Object.values(BadgeKindEnum).forEach((value) => expect(isBadgeKind(value)).toBe(true));
    ["", "FirstSip", "legend", "lager", 1, null, undefined].forEach((value) => expect(isBadgeKind(value)).toBe(false));
  });

  it("maps every kind to its name and criterion keys", () => {
    Object.values(BadgeKindEnum).forEach((value) => {
      expect(BADGE_KIND_LABEL_KEYS[value]).toBe(`pages.profile.badges.kinds.${value}.name`);
      expect(BADGE_KIND_CRITERION_KEYS[value]).toBe(`pages.profile.badges.kinds.${value}.criterion`);
    });
  });

  it("has a translated name and criterion in both locales for every kind", () => {
    Object.values(BadgeKindEnum).forEach((value) => {
      [BADGE_KIND_LABEL_KEYS[value], BADGE_KIND_CRITERION_KEYS[value]].forEach((key) => {
        expect(readKey(fr, key)).toEqual(expect.any(String));
        expect(readKey(fr, key)).not.toBe("");
        expect(readKey(en, key)).toEqual(expect.any(String));
        expect(readKey(en, key)).not.toBe("");
      });
    });
  });
});
