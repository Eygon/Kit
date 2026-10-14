import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { CollectionItem } from "@/modules/collections/entities/collection-item.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("CollectionItem entity", () => {
  it("maps the collection_items table with a unique collection and beer pair and an addition date", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([CollectionItem])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(CollectionItem);
    const column = (name: string) => metadata.columns.find((candidate) => candidate.propertyName === name);

    expect(metadata.tableName).toBe("collection_items");
    expect(metadata.columns.map((candidate) => candidate.propertyName).sort()).toEqual(
      ["addedAt", "beerId", "collectionId", "id"].sort(),
    );
    expect(metadata.uniques.map((unique) => unique.columns.map((candidate) => candidate.propertyName))).toEqual([
      ["collectionId", "beerId"],
    ]);
    expect(column("addedAt")?.isCreateDate).toBe(true);
    expect(column("collectionId")?.type).toBe("integer");
    expect(column("beerId")?.type).toBe("integer");
    expect(column("id")?.isPrimary).toBe(true);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
