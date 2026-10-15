import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";

describe("Beer entity", () => {
  it("maps to the beers table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === Beer);

    expect(table?.name).toBe("beers");
  });

  it("maps every column with its type, length, uniqueness and nullability", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Beer)
      .map((column) => [
        column.propertyName,
        column.options.type,
        column.options.length,
        column.options.unique,
        column.options.nullable,
      ]);

    expect(columns).toEqual([
      ["id", Number, undefined, undefined, undefined],
      ["name", "varchar", 80, undefined, undefined],
      ["breweryId", "integer", undefined, undefined, undefined],
      ["styleId", "integer", undefined, undefined, undefined],
      ["abv", "real", undefined, undefined, undefined],
      ["ibu", "integer", undefined, undefined, true],
      ["ebc", "integer", undefined, undefined, true],
      ["sweetness", "integer", undefined, undefined, true],
      ["acidity", "integer", undefined, undefined, true],
      ["body", "integer", undefined, undefined, true],
      ["description", "varchar", 500, undefined, undefined],
      ["aromas", "simple-array", undefined, undefined, undefined],
      ["formats", "simple-array", undefined, undefined, undefined],
      ["country", "varchar", 2, undefined, undefined],
      ["searchText", "varchar", 141, undefined, undefined],
      ["createdBy", "integer", undefined, undefined, true],
      ["createdAt", "datetime", undefined, undefined, true],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === Beer)?.propertyName).toBe("id");
  });

  it("relates to one brewery and one style through the foreign key columns, neither eager nor lazy", () => {
    const storage = getMetadataArgsStorage();

    const relations = storage.relations
      .filter((relation) => relation.target === Beer)
      .map((relation) => [
        relation.propertyName,
        relation.relationType,
        (relation.type as () => unknown)(),
        relation.options.eager,
        relation.options.lazy,
      ]);
    const joinColumns = storage.joinColumns
      .filter((joinColumn) => joinColumn.target === Beer)
      .map((joinColumn) => [joinColumn.propertyName, joinColumn.name]);

    expect(relations).toEqual([
      ["brewery", "many-to-one", Brewery, undefined, undefined],
      ["style", "many-to-one", BeerStyle, undefined, undefined],
    ]);
    expect(joinColumns).toEqual([
      ["brewery", "breweryId"],
      ["style", "styleId"],
    ]);
  });
});
