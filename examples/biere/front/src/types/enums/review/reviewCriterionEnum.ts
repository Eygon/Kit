export enum ReviewCriterionEnum {
  SWEETNESS = "sweetness",
  ACIDITY = "acidity",
  BODY = "body",
}

export const REVIEW_CRITERIA: readonly ReviewCriterionEnum[] = [
  ReviewCriterionEnum.SWEETNESS,
  ReviewCriterionEnum.ACIDITY,
  ReviewCriterionEnum.BODY,
];

export const REVIEW_CRITERION_MIN_COUNT = 3;

export const REVIEW_CRITERION_LABEL_KEYS: Record<ReviewCriterionEnum, string> = {
  [ReviewCriterionEnum.SWEETNESS]: "beer.criteria.sweetness.name",
  [ReviewCriterionEnum.ACIDITY]: "beer.criteria.acidity.name",
  [ReviewCriterionEnum.BODY]: "beer.criteria.body.name",
};

export const REVIEW_CRITERION_LEVEL_LABEL_KEYS: Record<ReviewCriterionEnum, readonly string[]> = {
  [ReviewCriterionEnum.SWEETNESS]: [
    "beer.criteria.sweetness.levels.1",
    "beer.criteria.sweetness.levels.2",
    "beer.criteria.sweetness.levels.3",
    "beer.criteria.sweetness.levels.4",
    "beer.criteria.sweetness.levels.5",
  ],
  [ReviewCriterionEnum.ACIDITY]: [
    "beer.criteria.acidity.levels.1",
    "beer.criteria.acidity.levels.2",
    "beer.criteria.acidity.levels.3",
    "beer.criteria.acidity.levels.4",
    "beer.criteria.acidity.levels.5",
  ],
  [ReviewCriterionEnum.BODY]: [
    "beer.criteria.body.levels.1",
    "beer.criteria.body.levels.2",
    "beer.criteria.body.levels.3",
    "beer.criteria.body.levels.4",
    "beer.criteria.body.levels.5",
  ],
};

export const isReviewCriterion = (value: unknown): value is ReviewCriterionEnum =>
  typeof value === "string" && Object.values<string>(ReviewCriterionEnum).includes(value);
