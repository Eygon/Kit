import { criterionAverageDtoToModel } from "@/types/mappers/beer/criterionAverageMapper";

describe("criterionAverageDtoToModel", () => {
  it("maps a visible criterion average", () => {
    expect(criterionAverageDtoToModel({ criterion: "sweetness", average: 2.7, count: 3 })).toEqual({
      criterion: "sweetness",
      average: 2.7,
      count: 3,
    });
  });

  it("keeps a hidden average as null with its count", () => {
    expect(criterionAverageDtoToModel({ criterion: "acidity", average: null, count: 1 })).toEqual({
      criterion: "acidity",
      average: null,
      count: 1,
    });
  });

  it("keeps a zero count as given", () => {
    expect(criterionAverageDtoToModel({ criterion: "body", average: null, count: 0 })).toEqual({
      criterion: "body",
      average: null,
      count: 0,
    });
  });

  it("returns null for an unknown criterion", () => {
    expect(criterionAverageDtoToModel({ criterion: "bitterness", average: 3, count: 5 })).toBeNull();
    expect(criterionAverageDtoToModel({ criterion: "", average: 3, count: 5 })).toBeNull();
  });
});
