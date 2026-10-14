import { countryCountDtoToModel } from "@/types/mappers/stats/countryCountMapper";

describe("countryCountDtoToModel", () => {
  it("copies the country code and the count", () => {
    expect(countryCountDtoToModel({ country: "BE", count: 7 })).toEqual({ country: "BE", count: 7 });
  });
});
