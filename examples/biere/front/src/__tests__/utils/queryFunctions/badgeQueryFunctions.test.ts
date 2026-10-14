import type { Mock } from "vitest";
import BadgeService from "@/api/badges/badgeService";
import { fetchBadges } from "@/utils/queryFunctions/badgeQueryFunctions";

vi.mock("@/api/badges/badgeService", () => ({
  default: { getAll: vi.fn() },
}));

describe("fetchBadges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BadgeService.getAll and returns its badges", async () => {
    const badges = [{ id: "firstSip" }];
    (BadgeService.getAll as Mock).mockResolvedValue(badges);

    const result = await fetchBadges();

    expect(BadgeService.getAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(badges);
  });

  it("lets the service rejection through", async () => {
    (BadgeService.getAll as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchBadges()).rejects.toThrow("down");
  });
});
