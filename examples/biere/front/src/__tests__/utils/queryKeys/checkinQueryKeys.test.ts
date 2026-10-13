import { checkinKeys } from "@/utils/queryKeys/checkinQueryKeys";

describe("checkinKeys", () => {
  it("roots every checkin key under all", () => {
    expect(checkinKeys.all()).toEqual(["checkins"]);
    expect(checkinKeys.list(7).slice(0, 1)).toEqual(checkinKeys.all());
  });

  it("gives each beer its own stable list key", () => {
    expect(checkinKeys.list(7)).toEqual(["checkins", "list", 7]);
    expect(checkinKeys.list(7)).toEqual(checkinKeys.list(7));
    expect(checkinKeys.list(7)).not.toEqual(checkinKeys.list(8));
  });

  it("gives the unrestricted list a null beer key distinct from any beer", () => {
    expect(checkinKeys.list(null)).toEqual(["checkins", "list", null]);
    expect(checkinKeys.list(null)).not.toEqual(checkinKeys.list(0));
  });
});
