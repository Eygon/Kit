import { newBeerToDto } from "@/types/mappers/beer/newBeerMapper";

describe("newBeerToDto", () => {
  it("maps every field of the new beer to the create contract and nothing else", () => {

    const newBeerWithExtra = {
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      abv: 6.2,
      description: "Une trappiste.",
      extra: "ignored",
    };
    const dto = newBeerToDto(newBeerWithExtra);

    expect(dto).toEqual({
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      abv: 6.2,
      description: "Une trappiste.",
    });
  });

  it("keeps an empty description and a degree of 0 as they are", () => {

    expect(
      newBeerToDto({ name: "Sans", breweryName: "Brasserie", country: "FR", styleId: 1, abv: 0, description: "" }),
    ).toEqual({ name: "Sans", breweryName: "Brasserie", country: "FR", styleId: 1, abv: 0, description: "" });
  });
});
