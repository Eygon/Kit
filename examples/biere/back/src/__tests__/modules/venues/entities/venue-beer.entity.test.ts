import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { Venue } from "@/modules/venues/entities/venue.entity";

describe("VenueBeer entity", () => {
  it("maps to the venue_beers table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === VenueBeer);

    expect(table?.name).toBe("venue_beers");
  });

  it("maps a generated id, the venue id, the beer id and a creation date", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(VenueBeer)
      .map((column) => [column.propertyName, column.options.type, column.mode]);

    expect(columns).toEqual([
      ["id", Number, "regular"],
      ["venueId", "integer", "regular"],
      ["beerId", "integer", "regular"],
      ["createdAt", undefined, "createDate"],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === VenueBeer)?.propertyName).toBe("id");
  });

  it("allows one link per venue and beer pair", () => {
    const uniques = getMetadataArgsStorage().filterUniques(VenueBeer);

    expect(uniques.map((entry) => entry.columns)).toEqual([["venueId", "beerId"]]);
  });

  it("relates to a venue through the venue id and to its votes", () => {

    const relations = getMetadataArgsStorage().filterRelations(VenueBeer);
    const venue = relations.find((relation) => relation.propertyName === "venue");
    const votes = relations.find((relation) => relation.propertyName === "votes");
    const joinColumn = getMetadataArgsStorage()
      .filterJoinColumns(VenueBeer, "venue")
      .map((entry) => entry.name);

    expect(venue?.relationType).toBe("many-to-one");
    expect((venue?.type as () => unknown)()).toBe(Venue);
    expect(joinColumn).toEqual(["venueId"]);
    expect(votes?.relationType).toBe("one-to-many");
    expect((votes?.type as () => unknown)()).toBe(AvailabilityVote);
    expect(relations.map((relation) => relation.propertyName)).toEqual(["venue", "votes"]);
  });
});
