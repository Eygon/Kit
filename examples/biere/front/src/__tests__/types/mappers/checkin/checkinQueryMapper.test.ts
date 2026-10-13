import { checkinQueryToSearchParams } from "@/types/mappers/checkin/checkinQueryMapper";

describe("checkinQueryToSearchParams", () => {
  it("writes the beer id then the page", () => {
    expect(checkinQueryToSearchParams(7, 2).toString()).toBe("beerId=7&page=2");
  });

  it("omits the beer id when it is null", () => {
    expect(checkinQueryToSearchParams(null, 1).toString()).toBe("page=1");
  });

  it("keeps a beer id of 0 instead of treating it as absent", () => {
    expect(checkinQueryToSearchParams(0, 3).toString()).toBe("beerId=0&page=3");
  });
});
