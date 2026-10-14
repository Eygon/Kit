import { levelRangeDtoToModel } from "@/types/mappers/beer/levelRangeMapper";

describe("levelRangeDtoToModel", () => {
  it("maps min and max of a range", () => {
    expect(levelRangeDtoToModel({ min: 3, max: 4 })).toEqual({ min: 3, max: 4 });
  });

  it("keeps a single-level range as given", () => {
    expect(levelRangeDtoToModel({ min: 1, max: 1 })).toEqual({ min: 1, max: 1 });
  });
});
