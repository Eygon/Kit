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
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: null,
      averageRating: null,
      reviewCount: 0,
      ratingDistribution: [],
      source: "official",
      createdByName: null,
      ibu: null,
      ebc: null,
      sweetness: null,
      acidity: null,
      body: null,
      createdBy: null,
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

  it("defaults the three level fields to null when the dto omits them", () => {
    const model = beerDtoToModel(dto);

    expect(model.bitternessLevel).toBeNull();
    expect(model.colorLevel).toBeNull();
    expect(model.styleColorRange).toBeNull();
  });

  it("maps the levels and the style colour range of a beer", () => {
    const model = beerDtoToModel({ ...dto, bitternessLevel: 4, colorLevel: 3, styleColorRange: { min: 3, max: 4 } });

    expect(model).toEqual({
      ...beerDtoToModel(dto),
      bitternessLevel: 4,
      colorLevel: 3,
      styleColorRange: { min: 3, max: 4 },
    });
  });

  it("keeps explicit nulls from the api as null", () => {
    const model = beerDtoToModel({ ...dto, bitternessLevel: null, colorLevel: null, styleColorRange: null });

    expect(model.bitternessLevel).toBeNull();
    expect(model.colorLevel).toBeNull();
    expect(model.styleColorRange).toBeNull();
  });

  it("keeps the lowest level 1 and a range of one level", () => {
    const model = beerDtoToModel({ ...dto, bitternessLevel: 1, colorLevel: 1, styleColorRange: { min: 1, max: 1 } });

    expect(model.bitternessLevel).toBe(1);
    expect(model.colorLevel).toBe(1);
    expect(model.styleColorRange).toEqual({ min: 1, max: 1 });
  });

  it("defaults the rating to null and the review count to 0 when the dto omits them", () => {
    const model = beerDtoToModel(dto);

    expect(model.averageRating).toBeNull();
    expect(model.reviewCount).toBe(0);
  });

  it("maps the average rating and the review count of a beer", () => {
    const model = beerDtoToModel({ ...dto, averageRating: 4.2, reviewCount: 18 });

    expect(model).toEqual({ ...beerDtoToModel(dto), averageRating: 4.2, reviewCount: 18 });
  });

  it("keeps an explicit null average from the api as null", () => {
    const model = beerDtoToModel({ ...dto, averageRating: null, reviewCount: 0 });

    expect(model.averageRating).toBeNull();
    expect(model.reviewCount).toBe(0);
  });

  it("defaults the distribution to an empty list when the dto omits it", () => {
    expect(beerDtoToModel(dto).ratingDistribution).toEqual([]);
  });

  it("maps the rating distribution of a beer detail", () => {
    const ratingDistribution = [
      { stars: 1, count: 1 },
      { stars: 2, count: 0 },
      { stars: 3, count: 2 },
      { stars: 4, count: 7 },
      { stars: 5, count: 2 },
    ];

    expect(beerDtoToModel({ ...dto, ratingDistribution })).toEqual({ ...beerDtoToModel(dto), ratingDistribution });
  });

  it("maps a response without criteria and carries no criteria on the model", () => {
    const model = beerDtoToModel(dto);

    expect(model).not.toHaveProperty("criteria");
  });

  it("ignores the criteria a legacy response still sends", () => {
    const legacyDto = { ...dto, criteria: [{ criterion: "sweetness", average: 2.7, count: 3 }] } as unknown as typeof dto;
    const model = beerDtoToModel(legacyDto);

    expect(model).not.toHaveProperty("criteria");
    expect(model).toEqual(beerDtoToModel(dto));
  });

  it("keeps an empty distribution list empty", () => {
    expect(beerDtoToModel({ ...dto, ratingDistribution: [] }).ratingDistribution).toEqual([]);
  });

  it("maps a community beer with its source and the name of its author", () => {
    const model = beerDtoToModel({ ...dto, source: "community", createdByName: "Alice" });

    expect(model.source).toBe("community");
    expect(model.createdByName).toBe("Alice");
    expect(model).toEqual({ ...beerDtoToModel(dto), source: "community", createdByName: "Alice" });
  });

  it("keeps a null author name for a community beer whose author is unknown", () => {
    expect(beerDtoToModel({ ...dto, source: "community", createdByName: null })).toEqual({
      ...beerDtoToModel(dto),
      source: "community",
      createdByName: null,
    });
  });

  it("defaults to an official beer without author when source and author name are absent", () => {
    const model = beerDtoToModel(baseDto);

    expect(model.source).toBe("official");
    expect(model.createdByName).toBeNull();
  });

  it("falls back to official for an unknown source and keeps the author name as given", () => {
    const model = beerDtoToModel({ ...dto, source: "partner", createdByName: "Alice" });

    expect(model.source).toBe("official");
    expect(model.createdByName).toBe("Alice");
  });

  it("keeps the technical fields and the author id as given", () => {
    const model = beerDtoToModel({ ...dto, ibu: 35, ebc: 20, sweetness: 3, acidity: 1, body: 5, createdBy: 2 });

    expect(model).toEqual({ ...beerDtoToModel(dto), ibu: 35, ebc: 20, sweetness: 3, acidity: 1, body: 5, createdBy: 2 });
  });

  it("defaults every technical field and the author id to null when absent or null", () => {
    const expected = { ibu: null, ebc: null, sweetness: null, acidity: null, body: null, createdBy: null };

    expect(beerDtoToModel(baseDto)).toMatchObject(expected);
    expect(beerDtoToModel({ ...dto, ibu: null, ebc: null, sweetness: null, acidity: null, body: null, createdBy: null })).toMatchObject(expected);
  });

  it("keeps a zero technical value instead of defaulting it", () => {
    expect(beerDtoToModel({ ...dto, ibu: 0, acidity: 0 })).toMatchObject({ ibu: 0, acidity: 0 });
  });
});
