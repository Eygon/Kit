import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VenueTypeEnum } from "@/modules/venues/enums/venue-type.enum";

describe("Venue entity", () => {
  it("maps to the venues table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === Venue);

    expect(table?.name).toBe("venues");
  });

  it("maps a generated id, a unique name, the type, the place and the unique name key", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Venue)
      .map((column) => [
        column.propertyName,
        column.options.type,
        column.options.length,
        column.options.unique,
        column.options.nullable,
      ]);

    expect(columns).toEqual([
      ["id", Number, undefined, undefined, undefined],
      ["name", "varchar", 80, true, undefined],
      ["type", "simple-enum", undefined, undefined, undefined],
      ["city", "varchar", 60, undefined, true],
      ["address", "varchar", 160, undefined, undefined],
      ["latitude", "real", undefined, undefined, undefined],
      ["longitude", "real", undefined, undefined, undefined],
      ["description", "varchar", 300, undefined, true],
      ["nameKey", "varchar", 80, true, undefined],
      ["searchName", "varchar", 80, undefined, undefined],
      ["searchCity", "varchar", 60, undefined, undefined],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === Venue)?.propertyName).toBe("id");
  });

  it("defaults both search keys to an empty string", () => {
    const defaults = getMetadataArgsStorage()
      .filterColumns(Venue)
      .filter((column) => column.propertyName === "searchName" || column.propertyName === "searchCity")
      .map((column) => [column.propertyName, column.options.default]);

    expect(defaults).toEqual([
      ["searchName", ""],
      ["searchCity", ""],
    ]);
  });

  it("stores the type as the venue type enum", () => {
    const typeColumn = getMetadataArgsStorage()
      .filterColumns(Venue)
      .find((column) => column.propertyName === "type");

    expect(typeColumn?.options.enum).toBe(VenueTypeEnum);
  });
});
