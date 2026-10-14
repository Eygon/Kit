import { ratingBucketDtoToModel } from "@/types/mappers/beer/ratingBucketMapper";

describe("ratingBucketDtoToModel", () => {
  it("maps the stars and the count of a bucket", () => {
    expect(ratingBucketDtoToModel({ stars: 4, count: 7 })).toEqual({ stars: 4, count: 7 });
  });

  it("keeps a zero count and the lowest star as given", () => {
    expect(ratingBucketDtoToModel({ stars: 1, count: 0 })).toEqual({ stars: 1, count: 0 });
  });
});
