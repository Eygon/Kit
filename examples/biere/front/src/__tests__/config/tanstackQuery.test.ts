import { queryTimes } from "@/config/tanstackQuery";

describe("queryTimes", () => {
  it("defines the four cache categories", () => {
    expect(queryTimes).toEqual({
      default: { staleTime: 0, gcTime: 300_000 },
      short: { staleTime: 30_000, gcTime: 300_000 },
      long: { staleTime: 900_000, gcTime: 3_600_000 },
      infinite: { staleTime: Infinity, gcTime: Infinity },
    });
  });
});
