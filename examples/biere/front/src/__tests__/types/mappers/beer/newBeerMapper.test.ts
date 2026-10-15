import { newBeerToDto } from "@/types/mappers/beer/newBeerMapper";
import type { NewBeer } from "@/types/models/beer/newBeer";

const NEW_BEER: NewBeer = {
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  abv: 6.2,
  ibu: 35,
  ebc: 20,
  sweetness: 2,
  acidity: 3,
  body: 4,
  aromas: ["fruity", "hoppy"],
  formats: ["can"],
  description: "Une trappiste.",
};

describe("newBeerToDto", () => {
  it("maps every field of the new beer to the create contract and nothing else", () => {
    const dto = newBeerToDto({ ...NEW_BEER, extra: "ignored" } as NewBeer);

    expect(dto).toEqual({
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      abv: 6.2,
      ibu: 35,
      ebc: 20,
      sweetness: 2,
      acidity: 3,
      body: 4,
      aromas: ["fruity", "hoppy"],
      formats: ["can"],
      description: "Une trappiste.",
    });
  });

  it("keeps an empty description, a degree of 0, the null characteristics and the empty lists as they are", () => {
    expect(
      newBeerToDto({
        name: "Sans",
        breweryName: "Brasserie",
        country: "FR",
        styleId: 1,
        abv: 0,
        ibu: null,
        ebc: null,
        sweetness: null,
        acidity: null,
        body: null,
        aromas: [],
        formats: [],
        description: "",
      }),
    ).toEqual({
      name: "Sans",
      breweryName: "Brasserie",
      country: "FR",
      styleId: 1,
      abv: 0,
      ibu: null,
      ebc: null,
      sweetness: null,
      acidity: null,
      body: null,
      aromas: [],
      formats: [],
      description: "",
    });
  });

  it("keeps an IBU of 0 as 0", () => {
    expect(newBeerToDto({ ...NEW_BEER, ibu: 0 }).ibu).toBe(0);
  });
});
