import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { inMemoryDatabase } from "@/__tests__/support/test-database";


describe("Checkin entity", () => {
  it("maps the checkins table with its columns, its index and no relation", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Checkin])],
    }).compile();
    const metadata = moduleRef.get(DataSource).getMetadata(Checkin);

    expect(metadata.tableName).toBe("checkins");
    expect(metadata.columns.map((column) => column.propertyName).sort()).toEqual(
      [
        "aromas",
        "beerId",
        "comment",
        "createdAt",
        "drankAt",
        "format",
        "id",
        "photoId",
        "place",
        "price",
        "rating",
        "userId",
        "venueId",
      ].sort(),
    );
    const byName = (name: string) => metadata.columns.find((column) => column.propertyName === name);
    expect(byName("photoId")?.isNullable).toBe(true);
    expect(byName("photoId")?.length).toBe("36");
    expect(byName("venueId")?.isNullable).toBe(true);
    expect(byName("venueId")?.type).toBe("integer");
    expect(byName("rating")?.isNullable).toBe(true);
    expect(byName("price")?.isNullable).toBe(true);
    expect(byName("place")?.isNullable).toBe(false);
    expect(byName("place")?.length).toBe("80");
    expect(byName("comment")?.length).toBe("500");
    expect(byName("aromas")?.type).toBe("simple-array");
    expect(byName("format")?.type).toBe("simple-enum");
    expect(byName("format")?.enum).toEqual(Object.values(BeerFormatEnum));
    expect(metadata.indices.map((index) => index.columns.map((column) => column.propertyName))).toEqual([
      ["userId", "beerId"],
    ]);
    expect(metadata.relations).toEqual([]);

    await moduleRef.close();
  });
});
