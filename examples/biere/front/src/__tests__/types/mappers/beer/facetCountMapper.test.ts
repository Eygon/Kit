import { facetCountDtosToModel } from "@/types/mappers/beer/facetCountMapper";

const isEvenLabel = (value: unknown): value is "even" | "peer" => value === "even" || value === "peer";
const anyString = (value: unknown): value is string => typeof value === "string";

describe("facetCountDtosToModel", () => {
  it("keeps the values the guard accepts, with their count and in order", () => {
    expect(
      facetCountDtosToModel(
        [
          { value: "peer", count: 3 },
          { value: "even", count: 8 },
        ],
        isEvenLabel,
      ),
    ).toEqual([
      { value: "peer", count: 3 },
      { value: "even", count: 8 },
    ]);
  });

  it("drops the values the guard rejects", () => {
    expect(
      facetCountDtosToModel(
        [
          { value: "even", count: 1 },
          { value: "unknown", count: 7 },
          { value: "peer", count: 2 },
        ],
        isEvenLabel,
      ),
    ).toEqual([
      { value: "even", count: 1 },
      { value: "peer", count: 2 },
    ]);
  });

  it("keeps a zero count", () => {
    expect(facetCountDtosToModel([{ value: "BE", count: 0 }], anyString)).toEqual([{ value: "BE", count: 0 }]);
  });

  it("returns an empty list for an empty input", () => {
    expect(facetCountDtosToModel([], anyString)).toEqual([]);
  });
});
