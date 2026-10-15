import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import * as constants from "@/modules/beers/beers.constants";
import { Review } from "@/modules/beers/entities/review.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("Review entity", () => {
  it("maps the reviews table with its columns, its unique pair, its read index and no relation", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Review])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(Review);

    expect(metadata.tableName).toBe("reviews");
    expect(metadata.columns.map((column) => column.propertyName).sort()).toEqual(
      ["acidity", "beerId", "body", "createdAt", "id", "rating", "sweetness", "text", "updatedAt", "userId"].sort(),
    );
    const byName = (name: string) => metadata.columns.find((column) => column.propertyName === name);
    expect(byName("userId")?.type).toBe("integer");
    expect(byName("beerId")?.type).toBe("integer");
    expect(byName("rating")?.type).toBe("real");
    expect(byName("rating")?.isNullable).toBe(false);
    expect(byName("text")?.type).toBe("varchar");
    expect(byName("text")?.length).toBe("500");
    expect(byName("text")?.isNullable).toBe(false);
    for (const criterion of ["sweetness", "acidity", "body"]) {
      expect(byName(criterion)?.type).toBe("integer");
      expect(byName(criterion)?.isNullable).toBe(true);
    }
    expect(byName("createdAt")?.type).toBe("datetime");
    expect(byName("updatedAt")?.type).toBe("datetime");
    expect(byName("createdAt")?.isCreateDate).toBe(false);
    expect(byName("updatedAt")?.isUpdateDate).toBe(false);
    expect(metadata.uniques.map((unique) => unique.columns.map((column) => column.propertyName))).toEqual([
      ["userId", "beerId"],
    ]);
    expect(metadata.indices.map((index) => index.columns.map((column) => column.propertyName))).toEqual([
      ["beerId", "updatedAt"],
    ]);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });

  it("exposes the review limits as named constants", async () => {
    expect(constants.REVIEW_RATING_MIN).toBe(1);
    expect(constants.REVIEW_RATING_MAX).toBe(5);
    expect(constants.REVIEW_RATING_STEP).toBe(0.5);
    expect(constants.REVIEW_TEXT_MAX_LENGTH).toBe(500);
  });
});
