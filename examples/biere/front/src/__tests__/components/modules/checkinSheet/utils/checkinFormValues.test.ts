import {
  checkinToFormValues,
  createEmptyCheckinForm,
  formValuesToCheckinChanges,
  formValuesToNewCheckin,
  isFutureDateTime,
} from "@/components/modules/checkinSheet/utils/checkinFormValues";
import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import type { Checkin } from "@/types/models/checkin/checkin";

const FILLED: CheckinFormValues = {
  drankAt: "2026-10-12T14:30",
  place: "  Chez Paul  ",
  venueId: 5,
  rating: 3.5,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: "bottle",
  price: 4.2,
  comment: "Très bonne",
  photo: null,
};

describe("createEmptyCheckinForm", () => {
  it("dates the form with the local date and time of now, padded, without seconds or zone", () => {
    expect(createEmptyCheckinForm(new Date(2026, 0, 5, 9, 7, 42)).drankAt).toBe("2026-01-05T09:07");
    expect(createEmptyCheckinForm(new Date(2026, 11, 31, 23, 59)).drankAt).toBe("2026-12-31T23:59");
  });

  it("leaves everything else empty", () => {
    expect(createEmptyCheckinForm(new Date(2026, 9, 12, 12, 0))).toEqual({
      drankAt: "2026-10-12T12:00",
      place: "",
      venueId: null,
      rating: 0,
      aromas: [],
      format: "",
      price: Number.NaN,
      comment: "",
      photo: null,
    });
  });
});

describe("formValuesToNewCheckin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the iso date from the local value and trims the place", () => {
    const result = formValuesToNewCheckin(FILLED, 7);

    expect(result.drankAt).toBe(new Date(2026, 9, 12, 14, 30).toISOString());
    expect(result.drankAt).toMatch(/^2026-10-1\dT\d\d:30:00\.000Z$/);
    expect(result.place).toBe("Chez Paul");
  });

  it("reads the typed date and time in the phone time zone and sends the matching UTC instant", () => {
    vi.stubEnv("TZ", "Europe/Paris");

    expect(formValuesToNewCheckin(FILLED, 7).drankAt).toBe("2026-10-12T12:30:00.000Z");
    expect(formValuesToNewCheckin({ ...FILLED, drankAt: "2026-01-12T14:30" }, 7).drankAt).toBe("2026-01-12T13:30:00.000Z");

    vi.stubEnv("TZ", "America/New_York");

    expect(formValuesToNewCheckin(FILLED, 7).drankAt).toBe("2026-10-12T18:30:00.000Z");
  });

  it("carries the beer id, the rating, the aromas, the format, the price and the comment", () => {
    expect(formValuesToNewCheckin(FILLED, 7)).toEqual({
      beerId: 7,
      drankAt: new Date(2026, 9, 12, 14, 30).toISOString(),
      place: "Chez Paul",
      venueId: 5,
      format: "bottle",
      rating: 3.5,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      price: 4.2,
      comment: "Très bonne",
      photo: null,
    });
  });

  it("carries the linked venue id, or null when the place is a free text", () => {
    expect(formValuesToNewCheckin(FILLED, 7).venueId).toBe(5);
    expect(formValuesToNewCheckin({ ...FILLED, venueId: null }, 7).venueId).toBeNull();
  });

  it("carries the chosen photo file", () => {
    const photo = new File([new Uint8Array(4)], "beer.png", { type: "image/png" });

    expect(formValuesToNewCheckin({ ...FILLED, photo }, 7).photo).toBe(photo);
  });

  it("turns the zero rating of « Sans note » into no rating", () => {
    expect(formValuesToNewCheckin({ ...FILLED, rating: 0 }, 7).rating).toBeNull();
    expect(formValuesToNewCheckin({ ...FILLED, rating: 0.5 }, 7).rating).toBe(0.5);
  });

  it("turns an empty price into no price but keeps a free beer at zero", () => {
    expect(formValuesToNewCheckin({ ...FILLED, price: Number.NaN }, 7).price).toBeNull();
    expect(formValuesToNewCheckin({ ...FILLED, price: 0 }, 7).price).toBe(0);
  });
});

describe("isFutureDateTime", () => {
  const now = new Date(2026, 9, 12, 12, 0, 30);

  it("is true for a minute after now", () => {
    expect(isFutureDateTime("2026-10-12T12:01", now)).toBe(true);
    expect(isFutureDateTime("2027-01-01T00:00", now)).toBe(true);
  });

  it("is false for the current minute, the past and an empty value", () => {
    expect(isFutureDateTime("2026-10-12T12:00", now)).toBe(false);
    expect(isFutureDateTime("2026-10-12T11:59", now)).toBe(false);
    expect(isFutureDateTime("2020-01-01T00:00", now)).toBe(false);
    expect(isFutureDateTime("", now)).toBe(false);
  });
});

const CHECKIN: Checkin = {
  id: 11,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:30:00.000Z",
  place: "La Fine Mousse",
  rating: 3,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  format: BeerFormatEnum.BOTTLE,
  price: 4.5,
  comment: "Top",
  photoId: "6f1c0a52-8d3e-4c7b-9a1f-2b5e7d9c0a11",
  venueId: 5,
};

