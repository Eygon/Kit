import {
  createEmptyCheckinForm,
  formValuesToNewCheckin,
  isFutureDateTime,
} from "@/pages/beerDetail/utils/checkinFormValues";
import type { CheckinFormValues } from "@/pages/beerDetail/types/checkinFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";

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
