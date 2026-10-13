import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { Brewery } from "@/modules/beers/entities/brewery.entity";

describe("Brewery entity", () => {
  it("maps to the breweries table", () => {

    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === Brewery);

    expect(table?.name).toBe("breweries");
  });

  it("maps a generated id, a unique name, a two letter country and a city", () => {

    const columns = getMetadataArgsStorage()
      .filterColumns(Brewery)
      .map((column) => [column.propertyName, column.options.type, column.options.length, column.options.unique]);

    expect(columns).toEqual([
      ["id", Number, undefined, undefined],
      ["name", "varchar", 60, true],
      ["country", "varchar", 2, undefined],
      ["city", "varchar", 60, undefined],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === Brewery)?.propertyName).toBe("id");
  });
});
