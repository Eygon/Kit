import { checkinDtoToModel } from "@/types/mappers/checkin/checkinMapper";

const dto = {
  id: 11,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  rating: 4.5,
  aromas: ["fruity", "hoppy"],
  format: "can",
  price: 3.5,
  comment: "Top",
  photoId: "6f1c0a52-8d3e-4c7b-9a1f-2b5e7d9c0a11",
  venueId: 42,
};

describe("checkinDtoToModel", () => {
  it("copies every contract field of a complete checkin", () => {
    expect(checkinDtoToModel(dto)).toEqual(dto);
  });

  it("keeps null rating, price and photo id as null", () => {
    const model = checkinDtoToModel({ ...dto, rating: null, price: null, photoId: null });

    expect(model.rating).toBeNull();
    expect(model.price).toBeNull();
    expect(model.photoId).toBeNull();
  });

  it("keeps a zero rating and a zero price instead of turning them into null", () => {
    const model = checkinDtoToModel({ ...dto, rating: 0, price: 0 });

    expect(model.rating).toBe(0);
    expect(model.price).toBe(0);
  });

  it("maps an unknown format to null", () => {
    expect(checkinDtoToModel({ ...dto, format: "keg" }).format).toBeNull();
  });

  it("drops unknown aromas and keeps the known ones in order", () => {
    expect(checkinDtoToModel({ ...dto, aromas: ["weird", "malty", "fruity"] }).aromas).toEqual(["malty", "fruity"]);
  });

  it("keeps the linked venue id", () => {
    expect(checkinDtoToModel({ ...dto, venueId: 42 }).venueId).toBe(42);
  });

  it("keeps a free place as a null venue id", () => {
    expect(checkinDtoToModel({ ...dto, venueId: null }).venueId).toBeNull();
  });

  it("turns an absent venue id into null", () => {
    const withoutVenue: Partial<typeof dto> = { ...dto };
    delete withoutVenue.venueId;

    expect(checkinDtoToModel(withoutVenue as unknown as typeof dto).venueId).toBeNull();
  });
});
