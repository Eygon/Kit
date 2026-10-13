import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";

describe("BeerStyle entity", () => {
  it("maps to the beer_styles table", () => {

    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === BeerStyle);

    expect(table?.name).toBe("beer_styles");
  });

  it("maps a generated id and the style columns with their bounds", () => {

    const columns = getMetadataArgsStorage()
      .filterColumns(BeerStyle)
      .map((column) => [column.propertyName, column.options.type, column.options.length, column.options.unique]);

    expect(columns).toEqual([
      ["id", Number, undefined, undefined],
      ["name", "varchar", 60, true],
      ["family", "simple-enum", undefined, undefined],
      ["description", "varchar", 200, undefined],
      ["ebcMin", "integer", undefined, undefined],
      ["ebcMax", "integer", undefined, undefined],
      ["ibuMin", "integer", undefined, undefined],
      ["ibuMax", "integer", undefined, undefined],
      ["abvMin", "real", undefined, undefined],
      ["abvMax", "real", undefined, undefined],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === BeerStyle)?.propertyName).toBe("id");
  });

  it("stores the family as the beer family enum", () => {

    const family = getMetadataArgsStorage()
      .filterColumns(BeerStyle)
      .find((column) => column.propertyName === "family");

    expect(family?.options.enum).toBe(BeerFamilyEnum);
  });
});