describe("checkinToFormValues", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fills every field from the checkin and leaves the photo empty", () => {
    vi.stubEnv("TZ", "Europe/Paris");

    expect(checkinToFormValues(CHECKIN)).toEqual({
      drankAt: "2026-10-12T14:30",
      place: "La Fine Mousse",
      venueId: 5,
      rating: 3,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
      format: "bottle",
      price: 4.5,
      comment: "Top",
      photo: null,
    });
  });

  it("turns the instant into the local date and time of the phone, padded, in two zones", () => {
    const instant = { ...CHECKIN, drankAt: "2026-01-05T22:07:42.000Z" };

    vi.stubEnv("TZ", "Asia/Tokyo");
    expect(checkinToFormValues(instant).drankAt).toBe("2026-01-06T07:07");

    vi.stubEnv("TZ", "America/New_York");
    expect(checkinToFormValues(instant).drankAt).toBe("2026-01-05T17:07");
  });

  it("turns the empty values into the form conventions: no rating 0, no price NaN, no format empty", () => {
    const values = checkinToFormValues({ ...CHECKIN, rating: null, price: null, format: null, venueId: null, aromas: [] });

    expect(values.rating).toBe(0);
    expect(Number.isNaN(values.price)).toBe(true);
    expect(values.format).toBe("");
    expect(values.venueId).toBeNull();
    expect(values.aromas).toEqual([]);
    expect(values.photo).toBeNull();
  });

  it("keeps a free beer at price zero", () => {
    expect(checkinToFormValues({ ...CHECKIN, price: 0 }).price).toBe(0);
  });
});

describe("formValuesToCheckinChanges", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const initial = (): CheckinFormValues => checkinToFormValues(CHECKIN);

  it("is empty when nothing changed", () => {
    vi.stubEnv("TZ", "Europe/Paris");

    expect(formValuesToCheckinChanges(initial(), initial())).toEqual({});
  });

  it("is empty when nothing changed and the checkin has no rating, price or format", () => {
    const bare = checkinToFormValues({ ...CHECKIN, rating: null, price: null, format: null, venueId: null, aromas: [] });

    expect(formValuesToCheckinChanges(bare, bare)).toEqual({});
  });

  it("sends only the rating when only the rating changed", () => {
    expect(formValuesToCheckinChanges({ ...initial(), rating: 4 }, initial())).toEqual({ rating: 4 });
  });

  it("sends the date as the matching UTC instant, read in the phone time zone", () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    const start = initial();

    expect(formValuesToCheckinChanges({ ...start, drankAt: "2026-10-12T14:30" }, start)).toEqual({
      drankAt: "2026-10-12T05:30:00.000Z",
    });

    vi.stubEnv("TZ", "America/New_York");

    expect(formValuesToCheckinChanges({ ...start, drankAt: "2026-10-12T14:30" }, start)).toEqual({
      drankAt: "2026-10-12T18:30:00.000Z",
    });
  });

  it("sends the trimmed place together with its venue when the place text changed", () => {
    expect(formValuesToCheckinChanges({ ...initial(), place: "  Chez Paul  ", venueId: null }, initial())).toEqual({
      place: "Chez Paul",
      venueId: null,
    });
  });

  it("sends the place and the venue together when only the venue changed", () => {
    expect(formValuesToCheckinChanges({ ...initial(), venueId: 9 }, initial())).toEqual({
      place: "La Fine Mousse",
      venueId: 9,
    });
  });

  it("sends nothing for a place that only gained spaces around the same text", () => {
    expect(formValuesToCheckinChanges({ ...initial(), place: "  La Fine Mousse " }, initial())).toEqual({});
  });

  it("turns a rating back to zero into a null rating", () => {
    expect(formValuesToCheckinChanges({ ...initial(), rating: 0 }, initial())).toEqual({ rating: null });
  });

  it("turns an erased price into a null price but keeps a price set to zero", () => {
    expect(formValuesToCheckinChanges({ ...initial(), price: Number.NaN }, initial())).toEqual({ price: null });
    expect(formValuesToCheckinChanges({ ...initial(), price: 0 }, initial())).toEqual({ price: 0 });
  });

  it("sends a price set where there was none", () => {
    const bare = checkinToFormValues({ ...CHECKIN, price: null });

    expect(formValuesToCheckinChanges({ ...bare, price: 3 }, bare)).toEqual({ price: 3 });
  });

  it("sends the aromas when the list changed, empty when all were removed, and nothing when only the order differs", () => {
    expect(formValuesToCheckinChanges({ ...initial(), aromas: [BeerAromaEnum.FLORAL] }, initial())).toEqual({
      aromas: [BeerAromaEnum.FLORAL],
    });
    expect(formValuesToCheckinChanges({ ...initial(), aromas: [] }, initial())).toEqual({ aromas: [] });
    expect(
      formValuesToCheckinChanges({ ...initial(), aromas: [BeerAromaEnum.HOPPY, BeerAromaEnum.FRUITY] }, initial()),
    ).toEqual({});
  });

  it("sends the format and the comment when they changed, and an emptied comment as an empty string", () => {
    expect(formValuesToCheckinChanges({ ...initial(), format: "draft", comment: "Bof" }, initial())).toEqual({
      format: "draft",
      comment: "Bof",
    });
    expect(formValuesToCheckinChanges({ ...initial(), comment: "" }, initial())).toEqual({ comment: "" });
  });

  it("sends every changed field together and never the photo", () => {
    const photo = new File([new Uint8Array(4)], "beer.png", { type: "image/png" });
    vi.stubEnv("TZ", "Europe/Paris");

    expect(
      formValuesToCheckinChanges(
        {
          drankAt: "2026-10-12T10:00",
          place: "Ailleurs",
          venueId: null,
          rating: 5,
          aromas: [],
          format: "can",
          price: 2,
          comment: "Mieux",
          photo,
        },
        initial(),
      ),
    ).toEqual({
      drankAt: "2026-10-12T08:00:00.000Z",
      place: "Ailleurs",
      venueId: null,
      rating: 5,
      aromas: [],
      format: "can",
      price: 2,
      comment: "Mieux",
    });
  });
});
