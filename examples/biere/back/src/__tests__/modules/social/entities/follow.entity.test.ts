import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { Follow } from "@/modules/social/entities/follow.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

describe("Follow entity", () => {
  it("maps the follows table with a unique follower and followed pair and an index on the followed", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Follow])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(Follow);

    expect(metadata.tableName).toBe("follows");
    expect(metadata.columns.map((column) => column.propertyName).sort()).toEqual(
      ["createdAt", "followedId", "followerId", "id"].sort(),
    );
    expect(metadata.uniques.map((unique) => unique.columns.map((column) => column.propertyName))).toEqual([
      ["followerId", "followedId"],
    ]);
    expect(metadata.indices.map((index) => index.columns.map((column) => column.propertyName))).toEqual([
      ["followedId"],
    ]);
    expect(metadata.columns.find((column) => column.propertyName === "createdAt")?.isCreateDate).toBe(true);
    expect(metadata.columns.find((column) => column.propertyName === "followerId")?.type).toBe("integer");
    expect(metadata.columns.find((column) => column.propertyName === "followedId")?.type).toBe("integer");
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
