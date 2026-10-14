import { describe, expect, it } from "vitest";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { toBreweryDto, toNewBrewery } from "@/modules/beers/mappers/brewery.mapper";

const buildBrewery = (id: number, name: string, country: string, city: string): Brewery =>
  Object.assign(new Brewery(), { id, name, country, city });

describe("brewery mapper", () => {
  it("maps a brewery to its DTO with exactly id, name and country", () => {
    const dto = toBreweryDto(buildBrewery(7, "Brasserie d'Orval", "BE", "Villers-devant-Orval"));

    expect(dto).toEqual({ id: 7, name: "Brasserie d'Orval", country: "BE" });
    expect(Object.keys(dto).sort()).toEqual(["country", "id", "name"]);
  });

  it("does not leak the city", () => {
    expect(toBreweryDto(buildBrewery(1, "Zeta", "FR", "Lille"))).not.toHaveProperty("city");
  });
});

describe("toNewBrewery", () => {
  it("builds the insert row of a brewery created by a proposal, with an empty city", () => {
    expect(toNewBrewery("Brasserie du Mont", "FR")).toStrictEqual({ name: "Brasserie du Mont", country: "FR", city: "" });
  });
});
