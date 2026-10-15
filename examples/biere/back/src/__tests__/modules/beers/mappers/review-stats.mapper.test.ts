import { describe, expect, it } from "vitest";
import { toRatingSummaryDto, toReviewStatsDto } from "@/modules/beers/mappers/review-stats.mapper";

describe("toRatingSummaryDto", () => {
  it("keeps the beer id, the average and the count", () => {
    expect(toRatingSummaryDto({ beerId: 4, averageRating: 4.3, reviewCount: 2 })).toStrictEqual({
      beerId: 4,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });

  it("converts values returned as strings into numbers", () => {
    expect(toRatingSummaryDto({ beerId: "4", averageRating: "4.3", reviewCount: "2" })).toStrictEqual({
      beerId: 4,
      averageRating: 4.3,
      reviewCount: 2,
    });
  });
});

describe("toReviewStatsDto", () => {
  it("completes the missing bars with 0 and orders them from 1 to 5 stars", () => {
    const stats = toReviewStatsDto([{ stars: 5, count: 1 }, { stars: 1, count: "2" }, { stars: 3, count: 1 }]);

    expect(stats.ratingDistribution).toStrictEqual([
      { stars: 1, count: 2 },
      { stars: 2, count: 0 },
      { stars: 3, count: 1 },
      { stars: 4, count: 0 },
      { stars: 5, count: 1 },
    ]);
  });

  it("answers five bars at 0 without any row", () => {
    expect(toReviewStatsDto([]).ratingDistribution).toStrictEqual(
      [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 })),
    );
  });

  it("answers the distribution alone, without any criterion", () => {
    expect(toReviewStatsDto([{ stars: 2, count: 1 }])).toStrictEqual({
      ratingDistribution: [
        { stars: 1, count: 0 },
        { stars: 2, count: 1 },
        { stars: 3, count: 0 },
        { stars: 4, count: 0 },
        { stars: 5, count: 0 },
      ],
    });
  });
});
