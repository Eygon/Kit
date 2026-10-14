import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { clearCheckinDraft, getCheckinDraft, isBlankCheckinForm, saveCheckinDraft } from "@/components/modules/checkinSheet/utils/checkinDraftStore";

const FILLED: CheckinFormValues = {
  drankAt: "2026-10-10T20:15",
  place: "La Fine Mousse",
  venueId: 5,
  rating: 3.5,
  aromas: [BeerAromaEnum.FRUITY],
  format: "bottle",
  price: 4.5,
  comment: "Top",
  photo: null,
};

const BLANK: CheckinFormValues = {
  drankAt: "2026-10-12T12:00",
  place: "",
  venueId: null,
  rating: 0,
  aromas: [],
  format: "",
  price: Number.NaN,
  comment: "",
  photo: null,
};

describe("checkinDraftStore", () => {
  afterEach(() => {
    [1, 2].forEach((userId) => [7, 8].forEach((beerId) => clearCheckinDraft(userId, beerId)));
    vi.unstubAllGlobals();
  });

  it("has no draft for a user and a beer nothing was saved for", () => {
    expect(getCheckinDraft(1, 7)).toBeNull();
  });

  it("gives back what was saved for that user and that beer", () => {
    saveCheckinDraft(1, 7, FILLED);

    expect(getCheckinDraft(1, 7)).toEqual(FILLED);
  });

  it("keeps a draft per beer", () => {
    saveCheckinDraft(1, 7, FILLED);

    expect(getCheckinDraft(1, 8)).toBeNull();
    expect(getCheckinDraft(1, 17)).toBeNull();
  });

  it("keeps a draft per user", () => {
    saveCheckinDraft(1, 7, FILLED);

    expect(getCheckinDraft(2, 7)).toBeNull();
    expect(getCheckinDraft(11, 7)).toBeNull();
  });

  it("replaces the previous draft of the same user and beer", () => {
    saveCheckinDraft(1, 7, FILLED);

    saveCheckinDraft(1, 7, { ...FILLED, comment: "Changed" });

    expect(getCheckinDraft(1, 7)).toEqual({ ...FILLED, comment: "Changed" });
  });

  it("clears only the draft of that user and that beer", () => {
    saveCheckinDraft(1, 7, FILLED);
    saveCheckinDraft(1, 8, { ...FILLED, comment: "B" });
    saveCheckinDraft(2, 7, { ...FILLED, comment: "U2" });

    clearCheckinDraft(1, 7);

    expect(getCheckinDraft(1, 7)).toBeNull();
    expect(getCheckinDraft(1, 8)).toEqual({ ...FILLED, comment: "B" });
    expect(getCheckinDraft(2, 7)).toEqual({ ...FILLED, comment: "U2" });
  });

  it("clearing a draft that does not exist is harmless", () => {
    expect(() => clearCheckinDraft(2, 8)).not.toThrow();
    expect(getCheckinDraft(2, 8)).toBeNull();
  });

  it("never writes to a persistent storage and never calls the server", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const before = [window.localStorage.length, window.sessionStorage.length];

    saveCheckinDraft(1, 7, FILLED);

    expect([window.localStorage.length, window.sessionStorage.length]).toEqual(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("isBlankCheckinForm", () => {
    it("is true for the empty form, whatever its date", () => {
      expect(isBlankCheckinForm(BLANK)).toBe(true);
      expect(isBlankCheckinForm({ ...BLANK, drankAt: "2026-01-01T00:00" })).toBe(true);
    });

    it.each([
      ["a place", { place: "x" }],
      ["a venue", { venueId: 5 }],
      ["a rating", { rating: 0.5 }],
      ["an aroma", { aromas: [BeerAromaEnum.FRUITY] }],
      ["a format", { format: "can" }],
      ["a price of zero", { price: 0 }],
      ["a comment", { comment: "x" }],
      ["a photo", { photo: new File(["a"], "a.png") }],
    ] as [string, Partial<CheckinFormValues>][])("is false once the form has %s", (_label, patch) => {
      expect(isBlankCheckinForm({ ...BLANK, ...patch })).toBe(false);
    });
  });
});
