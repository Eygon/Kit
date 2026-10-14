import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_BEERS_MAX,
  COLLECTION_NAME_MAX_LENGTH,
  COLLECTIONS_PER_USER_MAX,
  NEW_COLLECTION_BEER_COUNT,
} from "@/modules/collections/collections.constants";
import { Collection } from "@/modules/collections/entities/collection.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("collections constants", () => {
  it("exposes the limits of the feature", () => {
    expect(COLLECTION_NAME_MAX_LENGTH).toBe(40);
    expect(COLLECTIONS_PER_USER_MAX).toBe(20);
    expect(COLLECTION_BEERS_MAX).toBe(200);
    expect(NEW_COLLECTION_BEER_COUNT).toBe(0);
  });
});

describe("Collection entity", () => {
  it("maps the collections table with a name unique per user and a creation date", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Collection])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(Collection);
    const column = (name: string) => metadata.columns.find((candidate) => candidate.propertyName === name);

    expect(metadata.tableName).toBe("collections");
    expect(metadata.columns.map((candidate) => candidate.propertyName).sort()).toEqual(
      ["createdAt", "id", "name", "userId"].sort(),
    );
    expect(metadata.uniques.map((unique) => unique.columns.map((candidate) => candidate.propertyName))).toEqual([
      ["userId", "name"],
    ]);
    expect(column("createdAt")?.isCreateDate).toBe(true);
    expect(column("userId")?.type).toBe("integer");
    expect(column("name")?.type).toBe("varchar");
    expect(column("name")?.length).toBe("40");
    expect(column("id")?.isPrimary).toBe(true);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
