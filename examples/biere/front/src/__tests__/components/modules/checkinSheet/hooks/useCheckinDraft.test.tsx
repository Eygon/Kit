import type { CheckinFormValues } from "@/components/modules/checkinSheet/types/checkinFormValues";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { renderHook } from "@testing-library/react";
import { useCheckinDraft } from "@/components/modules/checkinSheet/hooks/useCheckinDraft";
import { clearCheckinDraft } from "@/components/modules/checkinSheet/utils/checkinDraftStore";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

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

const setUser = (id: number) => window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, String(id));

describe("useCheckinDraft", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    [1, 2].forEach((userId) => [7, 8].forEach((beerId) => clearCheckinDraft(userId, beerId)));
    window.localStorage.clear();
  });

  it("has no draft at first", () => {
    const { result } = renderHook(() => useCheckinDraft(7));

    expect(result.current.draft).toBeNull();
  });

  it("gives back a saved draft on the next render", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));

    result.current.saveDraft(FILLED);
    rerender();

    expect(result.current.draft).toEqual(FILLED);
  });

  it("finds the draft again in a new mount", () => {
    renderHook(() => useCheckinDraft(7)).result.current.saveDraft(FILLED);

    const { result } = renderHook(() => useCheckinDraft(7));

    expect(result.current.draft).toEqual(FILLED);
  });

  it("does not keep a draft equal to the empty form, and drops the one it had", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));
    result.current.saveDraft(FILLED);

    result.current.saveDraft(BLANK);
    rerender();

    expect(result.current.draft).toBeNull();
  });

  it("does not keep a draft that differs from the empty form by its date only", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));

    result.current.saveDraft({ ...BLANK, drankAt: "2026-09-01T08:00" });
    rerender();

    expect(result.current.draft).toBeNull();
  });

  it("keeps a draft that differs from the empty form by one field", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));

    result.current.saveDraft({ ...BLANK, comment: "x" });
    rerender();

    expect(result.current.draft).toEqual({ ...BLANK, comment: "x" });
  });

  it("clears the draft", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));
    result.current.saveDraft(FILLED);

    result.current.clearDraft();
    rerender();

    expect(result.current.draft).toBeNull();
  });

  it("keeps a draft per beer", () => {
    renderHook(() => useCheckinDraft(7)).result.current.saveDraft(FILLED);

    const other = renderHook(() => useCheckinDraft(8));

    expect(other.result.current.draft).toBeNull();
  });

  it("keeps a draft per demo user", () => {
    setUser(1);
    renderHook(() => useCheckinDraft(7)).result.current.saveDraft(FILLED);

    setUser(2);
    const second = renderHook(() => useCheckinDraft(7));

    expect(second.result.current.draft).toBeNull();
    setUser(1);
    expect(renderHook(() => useCheckinDraft(7)).result.current.draft).toEqual(FILLED);
  });

  it("returns stable save and clear functions between renders", () => {
    const { result, rerender } = renderHook(() => useCheckinDraft(7));
    const { saveDraft, clearDraft } = result.current;

    rerender();

    expect(result.current.saveDraft).toBe(saveDraft);
    expect(result.current.clearDraft).toBe(clearDraft);
  });
});
