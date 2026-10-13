import { beerDtoToModel } from "@/types/mappers/beer/beerMapper";

const baseDto = {
  id: 7,
  name: "Orval",
  breweryName: "Brasserie d'Orval",
  country: "BE",
  styleId: 12,
  styleName: "Trappiste",
  family: "trappist",
  abv: 6.2,
  aromas: ["fruity", "hoppy", "spicy"],
  formats: ["bottle", "draft"],
  description: "Une trappiste sèche et houblonnée.",
};

const dto = { ...baseDto, drunk: true, checkinCount: 3, inWishlist: true };

describe("beerDtoToModel", () => {
  it("maps every field of a conforming beer", () => {
    expect(beerDtoToModel(dto)).toEqual({
      id: 7,
      name: "Orval",
      breweryName: "Brasserie d'Orval",
      country: "BE",
      styleId: 12,
      styleName: "Trappiste",
      family: "trappist",
      abv: 6.2,
      aromas: ["fruity", "hoppy", "spicy"],
      formats: ["bottle", "draft"],
      description: "Une trappiste sèche et houblonnée.",
      drunk: true,
      checkinCount: 3,
      inWishlist: true,
    });
  });

  it("defaults the tasting state to not drunk, zero check-ins and not wished when the fields are absent", () => {
    const model = beerDtoToModel(baseDto);

    expect(model).toEqual({ ...beerDtoToModel(dto), drunk: false, checkinCount: 0, inWishlist: false });
  });

  it("keeps a partial tasting state and fills only what is missing", () => {
    expect(beerDtoToModel({ ...baseDto, drunk: true, checkinCount: 3 })).toEqual({ ...beerDtoToModel(dto), inWishlist: false });
  });

  it("keeps false and zero as given", () => {
    const model = beerDtoToModel({ ...dto, drunk: false, checkinCount: 0, inWishlist: false });

    expect(model.drunk).toBe(false);
    expect(model.checkinCount).toBe(0);
    expect(model.inWishlist).toBe(false);
  });

  it("drops unknown aromas and formats and keeps the order of the known ones", () => {
    const model = beerDtoToModel({
      ...dto,
      aromas: ["smoky", "bubblegum", "citrus", "", "fruity"],
      formats: ["can", "keg", "bottle"],
    });

    expect(model.aromas).toEqual(["smoky", "citrus", "fruity"]);
    expect(model.formats).toEqual(["can", "bottle"]);
  });

  it("turns an unknown family into null without touching the other fields", () => {
    const model = beerDtoToModel({ ...dto, family: "mead" });

    expect(model).toEqual({ ...beerDtoToModel(dto), family: null });
  });

  it("keeps empty aroma and format lists empty", () => {
    const model = beerDtoToModel({ ...dto, aromas: [], formats: [] });

    expect(model.aromas).toEqual([]);
    expect(model.formats).toEqual([]);
  });
});
