import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";


describe("WishlistItem entity", () => {
  it("maps the wishlist_items table with a unique user and beer pair", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([WishlistItem])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(WishlistItem);

    expect(metadata.tableName).toBe("wishlist_items");
    expect(metadata.columns.map((column) => column.propertyName).sort()).toEqual(
      ["addedAt", "beerId", "id", "userId"].sort(),
    );
    expect(metadata.uniques.map((unique) => unique.columns.map((column) => column.propertyName))).toEqual([
      ["userId", "beerId"],
    ]);
    expect(metadata.columns.find((column) => column.propertyName === "addedAt")?.isCreateDate).toBe(true);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
