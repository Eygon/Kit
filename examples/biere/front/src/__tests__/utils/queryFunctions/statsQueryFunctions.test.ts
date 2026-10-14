import type { Mock } from "vitest";
import StatsService from "@/api/stats/statsService";
import { fetchStats } from "@/utils/queryFunctions/statsQueryFunctions";

vi.mock("@/api/stats/statsService", () => ({
  default: { get: vi.fn() },
}));

describe("fetchStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to StatsService.get and returns its stats", async () => {
    const stats = { checkinCount: 1 };
    (StatsService.get as Mock).mockResolvedValue(stats);

    const result = await fetchStats();

    expect(StatsService.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(stats);
  });

  it("lets the service rejection through", async () => {
    (StatsService.get as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchStats()).rejects.toThrow("down");
  });
});
