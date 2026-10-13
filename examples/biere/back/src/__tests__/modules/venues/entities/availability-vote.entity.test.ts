import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, it } from "vitest";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { VoteSenseEnum } from "@/modules/venues/enums/vote-sense.enum";

describe("AvailabilityVote entity", () => {
  it("maps to the availability_votes table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === AvailabilityVote);

    expect(table?.name).toBe("availability_votes");
  });

  it("maps a generated id, the link id, a nullable user id, the sense and the vote date", () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(AvailabilityVote)
      .map((column) => [column.propertyName, column.options.type, column.options.nullable]);

    expect(columns).toEqual([
      ["id", Number, undefined],
      ["venueBeerId", "integer", undefined],
      ["userId", "integer", true],
      ["sense", "simple-enum", undefined],
      ["votedAt", "datetime", undefined],
    ]);
    expect(getMetadataArgsStorage().generations.find((entry) => entry.target === AvailabilityVote)?.propertyName).toBe(
      "id",
    );
  });

  it("stores the sense as the vote sense enum", () => {

    const senseColumn = getMetadataArgsStorage()
      .filterColumns(AvailabilityVote)
      .find((column) => column.propertyName === "sense");

    expect(senseColumn?.options.enum).toBe(VoteSenseEnum);
  });

  it("relates to its link through the link id", () => {

    const relations = getMetadataArgsStorage().filterRelations(AvailabilityVote);
    const joinColumn = getMetadataArgsStorage()
      .filterJoinColumns(AvailabilityVote, "venueBeer")
      .map((entry) => entry.name);

    expect(relations.map((relation) => [relation.propertyName, relation.relationType])).toEqual([
      ["venueBeer", "many-to-one"],
    ]);
    expect((relations[0].type as () => unknown)()).toBe(VenueBeer);
    expect(joinColumn).toEqual(["venueBeerId"]);
  });

  it("indexes the link and the user together", () => {
    const indices = getMetadataArgsStorage().filterIndices(AvailabilityVote);

    expect(indices.map((entry) => entry.columns)).toEqual([["venueBeerId", "userId"]]);
  });
});
