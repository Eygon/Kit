import { monthlyCountDtoToModel } from "@/types/mappers/stats/monthlyCountMapper";

describe("monthlyCountDtoToModel", () => {
  it("copies the month and the count, including a zero month", () => {
    expect(monthlyCountDtoToModel({ month: "2026-10", count: 0 })).toEqual({ month: "2026-10", count: 0 });
    expect(monthlyCountDtoToModel({ month: "2026-09", count: 12 })).toEqual({ month: "2026-09", count: 12 });
  });
});
