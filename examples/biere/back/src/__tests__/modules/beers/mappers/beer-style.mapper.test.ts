import { describe, expect, it } from "vitest";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { toBeerStyleDto, toBeerStyleGroupDtos } from "@/modules/beers/mappers/beer-style.mapper";

const buildStyle = (id: number, name: string, family: BeerFamilyEnum): BeerStyle =>
  Object.assign(new BeerStyle(), {
    id,
    name,
    family,
    description: `Description ${name}`,
    ebcMin: 1,
    ebcMax: 2,
    ibuMin: 3,
    ibuMax: 4,
    abvMin: 5,
    abvMax: 6,
  });

describe("beer style mapper", () => {
  it("maps a style to its DTO with exactly id, name and description", () => {
    expect(toBeerStyleDto(buildStyle(7, "Dubbel trappiste", BeerFamilyEnum.TRAPPIST))).toEqual({
      id: 7,
      name: "Dubbel trappiste",
      description: "Description Dubbel trappiste",
    });
  });

  it("builds one group per family in the enum order, empty families included", () => {
    const groups = toBeerStyleGroupDtos([buildStyle(1, "Stout irlandais", BeerFamilyEnum.STOUT)]);

    expect(groups.map((group) => group.family)).toEqual(Object.values(BeerFamilyEnum));
    expect(groups.find((group) => group.family === BeerFamilyEnum.STOUT)).toEqual({
      family: BeerFamilyEnum.STOUT,
      styles: [{ id: 1, name: "Stout irlandais", description: "Description Stout irlandais" }],
    });
    expect(groups.find((group) => group.family === BeerFamilyEnum.LAGER)).toEqual({
      family: BeerFamilyEnum.LAGER,
      styles: [],
    });
  });

  it("keeps the received order of the styles inside a family", () => {
    const groups = toBeerStyleGroupDtos([
      buildStyle(3, "Zeta", BeerFamilyEnum.IPA),
      buildStyle(1, "Alpha", BeerFamilyEnum.IPA),
      buildStyle(2, "Mid", BeerFamilyEnum.BROWN),
    ]);

    const ipa = groups.find((group) => group.family === BeerFamilyEnum.IPA);
    expect(ipa?.styles.map((style) => style.name)).toEqual(["Zeta", "Alpha"]);
  });
});
