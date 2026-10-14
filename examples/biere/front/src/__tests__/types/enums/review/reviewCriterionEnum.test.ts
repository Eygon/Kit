import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import {
  REVIEW_CRITERIA,
  REVIEW_CRITERION_LABEL_KEYS,
  REVIEW_CRITERION_LEVEL_LABEL_KEYS,
  REVIEW_CRITERION_MIN_COUNT,
  ReviewCriterionEnum,
  isReviewCriterion,
} from "@/types/enums/review/reviewCriterionEnum";

const readKey = (locale: unknown, path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], locale);

const FR_LEVEL_LABELS = {
  sweetness: ["Très sèche", "Sèche", "Équilibrée", "Douce", "Très douce"],
  acidity: ["Nulle", "Légère", "Moyenne", "Vive", "Très vive"],
  body: ["Très léger", "Léger", "Moyen", "Rond", "Très plein"],
};

describe("ReviewCriterionEnum", () => {
  it("carries the contract values verbatim", () => {
    expect(Object.values(ReviewCriterionEnum)).toEqual(["sweetness", "acidity", "body"]);
    expect(ReviewCriterionEnum.SWEETNESS).toBe("sweetness");
    expect(ReviewCriterionEnum.ACIDITY).toBe("acidity");
    expect(ReviewCriterionEnum.BODY).toBe("body");
  });

  it("orders the criteria sweetness, acidity, body", () => {
    expect(REVIEW_CRITERIA).toEqual(["sweetness", "acidity", "body"]);
  });

  it("accepts every contract criterion and rejects anything else", () => {
    REVIEW_CRITERIA.forEach((value) => expect(isReviewCriterion(value)).toBe(true));
    ["", "Sweetness", "bitterness", 1, null, undefined].forEach((value) => expect(isReviewCriterion(value)).toBe(false));
  });

  it("maps every criterion to a translated name key", () => {
    REVIEW_CRITERIA.forEach((criterion) => {
      const key = REVIEW_CRITERION_LABEL_KEYS[criterion];

      expect(key).toBe(`beer.criteria.${criterion}.name`);
      expect(readKey(fr, key)).toEqual(expect.any(String));
      expect(readKey(en, key)).toEqual(expect.any(String));
    });
    expect(readKey(fr, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.SWEETNESS])).toBe("Douceur");
    expect(readKey(fr, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.ACIDITY])).toBe("Acidité");
    expect(readKey(fr, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.BODY])).toBe("Corps");
    expect(readKey(en, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.SWEETNESS])).toBe("Sweetness");
    expect(readKey(en, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.ACIDITY])).toBe("Acidity");
    expect(readKey(en, REVIEW_CRITERION_LABEL_KEYS[ReviewCriterionEnum.BODY])).toBe("Body");
  });

  it("maps every criterion to five translated level keys, level 1 first", () => {
    REVIEW_CRITERIA.forEach((criterion) => {
      const keys = REVIEW_CRITERION_LEVEL_LABEL_KEYS[criterion];

      expect(keys).toEqual([1, 2, 3, 4, 5].map((level) => `beer.criteria.${criterion}.levels.${level}`));
      expect(keys.map((key) => readKey(fr, key))).toEqual(FR_LEVEL_LABELS[criterion]);
      keys.forEach((key) => {
        expect(readKey(en, key)).toEqual(expect.any(String));
        expect(readKey(en, key)).not.toBe("");
      });
    });
  });

  it("exposes the three-review threshold constant", () => {
    expect(REVIEW_CRITERION_MIN_COUNT).toBe(3);
  });
});
